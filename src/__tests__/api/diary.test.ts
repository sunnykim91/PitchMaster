import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/diary/route";
import { createMockDb } from "../helpers/db";
import { memberSession, noTeamSession } from "../helpers/auth";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: vi.fn() }));

import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const mockDiary = {
  id: "d1",
  match_id: "m1",
  weather: "맑음",
  condition: "좋음",
  memo: "좋은 경기였다",
  photos: [],
  created_by: "user-member-001",
  updated_at: "2024-01-01T00:00:00Z",
};

// ─── GET /api/diary ───────────────────────────────────────────────────────────
describe("GET /api/diary", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeRequest(matchId?: string) {
    const url = matchId
      ? `http://localhost/api/diary?matchId=${matchId}`
      : "http://localhost/api/diary";
    return new NextRequest(url);
  }

  it("401: 비로그인 접근 거부", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await GET(makeRequest("m1"));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("403: 팀 없는 경우", async () => {
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

  it("200: 다이어리 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(
      ["matches", { id: "m1" }],
      ["match_diaries", mockDiary],
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET(makeRequest("m1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.diary).toEqual(mockDiary);
  });

  it("200: 다이어리 없는 경우 null 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(
      ["matches", { id: "m1" }],
      ["match_diaries", null],
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET(makeRequest("m1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.diary).toBeNull();
  });

  it("400: DB 에러 시 에러 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(
      ["matches", { id: "m1" }],
      ["match_diaries", null, { message: "DB error" }],
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET(makeRequest("m1"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("DB error");
  });
});

// ─── POST /api/diary ──────────────────────────────────────────────────────────
describe("POST /api/diary", () => {
  beforeEach(() => vi.clearAllMocks());

  const diaryBody = {
    matchId: "m1",
    weather: "맑음",
    condition: "좋음",
    memo: "좋은 경기였다",
    photos: [],
  };

  function makeRequest(body: object) {
    return new NextRequest("http://localhost/api/diary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("401: 비로그인 접근 거부", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await POST(makeRequest(diaryBody));
    expect(res.status).toBe(401);
  });

  it("403: 팀 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(noTeamSession);
    const res = await POST(makeRequest(diaryBody));
    expect(res.status).toBe(403);
  });

  it("503: DB 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);
    const res = await POST(makeRequest(diaryBody));
    expect(res.status).toBe(503);
  });

  it("201: 다이어리 upsert 성공", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(
      ["matches", { id: "m1" }],
      ["match_diaries", mockDiary],
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest(diaryBody));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe("d1");
    expect(json.match_id).toBe("m1");
  });

  it("201: 선택적 필드 없이도 저장 가능", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const minimalDiary = { id: "d2", match_id: "m1", weather: null, condition: null, memo: null, photos: [] };
    const db = createMockDb(
      ["matches", { id: "m1" }],
      ["match_diaries", minimalDiary],
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest({ matchId: "m1" }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.match_id).toBe("m1");
  });

  it("400: DB 에러 시 에러 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(
      ["matches", { id: "m1" }],
      ["match_diaries", null, { message: "upsert failed" }],
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest(diaryBody));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("upsert failed");
  });
});
