import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/dashboard/route";
import { createMockDb } from "../helpers/db";
import { memberSession, noTeamSession } from "../helpers/auth";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: vi.fn() }));

import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

describe("GET /api/dashboard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("401: 비로그인 접근 거부", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("403: 팀 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(noTeamSession);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("200: DB 없는 경우 빈 대시보드 fallback", async () => {
    // getDashboardData는 db null일 때 의도적으로 빈 데이터를 반환 (데모/SSR fallback)
    vi.mocked(auth).mockResolvedValue(memberSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.upcomingMatch).toBeNull();
    expect(json.activeVotes).toEqual([]);
    expect(json.totalMatches).toBe(0);
  });

  it("200: 경기 없는 경우 — 빈 대시보드 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    // New API order:
    // 1. matches.update (auto-complete)
    // 2. matches(upcoming), matches(recent), matches(activeVotes) — Promise.all
    // 3. match_attendance(user vote) + match_mvp_votes(user mvp) — tasks
    // 4. matches(completed) — teamRecord
    const db = createMockDb(
      ["matches", null],   // auto-complete update (returns null for no matches)
      ["matches", null],   // upcoming match → null
      ["matches", null],   // recent match → null
      ["matches", []],     // active votes → []
      // No upcoming → skip vote queries
      // No recent → skip goal/mvp queries
      ["match_attendance", null], // user attendance → null
      ["match_mvp_votes", null],  // user mvp → null
      ["matches", []],     // completed matches for teamRecord
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.upcomingMatch).toBeNull();
    expect(json.recentResult).toBeNull();
    expect(json.activeVotes).toEqual([]);
    expect(json.tasks).toEqual([]);
    expect(json.teamRecord).toBeDefined();
  });

  it("200: 다가오는 경기 있을 때 투표 현황 포함", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);

    const upcomingMatch = {
      id: "m-upcoming",
      match_date: "2099-12-31",
      match_time: "09:00",
      opponent_name: "상대팀",
      status: "SCHEDULED",
      location: "운동장",
      vote_deadline: new Date(Date.now() + 86400000).toISOString(),
    };

    const db = createMockDb(
      ["matches", null],           // auto-complete
      ["matches", upcomingMatch],  // upcoming match
      ["matches", null],           // recent match → null
      ["matches", []],             // active votes
      ["match_attendance", [{ vote: "ATTEND", user_id: "other", member_id: null }]], // vote list
      ["team_members", { id: "mem-1" }], // myMember (maybeSingle)
      ["match_guests", []],        // guests
      ["team_members", [{ id: "mem-other", user_id: "other" }]], // active member roster (정규화용)
      ["match_attendance", null],  // user vote check (tasks)
      ["match_mvp_votes", null],   // user mvp check (tasks)
      ["matches", []],             // completed matches
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.upcomingMatch).not.toBeNull();
    expect(json.upcomingMatch.id).toBe("m-upcoming");
    expect(json.upcomingMatch.voteCounts).toBeDefined();
    expect(json.upcomingMatch.voteCounts.attend).toBe(1);
    expect(json.upcomingMatch.myMemberId).toBe("mem-1");
    expect(json.tasks).toContain("다음 경기 참석 투표 완료하기");
  });

  it("200: 최근 경기 결과 스코어 및 MVP 포함", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);

    const recentMatch = {
      id: "m-recent",
      match_date: "2024-01-01",
      opponent_name: "상대팀",
      status: "COMPLETED",
    };

    const goals = [
      { scorer_id: "u1", is_own_goal: false },
      { scorer_id: "u2", is_own_goal: false },
      { scorer_id: "OPPONENT", is_own_goal: false },
    ];

    const mvpVotes = [
      { candidate_id: "u1", users: { name: "김선수" } },
      { candidate_id: "u1", users: { name: "김선수" } },
    ];

    const db = createMockDb(
      ["matches", null],             // auto-complete
      ["matches", null],             // upcoming → null
      ["matches", recentMatch],      // recent match
      ["matches", []],               // active votes
      // No upcoming → skip vote queries
      ["match_goals", goals],        // goals for recent
      ["match_mvp_votes", mvpVotes], // mvp votes for recent
      ["match_attendance", null],    // user vote (tasks)
      ["match_mvp_votes", { id: "v1" }], // user mvp voted
      ["matches", [recentMatch]],    // completed matches for teamRecord
      ["match_goals", goals],        // goals for teamRecord
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.recentResult).not.toBeNull();
    expect(json.recentResult.score).toBe("2 : 1");
    expect(json.recentResult.mvp).toBe("김선수");
    expect(json.recentResult.opponent).toBe("상대팀");
    expect(json.teamRecord).toBeDefined();
  });

  it("200: 활성 투표 목록 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);

    const voteDeadline = new Date(Date.now() + 86400000).toISOString();
    const activeVoteMatch = {
      id: "m-vote",
      match_date: "2099-12-31",
      vote_deadline: voteDeadline,
      opponent_name: "투표상대",
    };

    const db = createMockDb(
      ["matches", null],               // auto-complete
      ["matches", null],               // upcoming → null
      ["matches", null],               // recent → null
      ["matches", [activeVoteMatch]],  // active votes
      ["match_attendance", null],      // user vote (tasks)
      ["match_mvp_votes", null],       // user mvp (tasks)
      ["matches", []],                 // completed matches
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.activeVotes).toHaveLength(1);
    expect(json.activeVotes[0].id).toBe("m-vote");
    expect(json.activeVotes[0].due).toBe(voteDeadline);
  });
});
