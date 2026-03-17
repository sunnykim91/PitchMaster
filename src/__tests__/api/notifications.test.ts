import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, PUT } from "@/app/api/notifications/route";
import { createMockDb } from "../helpers/db";
import { memberSession, noTeamSession } from "../helpers/auth";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: vi.fn() }));

import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const mockNotifications = [
  { id: "n1", user_id: "user-member-001", message: "공지사항", is_read: false, created_at: "2024-01-02T00:00:00Z" },
  { id: "n2", user_id: "user-member-001", message: "경기 일정", is_read: true, created_at: "2024-01-01T00:00:00Z" },
];

// ─── GET /api/notifications ───────────────────────────────────────────────────
describe("GET /api/notifications", () => {
  beforeEach(() => vi.clearAllMocks());

  const makeRequest = () => new NextRequest("http://localhost/api/notifications");

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

  it("200: 알림 목록 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["notifications", mockNotifications]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.notifications).toEqual(mockNotifications);
  });

  it("200: 알림 없는 경우 빈 배열 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["notifications", []]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.notifications).toEqual([]);
  });

  it("400: DB 에러 시 에러 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["notifications", null, { message: "DB error" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET();
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("DB error");
  });
});

// ─── PUT /api/notifications ───────────────────────────────────────────────────
describe("PUT /api/notifications", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeRequest(body: object) {
    return new NextRequest("http://localhost/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("401: 비로그인 접근 거부", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await PUT(makeRequest({ markAllRead: true }));
    expect(res.status).toBe(401);
  });

  it("403: 팀 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(noTeamSession);
    const res = await PUT(makeRequest({ markAllRead: true }));
    expect(res.status).toBe(403);
  });

  it("503: DB 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);
    const res = await PUT(makeRequest({ markAllRead: true }));
    expect(res.status).toBe(503);
  });

  it("200: markAllRead:true — 전체 읽음 처리", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["notifications", null]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makeRequest({ markAllRead: true }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("200: all:true — 전체 읽음 처리", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["notifications", null]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makeRequest({ all: true }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("200: id 지정 — 단일 알림 읽음 처리", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["notifications", null]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makeRequest({ id: "n1" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("400: DB 에러 시 에러 반환 (전체 읽음)", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["notifications", null, { message: "update failed" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makeRequest({ markAllRead: true }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("update failed");
  });

  it("400: DB 에러 시 에러 반환 (단일 읽음)", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["notifications", null, { message: "update failed" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makeRequest({ id: "n1" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("update failed");
  });

  it("200: body가 빈 객체인 경우 ok:true 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb();
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makeRequest({}));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
