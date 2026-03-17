import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createMockDb } from "../helpers/db";
import { memberSession, staffSession, presidentSession, noTeamSession } from "../helpers/auth";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: vi.fn() }));

import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { GET, POST } from "@/app/api/dues-settings/route";

// ─── GET /api/dues-settings ────────────────────────────────────────────────────
describe("GET /api/dues-settings", () => {
  beforeEach(() => vi.clearAllMocks());

  const settingsData = [
    { id: "set-1", team_id: "team-test-001", member_type: "REGULAR", monthly_amount: 10000, description: "정기 회원" },
    { id: "set-2", team_id: "team-test-001", member_type: "STUDENT", monthly_amount: 5000, description: "학생 회원" },
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

  it("200: 설정 목록 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["dues_settings", settingsData]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.settings).toEqual(settingsData);
  });

  it("200: 설정 없을 때 빈 배열 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["dues_settings", []]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.settings).toEqual([]);
  });

  it("200: STAFF 권한으로도 조회 가능", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const db = createMockDb(["dues_settings", settingsData]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET();
    expect(res.status).toBe(200);
  });
});

// ─── POST /api/dues-settings ───────────────────────────────────────────────────
describe("POST /api/dues-settings", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeRequest(body: object) {
    return new NextRequest("http://localhost/api/dues-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  const newSettingBody = {
    memberType: "REGULAR",
    monthlyAmount: 10000,
    description: "정기 회원",
  };

  it("401: 비로그인 접근 거부", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await POST(makeRequest(newSettingBody));
    expect(res.status).toBe(401);
  });

  it("403: 팀 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(noTeamSession);
    const res = await POST(makeRequest(newSettingBody));
    expect(res.status).toBe(403);
  });

  it("403: MEMBER 권한으로 POST 거부", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb();
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest(newSettingBody));
    expect(res.status).toBe(403);
  });

  it("503: DB 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);

    const res = await POST(makeRequest(newSettingBody));
    expect(res.status).toBe(503);
  });

  it("201: 설정 생성 성공 — STAFF", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const newSetting = {
      id: "set-new",
      team_id: "team-test-001",
      member_type: "REGULAR",
      monthly_amount: 10000,
      description: "정기 회원",
    };
    const db = createMockDb(["dues_settings", newSetting]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest(newSettingBody));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe("set-new");
    expect(json.member_type).toBe("REGULAR");
    expect(json.monthly_amount).toBe(10000);
  });

  it("201: 설정 생성 성공 — PRESIDENT", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    const newSetting = {
      id: "set-pres",
      team_id: "team-test-001",
      member_type: "STUDENT",
      monthly_amount: 5000,
      description: null,
    };
    const db = createMockDb(["dues_settings", newSetting]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest({ memberType: "STUDENT", monthlyAmount: 5000 }));
    expect(res.status).toBe(201);
  });

  it("201: description 없어도 생성 가능 (null 허용)", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const newSetting = {
      id: "set-no-desc",
      team_id: "team-test-001",
      member_type: "REGULAR",
      monthly_amount: 10000,
      description: null,
    };
    const db = createMockDb(["dues_settings", newSetting]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest({ memberType: "REGULAR", monthlyAmount: 10000 }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.description).toBeNull();
  });
});
