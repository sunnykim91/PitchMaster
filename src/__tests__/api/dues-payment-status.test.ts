import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createMockDb } from "../helpers/db";
import { memberSession, staffSession, presidentSession, noTeamSession } from "../helpers/auth";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: vi.fn() }));

import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { GET, POST, PUT } from "@/app/api/dues/payment-status/route";

// ─── GET /api/dues/payment-status ────────────────────────────────────────────
describe("GET /api/dues/payment-status", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeRequest(params?: Record<string, string>) {
    const url = new URL("http://localhost/api/dues/payment-status");
    if (params) {
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    }
    return new NextRequest(url);
  }

  it("401: 비로그인 접근 거부", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("403: 팀 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(noTeamSession);
    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
  });

  it("400: month 파라미터 누락", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("month");
  });

  it("503: DB 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);
    const res = await GET(makeRequest({ month: "2026-03" }));
    expect(res.status).toBe(503);
  });

  it("200: 유효한 month로 납부 상태 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const statusRecords = [
      { id: "ps-1", member_id: "mem-1", month: "2026-03", status: "PAID" },
      { id: "ps-2", member_id: "mem-2", month: "2026-03", status: "UNPAID" },
    ];
    const db = createMockDb(["dues_payment_status", statusRecords]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET(makeRequest({ month: "2026-03" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(statusRecords);
  });
});

// ─── POST /api/dues/payment-status ───────────────────────────────────────────
describe("POST /api/dues/payment-status", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeRequest(body: object) {
    return new NextRequest("http://localhost/api/dues/payment-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("401: 비로그인 접근 거부", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await POST(makeRequest({ memberId: "m1", month: "2026-03", status: "PAID" }));
    expect(res.status).toBe(401);
  });

  it("403: MEMBER 권한으로 POST 거부", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const res = await POST(makeRequest({ memberId: "m1", month: "2026-03", status: "PAID" }));
    expect(res.status).toBe(403);
  });

  it("400: 필수 필드 누락 (memberId, month, status)", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const db = createMockDb();
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest({ memberId: "m1" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("required");
  });

  it("400: 유효하지 않은 status 값", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const db = createMockDb();
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest({ memberId: "m1", month: "2026-03", status: "INVALID" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("PAID");
  });

  it("503: DB 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);

    const res = await POST(makeRequest({ memberId: "m1", month: "2026-03", status: "PAID" }));
    expect(res.status).toBe(503);
  });

  it("200: 유효한 upsert 성공", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const upserted = { id: "ps-1", member_id: "m1", month: "2026-03", status: "PAID", paid_amount: 50000 };
    const db = createMockDb(["dues_payment_status", upserted]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest({ memberId: "m1", month: "2026-03", status: "PAID", paidAmount: 50000 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("PAID");
  });

  it("200: PRESIDENT 권한으로도 upsert 가능", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    const upserted = { id: "ps-2", member_id: "m2", month: "2026-03", status: "EXEMPT" };
    const db = createMockDb(["dues_payment_status", upserted]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest({ memberId: "m2", month: "2026-03", status: "EXEMPT" }));
    expect(res.status).toBe(200);
  });
});

// ─── PUT /api/dues/payment-status ────────────────────────────────────────────
describe("PUT /api/dues/payment-status", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeRequest(body: object) {
    return new NextRequest("http://localhost/api/dues/payment-status", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("401: 비로그인 접근 거부", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await PUT(makeRequest({ month: "2026-03", matches: [] }));
    expect(res.status).toBe(401);
  });

  it("403: 팀 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(noTeamSession);
    const res = await PUT(makeRequest({ month: "2026-03", matches: [] }));
    expect(res.status).toBe(403);
  });

  it("400: month 누락", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const res = await PUT(makeRequest({ matches: [{ memberId: "m1", amount: 50000 }] }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("required");
  });

  it("400: matches 누락", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const res = await PUT(makeRequest({ month: "2026-03" }));
    expect(res.status).toBe(400);
  });

  it("503: DB 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);

    const res = await PUT(makeRequest({ month: "2026-03", matches: [{ memberId: "m1", amount: 50000 }] }));
    expect(res.status).toBe(503);
  });

  it("200: 일괄 자동 매칭 성공 (기본 status=PAID)", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const matches = [
      { memberId: "m1", amount: 50000 },
      { memberId: "m2", amount: 30000 },
    ];
    // 각 match에 대해 dues_payment_status upsert 호출
    const db = createMockDb(
      ["dues_payment_status", null],
      ["dues_payment_status", null]
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makeRequest({ month: "2026-03", matches }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.updated).toBe(2);
  });

  it("200: status 필드 지정 가능", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const matches = [
      { memberId: "m1", amount: 50000, status: "EXEMPT" },
    ];
    const db = createMockDb(["dues_payment_status", null]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makeRequest({ month: "2026-03", matches }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.updated).toBe(1);
  });

  it("200: 부분 실패 시 updated 카운트 반영", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const matches = [
      { memberId: "m1", amount: 50000 },
      { memberId: "m2", amount: 30000 },
      { memberId: "m3", amount: 20000 },
    ];
    // 첫 번째: 성공, 두 번째: 에러, 세 번째: 성공
    const db = createMockDb(
      ["dues_payment_status", null],
      ["dues_payment_status", null, { message: "upsert failed" }],
      ["dues_payment_status", null]
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makeRequest({ month: "2026-03", matches }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.updated).toBe(2);
  });
});
