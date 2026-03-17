import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST, PUT } from "@/app/api/seasons/route";
import { createMockDb } from "../helpers/db";
import { memberSession, staffSession, noTeamSession } from "../helpers/auth";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: vi.fn() }));

import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const mockSeasons = [
  { id: "s1", team_id: "team-test-001", name: "2024 시즌", start_date: "2024-01-01", end_date: "2024-12-31", is_active: true },
  { id: "s2", team_id: "team-test-001", name: "2023 시즌", start_date: "2023-01-01", end_date: "2023-12-31", is_active: false },
];

// ─── GET /api/seasons ─────────────────────────────────────────────────────────
describe("GET /api/seasons", () => {
  beforeEach(() => vi.clearAllMocks());

  const makeRequest = () => new NextRequest("http://localhost/api/seasons");

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

  it("200: 시즌 목록 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["seasons", mockSeasons]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.seasons).toEqual(mockSeasons);
  });

  it("200: 시즌 없는 경우 빈 배열 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["seasons", []]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.seasons).toEqual([]);
  });

  it("400: DB 에러 시 에러 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["seasons", null, { message: "DB error" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET();
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("DB error");
  });
});

// ─── POST /api/seasons ────────────────────────────────────────────────────────
describe("POST /api/seasons", () => {
  beforeEach(() => vi.clearAllMocks());

  const seasonBody = {
    name: "2025 시즌",
    startDate: "2025-01-01",
    endDate: "2025-12-31",
    isActive: false,
  };

  const newSeason = {
    id: "s3",
    team_id: "team-test-001",
    name: "2025 시즌",
    start_date: "2025-01-01",
    end_date: "2025-12-31",
    is_active: false,
  };

  function makeRequest(body: object) {
    return new NextRequest("http://localhost/api/seasons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("401: 비로그인 접근 거부", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await POST(makeRequest(seasonBody));
    expect(res.status).toBe(401);
  });

  it("403: 팀 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(noTeamSession);
    const res = await POST(makeRequest(seasonBody));
    expect(res.status).toBe(403);
  });

  it("403: MEMBER 권한 — 시즌 생성 거부", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb();
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest(seasonBody));
    expect(res.status).toBe(403);
  });

  it("503: DB 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);
    const res = await POST(makeRequest(seasonBody));
    expect(res.status).toBe(503);
  });

  it("201: STAFF — isActive:false 시즌 생성 성공", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    // isActive false → 1번 insert만
    const db = createMockDb(["seasons", newSeason]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest(seasonBody));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe("s3");
    expect(json.is_active).toBe(false);
  });

  it("201: STAFF — isActive:true 시즌 생성 시 기존 시즌 비활성화 후 생성", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const activeSeason = { ...newSeason, is_active: true };
    // isActive true → deactivate all (update), then insert
    const db = createMockDb(
      ["seasons", null],        // deactivate all existing seasons
      ["seasons", activeSeason] // insert new active season
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest({ ...seasonBody, isActive: true }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.is_active).toBe(true);
  });

  it("400: DB 에러 시 에러 반환", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const db = createMockDb(["seasons", null, { message: "insert failed" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest(seasonBody));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("insert failed");
  });
});

// ─── PUT /api/seasons ─────────────────────────────────────────────────────────
describe("PUT /api/seasons", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeRequest(body: object) {
    return new NextRequest("http://localhost/api/seasons", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("401: 비로그인 접근 거부", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await PUT(makeRequest({ id: "s1" }));
    expect(res.status).toBe(401);
  });

  it("403: 팀 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(noTeamSession);
    const res = await PUT(makeRequest({ id: "s1" }));
    expect(res.status).toBe(403);
  });

  it("403: MEMBER 권한 — 시즌 활성화 거부", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb();
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makeRequest({ id: "s1" }));
    expect(res.status).toBe(403);
  });

  it("400: id 누락", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const db = createMockDb();
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makeRequest({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("id");
  });

  it("503: DB 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);
    const res = await PUT(makeRequest({ id: "s1" }));
    expect(res.status).toBe(503);
  });

  it("200: STAFF — 시즌 활성화 성공 (전체 비활성화 후 선택 활성화)", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    // deactivate all → activate selected
    const db = createMockDb(
      ["seasons", null], // deactivate all
      ["seasons", null]  // activate s1
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makeRequest({ id: "s1" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("400: 활성화 DB 에러 시 에러 반환", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const db = createMockDb(
      ["seasons", null],                              // deactivate all — ok
      ["seasons", null, { message: "update failed" }] // activate — error
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makeRequest({ id: "s1" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("update failed");
  });
});
