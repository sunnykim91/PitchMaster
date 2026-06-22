import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockDb } from "../helpers/db";

vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: vi.fn() }));

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getPenaltyExemptUserIds } from "@/lib/server/getPenaltyExemptUserIds";

describe("getPenaltyExemptUserIds — 벌금 면제(휴회·부상) 회원 매핑", () => {
  beforeEach(() => vi.clearAllMocks());

  it("LEAVE/INJURED 면제 멤버의 user_id 셋을 반환한다 (member_id→user_id 매핑)", async () => {
    const db = createMockDb(
      // member_dues_exemptions: .in(['LEAVE','INJURED']) 결과 (team_members.id 기준)
      ["member_dues_exemptions", [{ member_id: "tm1" }, { member_id: "tm2" }]],
      // team_members: 위 member_id → user_id 해석
      ["team_members", [{ user_id: "u1" }, { user_id: "u2" }]],
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as unknown as ReturnType<typeof getSupabaseAdmin>);

    const set = await getPenaltyExemptUserIds("team-1");
    expect(set).toBeInstanceOf(Set);
    expect([...set].sort()).toEqual(["u1", "u2"]);
  });

  it("LEAVE/INJURED 면제가 없으면 빈 셋 (team_members 조회 없이 조기 반환)", async () => {
    const db = createMockDb(["member_dues_exemptions", []]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as unknown as ReturnType<typeof getSupabaseAdmin>);

    const set = await getPenaltyExemptUserIds("team-1");
    expect(set.size).toBe(0);
    // member_dues_exemptions 1회만 조회, team_members 는 조회하지 않음
    expect(db.from).toHaveBeenCalledTimes(1);
    expect(db.from).toHaveBeenCalledWith("member_dues_exemptions");
  });

  it("user_id 가 null 인 미연동 멤버는 셋에서 제외된다", async () => {
    const db = createMockDb(
      ["member_dues_exemptions", [{ member_id: "tm1" }, { member_id: "tm2" }]],
      ["team_members", [{ user_id: "u1" }, { user_id: null }]],
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as unknown as ReturnType<typeof getSupabaseAdmin>);

    const set = await getPenaltyExemptUserIds("team-1");
    expect([...set]).toEqual(["u1"]);
  });

  it("DB 사용 불가 시 빈 셋", async () => {
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);
    const set = await getPenaltyExemptUserIds("team-1");
    expect(set.size).toBe(0);
  });
});
