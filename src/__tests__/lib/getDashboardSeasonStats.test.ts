import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockDb } from "../helpers/db";

vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: vi.fn() }));

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getDashboardSeasonStats } from "@/lib/server/getDashboardData";

/**
 * getDashboardSeasonStats 는 getDashboardData 의 기존 stage 3(시즌 전적 + 본인 시즌기록)를
 * SSR 렌더 경로에서 분리해 떼어낸 함수다 (2026-06-16). 집계 로직은 100% 동일해야 하며,
 * 이 테스트가 그 회귀 안전망이다.
 *
 * 쿼리 순서 (createMockDb 는 테이블별 호출 순서로 응답):
 *   seasons → team_members(maybeSingle) → matches(완료경기) →
 *   match_goals → match_attendance(user) → match_attendance(member)
 */
describe("getDashboardSeasonStats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("DB 없으면 빈 전적 + null", async () => {
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);
    const res = await getDashboardSeasonStats("team1", "userX");
    expect(res.teamRecord).toEqual({ wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, recent5: [] });
    expect(res.mySeasonStats).toBeNull();
  });

  it("전적·시즌기록 집계가 정확하다 (1승1무1패, 본인 2골/3출전)", async () => {
    const db = createMockDb(
      ["seasons", [{ start_date: "2025-01-01", end_date: "2025-12-31", is_active: true }]],
      ["team_members", { id: "tm1" }],
      ["matches", [
        { id: "m1", match_type: "REGULAR" },
        { id: "m2", match_type: "REGULAR" },
        { id: "m3", match_type: "REGULAR" },
      ]],
      ["match_goals", [
        { match_id: "m1", scorer_id: "userX", is_own_goal: false },   // m1 our
        { match_id: "m1", scorer_id: "userY", is_own_goal: false },   // m1 our
        { match_id: "m1", scorer_id: "OPPONENT", is_own_goal: false },// m1 opp → 2:1 W
        { match_id: "m2", scorer_id: "userX", is_own_goal: false },   // m2 our
        { match_id: "m2", scorer_id: "OPPONENT", is_own_goal: false },// m2 opp → 1:1 D
        { match_id: "m3", scorer_id: "OPPONENT", is_own_goal: false },
        { match_id: "m3", scorer_id: "OPPONENT", is_own_goal: false },// m3 0:2 L
      ]],
      ["match_attendance", [{ match_id: "m1" }, { match_id: "m2" }]], // 본인 user_id 출전
      ["match_attendance", [{ match_id: "m3" }]],                     // 본인 member_id 출전
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as unknown as ReturnType<typeof getSupabaseAdmin>);

    const res = await getDashboardSeasonStats("team1", "userX");

    expect(res.teamRecord).toEqual({
      wins: 1, draws: 1, losses: 1, goalsFor: 3, goalsAgainst: 4, recent5: ["W", "D", "L"],
    });
    expect(res.mySeasonStats).toEqual({
      matches: 3, goals: 2, attendanceRate: 100, teamGoalRank: 1, totalCompletedMatches: 3,
    });
  });

  it("자체전(INTERNAL)·행사(EVENT)는 전적/통계에서 제외", async () => {
    const db = createMockDb(
      ["seasons", [{ start_date: "2025-01-01", end_date: "2025-12-31", is_active: true }]],
      ["team_members", { id: "tm1" }],
      ["matches", [
        { id: "m1", match_type: "REGULAR" },
        { id: "mi", match_type: "INTERNAL" },
        { id: "me", match_type: "EVENT" },
      ]],
      ["match_goals", [
        { match_id: "m1", scorer_id: "userX", is_own_goal: false },  // m1 1:0 W
      ]],
      ["match_attendance", [{ match_id: "m1" }]],
      ["match_attendance", []],
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as unknown as ReturnType<typeof getSupabaseAdmin>);

    const res = await getDashboardSeasonStats("team1", "userX");
    expect(res.teamRecord.wins).toBe(1);
    expect(res.teamRecord.recent5).toEqual(["W"]);
    expect(res.mySeasonStats?.totalCompletedMatches).toBe(1);
  });

  it("완료경기 없으면 빈 전적 + mySeasonStats null", async () => {
    const db = createMockDb(
      ["seasons", [{ start_date: "2025-01-01", end_date: "2025-12-31", is_active: true }]],
      ["team_members", { id: "tm1" }],
      ["matches", []],
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as unknown as ReturnType<typeof getSupabaseAdmin>);

    const res = await getDashboardSeasonStats("team1", "userX");
    expect(res.teamRecord).toEqual({ wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, recent5: [] });
    expect(res.mySeasonStats).toBeNull();
  });
});
