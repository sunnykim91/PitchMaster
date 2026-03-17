import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST, PUT } from "@/app/api/rules/route";
import { createMockDb } from "../helpers/db";
import { memberSession, staffSession, presidentSession, noTeamSession } from "../helpers/auth";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: vi.fn() }));

import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const mockRules = [
  { id: "r1", title: "팀 규칙 1", content: "내용1", category: "일반", creator: { name: "회장" } },
  { id: "r2", title: "팀 규칙 2", content: "내용2", category: "훈련", creator: { name: "운영진" } },
];

function makePostRequest(body: object) {
  return new NextRequest("http://localhost/api/rules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makePutRequest(body: object) {
  return new NextRequest("http://localhost/api/rules", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ─── GET /api/rules ────────────────────────────────────────────────────────────
describe("GET /api/rules", () => {
  beforeEach(() => vi.clearAllMocks());

  it("401: 로그인하지 않은 경우", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("403: 팀이 없는 경우", async () => {
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

  it("200: MEMBER — 규칙 목록 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["rules", mockRules]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.rules).toEqual(mockRules);
    expect(json.rules).toHaveLength(2);
  });

  it("200: STAFF — 규칙 목록 반환", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const db = createMockDb(["rules", mockRules]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.rules).toHaveLength(2);
  });

  it("200: 규칙 없으면 빈 배열 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["rules", []]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.rules).toEqual([]);
  });

  it("400: DB 에러 발생시 에러 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["rules", null, { message: "DB query failed" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET();
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("DB query failed");
  });
});

// ─── POST /api/rules ───────────────────────────────────────────────────────────
describe("POST /api/rules", () => {
  beforeEach(() => vi.clearAllMocks());

  const ruleBody = {
    title: "새 규칙",
    content: "규칙 내용",
    category: "일반",
  };

  it("401: 로그인하지 않은 경우", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const res = await POST(makePostRequest(ruleBody));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("403: 팀이 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(noTeamSession);

    const res = await POST(makePostRequest(ruleBody));
    expect(res.status).toBe(403);
  });

  it("403: MEMBER — 규칙 생성 권한 없음", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);

    const res = await POST(makePostRequest(ruleBody));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("Insufficient permissions");
  });

  it("503: DB 없는 경우 (STAFF)", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);

    const res = await POST(makePostRequest(ruleBody));
    expect(res.status).toBe(503);
  });

  it("201: STAFF — 규칙 생성 성공", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const newRule = { id: "r-new", title: "새 규칙", content: "규칙 내용", category: "일반" };
    const db = createMockDb(["rules", newRule]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makePostRequest(ruleBody));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe("r-new");
  });

  it("201: PRESIDENT — 규칙 생성 성공", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    const newRule = { id: "r-president", title: "회장 규칙", content: "중요 규칙", category: "일반" };
    const db = createMockDb(["rules", newRule]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makePostRequest({ ...ruleBody, title: "회장 규칙", content: "중요 규칙" }));
    expect(res.status).toBe(201);
  });

  it("400: DB 에러 시 에러 반환", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const db = createMockDb(["rules", null, { message: "insert failed" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makePostRequest(ruleBody));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("insert failed");
  });
});

// ─── PUT /api/rules ────────────────────────────────────────────────────────────
describe("PUT /api/rules", () => {
  beforeEach(() => vi.clearAllMocks());

  const ruleUpdateBody = {
    id: "r1",
    title: "수정된 규칙",
    content: "수정된 내용",
    category: "훈련",
  };

  it("401: 로그인하지 않은 경우", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const res = await PUT(makePutRequest(ruleUpdateBody));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("403: 팀이 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(noTeamSession);

    const res = await PUT(makePutRequest(ruleUpdateBody));
    expect(res.status).toBe(403);
  });

  it("403: MEMBER — 규칙 수정 권한 없음", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);

    const res = await PUT(makePutRequest(ruleUpdateBody));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("Insufficient permissions");
  });

  it("400: id 없는 경우 (STAFF)", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const db = createMockDb();
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makePutRequest({ title: "id 없음", content: "내용", category: "일반" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("503: DB 없는 경우 (STAFF)", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);

    const res = await PUT(makePutRequest(ruleUpdateBody));
    expect(res.status).toBe(503);
  });

  it("200: STAFF — 규칙 수정 성공", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const updatedRule = { id: "r1", title: "수정된 규칙", content: "수정된 내용", category: "훈련" };
    const db = createMockDb(["rules", updatedRule]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makePutRequest(ruleUpdateBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe("r1");
    expect(json.title).toBe("수정된 규칙");
  });

  it("200: PRESIDENT — 규칙 수정 성공", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    const updatedRule = { id: "r1", title: "수정된 규칙", content: "수정된 내용", category: "훈련" };
    const db = createMockDb(["rules", updatedRule]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makePutRequest(ruleUpdateBody));
    expect(res.status).toBe(200);
  });

  it("400: DB 에러 시 에러 반환", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const db = createMockDb(["rules", null, { message: "update failed" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makePutRequest(ruleUpdateBody));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("update failed");
  });
});
