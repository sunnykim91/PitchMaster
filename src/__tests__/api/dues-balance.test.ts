import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createMockDb } from "../helpers/db";
import { memberSession, staffSession, presidentSession, noTeamSession } from "../helpers/auth";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: vi.fn() }));

import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { GET, POST } from "@/app/api/dues/balance/route";

// ─── GET /api/dues/balance ─────────────────────────────────────────────────────
describe("GET /api/dues/balance", () => {
  beforeEach(() => vi.clearAllMocks());

  const balanceData = {
    actual_balance: 500000,
    balance_updated_at: "2025-01-15T12:00:00.000Z",
  };

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

  it("200: 잔고 조회 성공", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["teams", balanceData]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.balance).toBe(500000);
    expect(json.updatedAt).toBe("2025-01-15T12:00:00.000Z");
  });

  it("200: 잔고 데이터 없으면 null 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["teams", null]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.balance).toBeNull();
    expect(json.updatedAt).toBeNull();
  });

  it("200: STAFF 권한으로도 조회 가능", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const db = createMockDb(["teams", balanceData]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET();
    expect(res.status).toBe(200);
  });
});

// ─── POST /api/dues/balance ────────────────────────────────────────────────────
describe("POST /api/dues/balance", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeRequest(body: object) {
    return new NextRequest("http://localhost/api/dues/balance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("401: 비로그인 접근 거부", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await POST(makeRequest({ balance: 500000 }));
    expect(res.status).toBe(401);
  });

  it("403: 팀 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(noTeamSession);
    const res = await POST(makeRequest({ balance: 500000 }));
    expect(res.status).toBe(403);
  });

  it("403: MEMBER 권한으로 POST 거부", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb();
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest({ balance: 500000 }));
    expect(res.status).toBe(403);
  });

  it("400: balance가 숫자가 아닌 경우", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const db = createMockDb();
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest({ balance: "not-a-number" }));
    expect(res.status).toBe(400);
  });

  it("400: balance 누락 시 에러", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const db = createMockDb();
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("503: DB 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);

    const res = await POST(makeRequest({ balance: 500000 }));
    expect(res.status).toBe(503);
  });

  it("200: 잔고 업데이트 성공 — STAFF", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const db = createMockDb(["teams", null]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest({ balance: 750000 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.balance).toBe(750000);
    expect(json.updatedAt).toBeDefined();
  });

  it("200: 잔고 업데이트 성공 — PRESIDENT", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    const db = createMockDb(["teams", null]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest({ balance: 1000000 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.balance).toBe(1000000);
  });

  it("200: balance 0도 유효한 값으로 허용", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const db = createMockDb(["teams", null]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest({ balance: 0 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.balance).toBe(0);
  });
});
