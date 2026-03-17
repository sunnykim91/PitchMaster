import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createMockDb } from "../helpers/db";
import { memberSession, staffSession, presidentSession, noTeamSession } from "../helpers/auth";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: vi.fn() }));

import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { GET, POST, PUT, DELETE } from "@/app/api/dues/route";

// ─── GET /api/dues ─────────────────────────────────────────────────────────────
describe("GET /api/dues", () => {
  beforeEach(() => vi.clearAllMocks());

  const duesRecords = [
    { id: "rec-1", type: "DEPOSIT", amount: 10000, description: "월회비", user_id: "u1" },
    { id: "rec-2", type: "WITHDRAW", amount: 5000, description: "장비구매", user_id: "u2" },
  ];

  function makeRequest(params?: Record<string, string>) {
    const url = new URL("http://localhost/api/dues");
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

  it("503: DB 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);
    const res = await GET(makeRequest());
    expect(res.status).toBe(503);
  });

  it("200: 전체 회비 내역 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["dues_records", duesRecords]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.records).toEqual(duesRecords);
  });

  it("200: memberId 파라미터로 필터링", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const filtered = [duesRecords[0]];
    const db = createMockDb(["dues_records", filtered]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET(makeRequest({ memberId: "u1" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.records).toEqual(filtered);
  });

  it("200: STAFF 권한도 조회 가능", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const db = createMockDb(["dues_records", duesRecords]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
  });
});

// ─── POST /api/dues ────────────────────────────────────────────────────────────
describe("POST /api/dues", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeRequest(body: object) {
    return new NextRequest("http://localhost/api/dues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  const newRecordBody = {
    type: "DEPOSIT",
    amount: 10000,
    description: "월회비",
    userId: "u1",
    recordedAt: "2025-01-15",
    recordedTime: "12:00",
  };

  it("401: 비로그인 접근 거부", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await POST(makeRequest(newRecordBody));
    expect(res.status).toBe(401);
  });

  it("403: 팀 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(noTeamSession);
    const res = await POST(makeRequest(newRecordBody));
    expect(res.status).toBe(403);
  });

  it("403: MEMBER 권한으로 POST 거부", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb();
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest(newRecordBody));
    expect(res.status).toBe(403);
  });

  it("503: DB 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);
    const res = await POST(makeRequest(newRecordBody));
    expect(res.status).toBe(503);
  });

  it("200: 중복 레코드 존재 시 duplicate 반환", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    // 첫 번째 dues_records 호출: 중복 체크 → 기존 레코드 발견
    const db = createMockDb(
      ["dues_records", [{ id: "dup1" }]]
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest(newRecordBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.duplicate).toBe(true);
    expect(json.id).toBe("dup1");
  });

  it("201: 신규 레코드 생성 성공", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const newRecord = { id: "rec-new", type: "DEPOSIT", amount: 10000, description: "월회비" };
    // 첫 번째 dues_records 호출: 중복 체크 → 없음
    // 두 번째 dues_records 호출: insert 결과
    const db = createMockDb(
      ["dues_records", []],
      ["dues_records", newRecord]
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest(newRecordBody));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe("rec-new");
  });

  it("201: PRESIDENT 권한으로도 생성 가능", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    const newRecord = { id: "rec-pres", type: "DEPOSIT", amount: 20000 };
    const db = createMockDb(
      ["dues_records", []],
      ["dues_records", newRecord]
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest(newRecordBody));
    expect(res.status).toBe(201);
  });

  it("201: recordedAt/description/amount 없으면 중복 체크 건너뜀", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const bodyWithoutFields = { type: "DEPOSIT", userId: "u1" };
    const newRecord = { id: "rec-no-dup", type: "DEPOSIT" };
    // 중복 체크 없이 바로 insert
    const db = createMockDb(
      ["dues_records", newRecord]
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest(bodyWithoutFields));
    expect(res.status).toBe(201);
  });
});

// ─── PUT /api/dues ─────────────────────────────────────────────────────────────
describe("PUT /api/dues", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeRequest(body: object) {
    return new NextRequest("http://localhost/api/dues", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  const updateBody = {
    id: "rec-1",
    type: "DEPOSIT",
    amount: 15000,
    description: "수정된 내역",
  };

  it("401: 비로그인 접근 거부", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await PUT(makeRequest(updateBody));
    expect(res.status).toBe(401);
  });

  it("403: MEMBER 권한으로 PUT 거부", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb();
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makeRequest(updateBody));
    expect(res.status).toBe(403);
  });

  it("400: id 누락 시 에러", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const db = createMockDb();
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makeRequest({ type: "DEPOSIT", amount: 10000 }));
    expect(res.status).toBe(400);
  });

  it("200: 레코드 업데이트 성공", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const updatedRecord = { id: "rec-1", type: "DEPOSIT", amount: 15000, description: "수정된 내역" };
    const db = createMockDb(["dues_records", updatedRecord]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makeRequest(updateBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe("rec-1");
    expect(json.amount).toBe(15000);
  });

  it("200: PRESIDENT 권한으로도 업데이트 가능", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    const updatedRecord = { id: "rec-1", type: "WITHDRAW", amount: 5000 };
    const db = createMockDb(["dues_records", updatedRecord]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makeRequest(updateBody));
    expect(res.status).toBe(200);
  });
});

// ─── DELETE /api/dues ──────────────────────────────────────────────────────────
describe("DELETE /api/dues", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeRequest(params?: Record<string, string>) {
    const url = new URL("http://localhost/api/dues");
    if (params) {
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    }
    return new NextRequest(url, { method: "DELETE" });
  }

  it("401: 비로그인 접근 거부", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await DELETE(makeRequest({ id: "rec-1" }));
    expect(res.status).toBe(401);
  });

  it("403: MEMBER 권한으로 DELETE 거부", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb();
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await DELETE(makeRequest({ id: "rec-1" }));
    expect(res.status).toBe(403);
  });

  it("400: id 파라미터 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const db = createMockDb();
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await DELETE(makeRequest());
    expect(res.status).toBe(400);
  });

  it("503: DB 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);

    const res = await DELETE(makeRequest({ id: "rec-1" }));
    expect(res.status).toBe(503);
  });

  it("200: 레코드 삭제 성공", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const db = createMockDb(["dues_records", null]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await DELETE(makeRequest({ id: "rec-1" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.deleted).toBe(true);
  });

  it("200: PRESIDENT 권한으로도 삭제 가능", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    const db = createMockDb(["dues_records", null]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await DELETE(makeRequest({ id: "rec-1" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.deleted).toBe(true);
  });
});
