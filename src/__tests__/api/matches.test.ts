import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/matches/route";
import { createMockDb } from "../helpers/db";
import { memberSession, staffSession, presidentSession, noTeamSession } from "../helpers/auth";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: vi.fn() }));

import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const mockMatches = [
  { id: "m1", match_date: "2025-03-20", status: "SCHEDULED", location: "구장A" },
  { id: "m2", match_date: "2025-02-10", status: "COMPLETED", location: "구장B" },
];

// ─── GET /api/matches ─────────────────────────────────────────────────────────
describe("GET /api/matches", () => {
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

  it("200: 경기 목록 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(
      ["matches", null],          // 1st: auto-complete update (ignored)
      ["matches", mockMatches],   // 2nd: select matches
      ["match_goals", []],        // 3rd: goals for score calc
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.matches).toEqual(mockMatches.map((m: Record<string, unknown>) => ({ ...m, score: null })));
  });

  it("400: DB 에러 발생시 에러 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(
      ["matches", null],                                    // 1st: auto-complete update
      ["matches", null, { message: "DB connection failed" }], // 2nd: select error
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET();
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("DB connection failed");
  });
});

// ─── POST /api/matches ────────────────────────────────────────────────────────
describe("POST /api/matches", () => {
  beforeEach(() => vi.clearAllMocks());

  const matchBody = {
    date: "2025-04-01",
    time: "14:00",
    location: "서울 구장",
    opponent: "FC 상대팀",
    quarterCount: 4,
    quarterDuration: 25,
    breakDuration: 5,
  };

  function makeRequest(body: object) {
    return new NextRequest("http://localhost/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("401: 로그인하지 않은 경우", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await POST(makeRequest(matchBody));
    expect(res.status).toBe(401);
  });

  it("403: MEMBER 권한 — 경기 생성 불가", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const res = await POST(makeRequest(matchBody));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("Insufficient permissions");
  });

  it("201: STAFF — 경기 생성 성공", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const newMatch = { id: "m-new", match_date: "2025-04-01", status: "SCHEDULED" };
    const db = createMockDb(["matches", newMatch]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest(matchBody));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe("m-new");
  });

  it("201: PRESIDENT — 경기 생성 성공", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    const newMatch = { id: "m-new2", match_date: "2025-04-02", status: "SCHEDULED" };
    const db = createMockDb(["matches", newMatch]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest({ ...matchBody, date: "2025-04-02" }));
    expect(res.status).toBe(201);
  });

  it("400: DB 에러 시 에러 반환", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const db = createMockDb(["matches", null, { message: "insert failed" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest(matchBody));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("insert failed");
  });

  it("503: DB 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);

    const res = await POST(makeRequest(matchBody));
    expect(res.status).toBe(503);
  });
});
