import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/dashboard/route";
import { createMockDb } from "../helpers/db";
import { memberSession, noTeamSession } from "../helpers/auth";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: vi.fn() }));

import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * 대시보드 SSR 데이터 fetch 호출 순서 (2026-05-05 재구성):
 *
 * Stage 1 Promise.all (모두 병렬):
 *   matches × 5 (autoComplete past + autoComplete today + upcoming + recent + activeVotes)
 *   teams × 1 (uniform + mvp_vote_staff_only)
 *   team_members × 1 (통합 roster)
 *   seasons × 1
 *   matches × 1 (totalMatchesCount, count head)
 *   users × 1 (profile)
 *   dues_settings × 1 (count head)
 *
 * Stage 2 Promise.all (조건부):
 *   match_attendance (vote rollup, upcoming + activeVotes match_ids)
 *   match_guests (upcoming)
 *   match_goals (recent)
 *   match_mvp_votes (recent)
 *   match_attendance (recent actual attendance)
 *   match_attendance (my upcoming vote check)
 *   match_mvp_votes (my recent MVP check)
 *   dues_payment_status (my payment, if myTeamMemberId)
 *   member_dues_exemptions (my exemptions, if myTeamMemberId)
 *   dues_records (month record count, if isStaff)
 *   dues_payment_status (paid count, if isStaff)
 *   team_join_requests (pending count, if isStaff)
 *   matches × 1 (completedMatches)
 *
 * Stage 3 (조건부):
 *   match_goals (allGoals for completedIds, if non-empty)
 */
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
    const db = createMockDb(
      // Stage 1 — matches 6 calls (autoComplete×2 + upcoming + recent + activeVotes + totalMatches)
      ["matches", null],
      ["matches", null],
      ["matches", null],
      ["matches", null],
      ["matches", []],
      ["matches", null],
      // Stage 1 — 나머지 단일 fetch
      ["teams", null],
      ["team_members", []],
      ["seasons", []],
      ["users", null],
      ["dues_settings", null],
      // Stage 2 — completedMatches (다른 쿼리는 upcoming/recent null 이라 spinned but 결과 무시)
      ["matches", []],
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
      match_type: "REGULAR",
    };

    // 통합 roster: 본인 + 다른 멤버 1명. 본인 user_id 가 memberSession.user.id 와 매치돼야 myTeamMemberId 결정됨
    const roster = [
      {
        id: "mem-1",
        user_id: memberSession.user.id,
        status: "ACTIVE",
        role: "MEMBER",
        users: { name: "일반 멤버", birth_date: null, profile_image_url: null },
      },
      {
        id: "mem-other",
        user_id: "other",
        status: "ACTIVE",
        role: "MEMBER",
        users: { name: "다른 멤버", birth_date: null, profile_image_url: null },
      },
    ];

    const db = createMockDb(
      // Stage 1
      ["matches", null],            // autoComplete past
      ["matches", null],            // autoComplete today
      ["matches", upcomingMatch],   // upcoming
      ["matches", null],            // recent
      ["matches", []],              // activeVotes
      ["matches", null],            // totalMatchesCount
      ["teams", null],
      ["team_members", roster],
      ["seasons", []],
      ["users", null],
      ["dues_settings", null],
      // Stage 2
      ["match_attendance", [{ match_id: "m-upcoming", vote: "ATTEND", user_id: "other", member_id: null }]], // vote rollup
      ["match_guests", []],
      // recent 없음 → match_goals/match_mvp_votes/recent attendance 스킵
      ["match_attendance", null],   // my upcoming vote check (tasks)
      // recent 없음 → my mvp check 스킵
      ["dues_payment_status", null], // my payment
      ["member_dues_exemptions", []], // my exemptions
      // isStaff false → dues_records, paid count, team_join_requests 스킵
      ["matches", []],              // completedMatches
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
    expect(json.tasks.some((t: { label: string }) => t.label === "다음 경기 참석 투표 완료하기")).toBe(true);
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

    const roster = [
      {
        id: "mem-1",
        user_id: memberSession.user.id,
        status: "ACTIVE",
        role: "MEMBER",
        users: { name: "일반 멤버", birth_date: null, profile_image_url: null },
      },
    ];

    const db = createMockDb(
      // Stage 1
      ["matches", null],            // autoComplete past
      ["matches", null],            // autoComplete today
      ["matches", null],            // upcoming → null
      ["matches", recentMatch],     // recent
      ["matches", []],              // activeVotes
      ["matches", null],            // totalMatchesCount
      ["teams", null],
      ["team_members", roster],
      ["seasons", []],
      ["users", null],
      ["dues_settings", null],
      // Stage 2 (upcoming 없음 → vote rollup/guests/my upcoming vote 스킵)
      ["match_goals", goals],       // recent goals
      ["match_mvp_votes", mvpVotes],// recent MVP votes
      ["match_attendance", [{ id: "a1" }, { id: "a2" }]], // recent actual attendance
      ["match_mvp_votes", { id: "v1" }], // my MVP vote check
      ["dues_payment_status", null],
      ["member_dues_exemptions", []],
      // Stage 2 completedMatches
      ["matches", [recentMatch]],
      // Stage 3
      ["match_goals", goals],
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
      match_type: "REGULAR",
    };

    const db = createMockDb(
      // Stage 1
      ["matches", null],               // autoComplete past
      ["matches", null],               // autoComplete today
      ["matches", null],               // upcoming → null
      ["matches", null],               // recent → null
      ["matches", [activeVoteMatch]],  // activeVotes
      ["matches", null],               // totalMatchesCount
      ["teams", null],
      ["team_members", []],
      ["seasons", []],
      ["users", null],
      ["dues_settings", null],
      // Stage 2 — activeVote 있어 vote rollup 발생
      ["match_attendance", []],        // vote rollup (no votes)
      // No upcoming/recent → guests/goals/mvp/recent attendance 스킵
      // myTeamMemberId 없음 (roster 비어있음) → payment/exemption 스킵
      ["matches", []],                 // completedMatches
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
