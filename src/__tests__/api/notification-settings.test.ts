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

  it("200: 설정 레코드 있는 경우 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const settings = { user_id: "user-member-001", push: true };
    const db = createMockDb(["notification_settings", settings]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.settings).toEqual(settings);
  });

  it("200: 설정 레코드 없는 경우 기본값 반환 (push:true)", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["notification_settings", null]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.settings).toEqual({ push: true });
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
    const res = await PUT(makeRequest({ push: false }));
    expect(res.status).toBe(401);
  });

  it("403: 팀 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(noTeamSession);
    const res = await PUT(makeRequest({ push: false }));
    expect(res.status).toBe(403);
  });

  it("503: DB 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);
    const res = await PUT(makeRequest({ push: false }));
    expect(res.status).toBe(503);
  });

  it("200: 기존 설정 있으면 update 성공", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const updated = { user_id: "user-member-001", push: false };
    // 1st call: select (existing found), 2nd call: update
    const db = createMockDb(
      ["notification_settings", { id: "existing-id" }],
      ["notification_settings", updated]
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makeRequest({ push: false }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.settings.push).toBe(false);
  });

  it("200: 기존 설정 없으면 insert 성공", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const inserted = { user_id: "user-member-001", push: true };
    // 1st call: select (null), 2nd call: insert
    const db = createMockDb(
      ["notification_settings", null],
      ["notification_settings", inserted]
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makeRequest({ push: true }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.settings.push).toBe(true);
  });

  it("400: DB 에러 시 에러 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    // 1st call: select (null), 2nd call: insert fails
    const db = createMockDb(
      ["notification_settings", null],
      ["notification_settings", null, { message: "insert failed" }]
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makeRequest({ push: true }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("insert failed");
  });
});
