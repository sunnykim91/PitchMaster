import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createMockDb } from "../helpers/db";
import { memberSession, staffSession, noTeamSession } from "../helpers/auth";

vi.mock("@/lib/auth", () => ({ auth: vi.fn(), updateSession: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: vi.fn() }));

import { auth } from "@/lib/auth";
import { updateSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { GET, PUT } from "@/app/api/profile/route";

// ─── GET /api/profile ─────────────────────────────────────────────────────────
describe("GET /api/profile", () => {
  beforeEach(() => vi.clearAllMocks());

  const profileData = {
    id: "user-member-001",
    name: "일반 멤버",
    phone: "01012345678",
    preferred_positions: ["FW", "MF"],
    preferred_foot: "RIGHT",
    profile_image_url: null,
  };

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

  it("200: MEMBER — 프로필 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["users", profileData]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.profile).toEqual(profileData);
  });

  it("200: STAFF — 프로필 반환", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const staffProfile = { ...profileData, id: "user-staff-001", name: "운영진" };
    const db = createMockDb(["users", staffProfile]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.profile.name).toBe("운영진");
  });

  it("400: DB 에러 시 에러 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["users", null, { message: "user not found" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET();
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("user not found");
  });
});

// ─── PUT /api/profile ─────────────────────────────────────────────────────────
describe("PUT /api/profile", () => {
  beforeEach(() => vi.clearAllMocks());

  const updateBody = {
    name: "새이름",
    phone: "010-9876-5432",
    preferredPositions: ["GK"],
    preferredFoot: "LEFT",
    profileImageUrl: "https://example.com/image.png",
  };

  const updatedProfile = {
    id: "user-member-001",
    name: "새이름",
    phone: "01098765432",
    preferred_positions: ["GK"],
    preferred_foot: "LEFT",
    profile_image_url: "https://example.com/image.png",
  };

  function makeRequest(body: object) {
    return new NextRequest("http://localhost/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("401: 비로그인 접근 거부", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await PUT(makeRequest(updateBody));
    expect(res.status).toBe(401);
  });

  it("403: 팀 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(noTeamSession);
    const res = await PUT(makeRequest(updateBody));
    expect(res.status).toBe(403);
  });

  it("503: DB 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);

    const res = await PUT(makeRequest(updateBody));
    expect(res.status).toBe(503);
  });

  it("200: MEMBER — 프로필 업데이트 성공", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    vi.mocked(updateSession).mockResolvedValue(undefined);
    const db = createMockDb(["users", updatedProfile]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makeRequest(updateBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.profile).toEqual(updatedProfile);
  });

  it("200: 업데이트 후 updateSession 호출됨", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    vi.mocked(updateSession).mockResolvedValue(undefined);
    const db = createMockDb(["users", updatedProfile]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    await PUT(makeRequest(updateBody));
    expect(updateSession).toHaveBeenCalledOnce();
    expect(updateSession).toHaveBeenCalledWith(
      expect.objectContaining({ name: updatedProfile.name })
    );
  });

  it("200: name만 업데이트", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    vi.mocked(updateSession).mockResolvedValue(undefined);
    const partialProfile = { ...updatedProfile, name: "이름변경" };
    const db = createMockDb(["users", partialProfile]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makeRequest({ name: "이름변경" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.profile.name).toBe("이름변경");
  });

  it("200: profileImageUrl null로 초기화", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    vi.mocked(updateSession).mockResolvedValue(undefined);
    const clearedProfile = { ...updatedProfile, profile_image_url: null };
    const db = createMockDb(["users", clearedProfile]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makeRequest({ profileImageUrl: "" }));
    expect(res.status).toBe(200);
  });

  it("200: STAFF — 프로필 업데이트 성공", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    vi.mocked(updateSession).mockResolvedValue(undefined);
    const staffProfile = { ...updatedProfile, id: "user-staff-001", name: "운영진새이름" };
    const db = createMockDb(["users", staffProfile]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makeRequest({ name: "운영진새이름" }));
    expect(res.status).toBe(200);
    expect(updateSession).toHaveBeenCalledOnce();
  });

  it("400: DB 에러 시 에러 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["users", null, { message: "update failed" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makeRequest(updateBody));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("update failed");
  });

  it("400: DB 에러 시 updateSession 미호출", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["users", null, { message: "update failed" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    await PUT(makeRequest(updateBody));
    expect(updateSession).not.toHaveBeenCalled();
  });
});
