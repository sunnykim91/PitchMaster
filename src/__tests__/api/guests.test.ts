import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST, DELETE } from "@/app/api/guests/route";
import { createMockDb } from "../helpers/db";
import { memberSession, staffSession, noTeamSession } from "../helpers/auth";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: vi.fn() }));

import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const mockGuests = [
  { id: "gu1", match_id: "m1", name: "게스트A", position: "FW", phone: "010-0000-0001", note: null },
  { id: "gu2", match_id: "m1", name: "게스트B", position: null, phone: null, note: "지인" },
];

// ─── GET /api/guests ──────────────────────────────────────────────────────────
describe("GET /api/guests", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeRequest(matchId?: string) {
    const url = matchId
      ? `http://localhost/api/guests?matchId=${matchId}`
      : "http://localhost/api/guests";
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

  it("200: 게스트 목록 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["match_guests", mockGuests]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET(makeRequest("m1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.guests).toEqual(mockGuests);
  });

  it("200: 게스트 없으면 빈 배열 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["match_guests", []]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET(makeRequest("m1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.guests).toEqual([]);
  });

  it("400: DB 에러 발생시 에러 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["match_guests", null, { message: "query failed" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET(makeRequest("m1"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("query failed");
  });
});

// ─── POST /api/guests ─────────────────────────────────────────────────────────
describe("POST /api/guests", () => {
  beforeEach(() => vi.clearAllMocks());

  const guestBody = {
    matchId: "m1",
    name: "게스트C",
    position: "MF",
    phone: "010-1234-5678",
    note: "팀장 지인",
  };

  function makeRequest(body: object) {
    return new NextRequest("http://localhost/api/guests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("401: 로그인하지 않은 경우", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await POST(makeRequest(guestBody));
    expect(res.status).toBe(401);
  });

  it("403: 팀이 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(noTeamSession);
    const res = await POST(makeRequest(guestBody));
    expect(res.status).toBe(403);
  });

  it("503: DB 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);
    const res = await POST(makeRequest(guestBody));
    expect(res.status).toBe(503);
  });

  it("201: 게스트 등록 성공", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const newGuest = { id: "gu-new", match_id: "m1", name: "게스트C", position: "MF" };
    const db = createMockDb(["match_guests", newGuest]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest(guestBody));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe("gu-new");
    expect(json.name).toBe("게스트C");
  });

  it("201: STAFF — 게스트 등록 성공", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const newGuest = { id: "gu-staff", match_id: "m1", name: "게스트C" };
    const db = createMockDb(["match_guests", newGuest]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest(guestBody));
    expect(res.status).toBe(201);
  });

  it("201: 선택 필드 없이 등록 성공", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const newGuest = { id: "gu-min", match_id: "m1", name: "게스트D", position: null, phone: null, note: null };
    const db = createMockDb(["match_guests", newGuest]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest({ matchId: "m1", name: "게스트D" }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.position).toBeNull();
  });

  it("400: DB 에러 시 에러 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["match_guests", null, { message: "insert failed" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest(guestBody));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("insert failed");
  });
});

// ─── DELETE /api/guests ───────────────────────────────────────────────────────
describe("DELETE /api/guests", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeRequest(id?: string) {
    const url = id
      ? `http://localhost/api/guests?id=${id}`
      : "http://localhost/api/guests";
    return new NextRequest(url, { method: "DELETE" });
  }

  it("401: 로그인하지 않은 경우", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await DELETE(makeRequest("gu1"));
    expect(res.status).toBe(401);
  });

  it("403: 팀이 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(noTeamSession);
    const res = await DELETE(makeRequest("gu1"));
    expect(res.status).toBe(403);
  });

  it("400: id 누락", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb();
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await DELETE(makeRequest());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("id");
  });

  it("503: DB 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);
    const res = await DELETE(makeRequest("gu1"));
    expect(res.status).toBe(503);
  });

  it("200: 게스트 삭제 성공", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["match_guests", null]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await DELETE(makeRequest("gu1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.deleted).toBe(true);
  });

  it("400: DB 에러 시 에러 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["match_guests", null, { message: "delete failed" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await DELETE(makeRequest("gu1"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("delete failed");
  });
});
