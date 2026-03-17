import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockDb } from "../helpers/db";
import { memberSession, staffSession, noTeamSession } from "../helpers/auth";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: vi.fn() }));

import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { GET } from "@/app/api/dues/summary/route";

// ─── GET /api/dues/summary ─────────────────────────────────────────────────────
describe("GET /api/dues/summary", () => {
  beforeEach(() => vi.clearAllMocks());

  const duesRecords = [
    { id: "rec-1", type: "DEPOSIT", amount: 10000, description: "월회비" },
    { id: "rec-2", type: "WITHDRAW", amount: 5000, description: "장비구매" },
  ];
  const teamData = { actual_balance: 100000, balance_updated_at: "2025-01-01T00:00:00.000Z" };
  const duesSettings = [
    { id: "set-1", member_type: "REGULAR", monthly_amount: 10000 },
  ];
  const penaltyRules = [
    { id: "rule-1", name: "지각", amount: 1000 },
  ];
  const penaltyRecords = [
    { id: "pen-1", rule_id: "rule-1", member_id: "mem-1", amount: 1000 },
  ];

  it("401: 비로그인 접근 거부", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
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

  it("200: 5개 쿼리 결과를 합쳐 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    // Promise.all로 5개 테이블을 병렬 조회: dues_records, teams, dues_settings, penalty_rules, penalty_records
    const db = createMockDb(
      ["dues_records", duesRecords],
      ["teams", teamData],
      ["dues_settings", duesSettings],
      ["penalty_rules", penaltyRules],
      ["penalty_records", penaltyRecords]
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.records).toEqual(duesRecords);
    expect(json.balance).toBe(100000);
    expect(json.balanceUpdatedAt).toBe("2025-01-01T00:00:00.000Z");
    expect(json.settings).toEqual(duesSettings);
    expect(json.penaltyRules).toEqual(penaltyRules);
    expect(json.penaltyRecords).toEqual(penaltyRecords);
  });

  it("200: STAFF 권한으로도 조회 가능", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const db = createMockDb(
      ["dues_records", duesRecords],
      ["teams", teamData],
      ["dues_settings", duesSettings],
      ["penalty_rules", penaltyRules],
      ["penalty_records", penaltyRecords]
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET();
    expect(res.status).toBe(200);
  });

  it("200: 데이터 없을 때 빈 배열/null 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(
      ["dues_records", []],
      ["teams", null],
      ["dues_settings", []],
      ["penalty_rules", []],
      ["penalty_records", []]
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.records).toEqual([]);
    expect(json.balance).toBeNull();
    expect(json.balanceUpdatedAt).toBeNull();
    expect(json.settings).toEqual([]);
    expect(json.penaltyRules).toEqual([]);
    expect(json.penaltyRecords).toEqual([]);
  });

  it("200: 응답에 모든 필드 키가 포함됨", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(
      ["dues_records", []],
      ["teams", teamData],
      ["dues_settings", []],
      ["penalty_rules", []],
      ["penalty_records", []]
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json).toHaveProperty("records");
    expect(json).toHaveProperty("balance");
    expect(json).toHaveProperty("balanceUpdatedAt");
    expect(json).toHaveProperty("settings");
    expect(json).toHaveProperty("penaltyRules");
    expect(json).toHaveProperty("penaltyRecords");
  });
});
