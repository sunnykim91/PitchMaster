import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, PUT } from "@/app/api/notification-settings/route";
import { createMockDb } from "../helpers/db";
import { memberSession, noTeamSession } from "../helpers/auth";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: vi.fn() }));

import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// ─── GET /api/notification-settings ──────────────────────────────────────────
describe("GET /api/notification-settings", () => {
  beforeEach(() => vi.clearAllMocks());

  const makeRequest = () => new NextRequest("http://localhost/api/notification-settings");

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

  it("200: 설정 레코드 있는 경우 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const settings = { user_id: "user-member-001", email: false, push: true };
    const db = createMockDb(["notification_settings", settings]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.settings).toEqual(settings);
  });

  it("200: 설정 레코드 없는 경우 기본값 반환 (email:true, push:true)", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["notification_settings", null]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.settings).toEqual({ email: true, push: true });
  });

  it("400: DB 에러 시 에러 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["notification_settings", null, { message: "DB error" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET();
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("DB error");
  });
});

// ─── PUT /api/notification-settings ──────────────────────────────────────────
describe("PUT /api/notification-settings", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeRequest(body: object) {
    return new NextRequest("http://localhost/api/notification-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("401: 비로그인 접근 거부", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await PUT(makeRequest({ email: true, push: false }));
    expect(res.status).toBe(401);
  });

  it("403: 팀 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(noTeamSession);
    const res = await PUT(makeRequest({ email: true, push: false }));
    expect(res.status).toBe(403);
  });

  it("503: DB 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);
    const res = await PUT(makeRequest({ email: true, push: false }));
    expect(res.status).toBe(503);
  });

  it("200: 설정 upsert 성공 — 업데이트된 settings 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const updatedSettings = { user_id: "user-member-001", email: true, push: false };
    const db = createMockDb(["notification_settings", updatedSettings]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makeRequest({ email: true, push: false }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.settings).toEqual(updatedSettings);
  });

  it("200: email, push 모두 false로 설정 가능", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const updatedSettings = { user_id: "user-member-001", email: false, push: false };
    const db = createMockDb(["notification_settings", updatedSettings]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makeRequest({ email: false, push: false }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.settings.email).toBe(false);
    expect(json.settings.push).toBe(false);
  });

  it("400: DB 에러 시 에러 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["notification_settings", null, { message: "upsert failed" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makeRequest({ email: true, push: true }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("upsert failed");
  });
});
