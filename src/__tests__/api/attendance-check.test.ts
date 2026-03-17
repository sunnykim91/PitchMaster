import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/attendance-check/route";
import { createMockDb } from "../helpers/db";
import { memberSession, staffSession, presidentSession, noTeamSession } from "../helpers/auth";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: vi.fn() }));

import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// ─── POST /api/attendance-check ───────────────────────────────────────────────
describe("POST /api/attendance-check", () => {
  beforeEach(() => vi.clearAllMocks());

  const checkBody = {
    matchId: "m1",
    userId: "u1",
    attended: true,
  };

  function makeRequest(body: object) {
    return new NextRequest("http://localhost/api/attendance-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("401: 로그인하지 않은 경우", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await POST(makeRequest(checkBody));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("403: 팀이 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(noTeamSession);
    const res = await POST(makeRequest(checkBody));
    expect(res.status).toBe(403);
  });

  it("403: MEMBER 권한 — 출석 체크 불가", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const res = await POST(makeRequest(checkBody));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("Insufficient permissions");
  });

  it("503: DB 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);
    const res = await POST(makeRequest(checkBody));
    expect(res.status).toBe(503);
  });

  it("400: matchId 누락", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const db = createMockDb();
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest({ userId: "u1", attended: true }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("required");
  });

  it("400: userId 누락", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const db = createMockDb();
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest({ matchId: "m1", attended: true }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("required");
  });

  it("200: STAFF — 출석 체크 성공", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const db = createMockDb(["match_attendance", null]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest(checkBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("200: PRESIDENT — 출석 체크 성공", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    const db = createMockDb(["match_attendance", null]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest(checkBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("200: attended 미지정시 기본값 true 처리", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const db = createMockDb(["match_attendance", null]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest({ matchId: "m1", userId: "u1" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("400: DB 에러 시 에러 반환", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const db = createMockDb(["match_attendance", null, { message: "upsert failed" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest(checkBody));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("upsert failed");
  });
});

// ─── GET /api/attendance-check ────────────────────────────────────────────────
describe("GET /api/attendance-check", () => {
  beforeEach(() => vi.clearAllMocks());

  const attendanceRecords = [
    {
      id: "att-1",
      match_id: "m1",
      user_id: "u1",
      vote: "ATTEND",
      actually_attended: true,
      users: { id: "u1", name: "홍길동" },
    },
    {
      id: "att-2",
      match_id: "m1",
      user_id: "u2",
      vote: "ATTEND",
      actually_attended: false,
      users: { id: "u2", name: "김철수" },
    },
  ];

  function makeRequest(matchId?: string) {
    const url = matchId
      ? `http://localhost/api/attendance-check?matchId=${matchId}`
      : "http://localhost/api/attendance-check";
    return new NextRequest(url);
  }

  it("401: 로그인하지 않은 경우", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await GET(makeRequest("m1"));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("403: 팀이 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(noTeamSession);
    const res = await GET(makeRequest("m1"));
    expect(res.status).toBe(403);
  });

  it("400: matchId 누락", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb();
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("matchId");
  });

  it("503: DB 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);
    const res = await GET(makeRequest("m1"));
    expect(res.status).toBe(503);
  });

  it("200: 실제 출석 기록 반환 (actually_attended not null)", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["match_attendance", attendanceRecords]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET(makeRequest("m1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.attendance).toEqual(attendanceRecords);
  });

  it("200: 출석 기록 없으면 빈 배열 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["match_attendance", []]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET(makeRequest("m1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.attendance).toEqual([]);
  });

  it("400: DB 에러 발생시 에러 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["match_attendance", null, { message: "query failed" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET(makeRequest("m1"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("query failed");
  });
});
