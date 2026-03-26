import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createMockDb } from "../helpers/db";
import { memberSession, staffSession, presidentSession, noTeamSession } from "../helpers/auth";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: vi.fn() }));

import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { GET, POST } from "@/app/api/squads/route";

// ─── GET /api/squads ──────────────────────────────────────────────────────────
describe("GET /api/squads", () => {
  beforeEach(() => vi.clearAllMocks());

  const squadData = [
    { id: "sq-1", match_id: "m1", quarter_number: 1, formation: "4-3-3", positions: [] },
    { id: "sq-2", match_id: "m1", quarter_number: 2, formation: "4-4-2", positions: [] },
  ];

  function makeRequest(params?: Record<string, string>) {
    const url = new URL("http://localhost/api/squads");
    if (params) {
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    }
    return new NextRequest(url);
  }

  it("401: 비로그인 접근 거부", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await GET(makeRequest({ matchId: "m1" }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("403: 팀 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(noTeamSession);
    const res = await GET(makeRequest({ matchId: "m1" }));
    expect(res.status).toBe(403);
  });

  it("400: matchId 누락 시 에러", async () => {
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

    const res = await GET(makeRequest({ matchId: "m1" }));
    expect(res.status).toBe(503);
  });

  it("200: MEMBER — 스쿼드 목록 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["match_squads", squadData]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET(makeRequest({ matchId: "m1" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.squads).toEqual(squadData);
  });

  it("200: STAFF — 스쿼드 목록 반환", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const db = createMockDb(["match_squads", squadData]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET(makeRequest({ matchId: "m1" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.squads).toEqual(squadData);
  });

  it("200: 스쿼드 없으면 빈 배열 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["match_squads", []]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET(makeRequest({ matchId: "m-empty" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.squads).toEqual([]);
  });

  it("400: DB 에러 시 에러 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["match_squads", null, { message: "query error" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET(makeRequest({ matchId: "m1" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("query error");
  });
});

// ─── POST /api/squads ─────────────────────────────────────────────────────────
describe("POST /api/squads", () => {
  beforeEach(() => vi.clearAllMocks());

  const squadBody = {
    matchId: "m1",
    quarterNumber: 1,
    formation: "4-3-3",
    positions: [{ position: "FW", memberId: "mem-1" }],
  };

  function makeRequest(body: object) {
    return new NextRequest("http://localhost/api/squads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("401: 비로그인 접근 거부", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await POST(makeRequest(squadBody));
    expect(res.status).toBe(401);
  });

  it("403: 팀 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(noTeamSession);
    const res = await POST(makeRequest(squadBody));
    expect(res.status).toBe(403);
  });

  it("403: MEMBER 권한 — 스쿼드 편집 불가", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const res = await POST(makeRequest(squadBody));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("Insufficient permissions");
  });

  it("503: DB 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);

    const res = await POST(makeRequest(squadBody));
    expect(res.status).toBe(503);
  });

  it("200: STAFF — 스쿼드 저장 성공", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const savedSquad = { id: "sq-1", match_id: "m1", quarter_number: 1, formation: "4-3-3" };
    const db = createMockDb(
      ["match_squads", null],        // delete (기존 삭제)
      ["match_squads", savedSquad],  // insert (새로 저장)
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest(squadBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.match_id).toBe("m1");
  });

  it("200: PRESIDENT — 스쿼드 저장 성공", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    const savedSquad = { id: "sq-2", match_id: "m1", quarter_number: 2, formation: "4-4-2" };
    const db = createMockDb(
      ["match_squads", null],        // delete
      ["match_squads", savedSquad],  // insert
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest({ ...squadBody, quarterNumber: 2, formation: "4-4-2" }));
    expect(res.status).toBe(200);
  });

  it("400: DB 에러 시 에러 반환", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const db = createMockDb(
      ["match_squads", null],                                    // delete 성공
      ["match_squads", null, { message: "insert failed" }],      // insert 실패
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest(squadBody));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("insert failed");
  });
});
