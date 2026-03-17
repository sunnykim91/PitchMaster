import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/dashboard/route";
import { createMockDb } from "../helpers/db";
import { memberSession, noTeamSession } from "../helpers/auth";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: vi.fn() }));

import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// ─── GET /api/dashboard ───────────────────────────────────────────────────────
describe("GET /api/dashboard", () => {
  beforeEach(() => vi.clearAllMocks());

  const makeRequest = () => new NextRequest("http://localhost/api/dashboard");

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

  it("503: DB 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);
    const res = await GET();
    expect(res.status).toBe(503);
  });

  it("200: 경기 없는 경우 — 빈 대시보드 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    // 순서: upcoming(maybeSingle), recent(maybeSingle), activeVotes(list)
    const db = createMockDb(
      ["matches", null],  // upcoming match → null
      ["matches", null],  // recent match → null
      ["matches", []]     // active votes → []
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.upcomingMatch).toBeNull();
    expect(json.recentResult).toBeNull();
    expect(json.activeVotes).toEqual([]);
    expect(json.tasks).toEqual([]);
  });

  it("200: 다가오는 경기 있고 출석 투표 안 한 경우 — task 추가", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);

    const upcomingMatch = {
      id: "m-upcoming",
      match_date: "2099-12-31",
      opponent_name: "상대팀",
      status: "SCHEDULED",
      vote_deadline: new Date(Date.now() + 86400000).toISOString(),
    };

    const db = createMockDb(
      ["matches", upcomingMatch],  // upcoming match
      ["matches", null],           // recent match → null
      ["matches", []],             // active votes → []
      ["match_attendance", null],  // user attendance vote → not voted
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.upcomingMatch).toEqual(upcomingMatch);
    expect(json.tasks).toContain("다음 경기 참석 투표 완료하기");
  });

  it("200: 다가오는 경기 있고 출석 투표 완료한 경우 — task 없음", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);

    const upcomingMatch = {
      id: "m-upcoming",
      match_date: "2099-12-31",
      opponent_name: "상대팀",
      status: "SCHEDULED",
      vote_deadline: new Date(Date.now() + 86400000).toISOString(),
    };

    const db = createMockDb(
      ["matches", upcomingMatch],                          // upcoming match
      ["matches", null],                                   // recent match → null
      ["matches", []],                                     // active votes → []
      ["match_attendance", { vote: "ATTEND" }],            // user already voted
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.tasks).not.toContain("다음 경기 참석 투표 완료하기");
  });

  it("200: 최근 완료 경기 있고 MVP 투표 안 한 경우 — task 추가", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);

    const recentMatch = {
      id: "m-recent",
      match_date: "2024-01-01",
      opponent_name: "상대팀",
      status: "COMPLETED",
    };

    const db = createMockDb(
      ["matches", null],       // upcoming match → null
      ["matches", recentMatch], // recent match
      ["match_goals", []],     // goals for recent match
      ["match_mvp_votes", []], // mvp votes for result computation
      ["matches", []],         // active votes
      ["match_mvp_votes", null], // user mvp vote → not voted
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.tasks).toContain("최근 경기 MVP 투표 완료하기");
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
      ["matches", null],              // upcoming match → null
      ["matches", null],              // recent match → null
      ["matches", [activeVoteMatch]], // active votes
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.activeVotes).toHaveLength(1);
    expect(json.activeVotes[0].id).toBe("m-vote");
    expect(json.activeVotes[0].due).toBe(voteDeadline);
  });

  it("200: 최근 경기 결과 스코어 계산 포함", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);

    const recentMatch = {
      id: "m-recent",
      match_date: "2024-01-01",
      opponent_name: "상대팀",
      status: "COMPLETED",
    };

    const goals = [
      { scorer_id: "u1" },
      { scorer_id: "u2" },
      { scorer_id: "OPPONENT" },
    ];

    const mvpVotes = [
      { candidate_id: "u1", users: { name: "김선수" } },
      { candidate_id: "u1", users: { name: "김선수" } },
    ];

    const db = createMockDb(
      ["matches", null],             // upcoming match → null
      ["matches", recentMatch],      // recent match
      ["match_goals", goals],        // goals
      ["match_mvp_votes", mvpVotes], // mvp votes for result
      ["matches", []],               // active votes
      ["match_mvp_votes", { id: "mv1" }], // user already voted mvp
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.recentResult).not.toBeNull();
    expect(json.recentResult.score).toBe("2 : 1");
    expect(json.recentResult.mvp).toBe("김선수");
    expect(json.recentResult.opponent).toBe("상대팀");
  });
});
