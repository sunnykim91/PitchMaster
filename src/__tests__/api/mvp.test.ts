import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/mvp/route";
import { createMockDb } from "../helpers/db";
import { memberSession, noTeamSession } from "../helpers/auth";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: vi.fn() }));

import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const mockVotes = [
  { id: "v1", match_id: "m1", voter_id: "u1", candidate_id: "u2", users: { id: "u2", name: "홍길동" } },
];

// ─── GET /api/mvp ─────────────────────────────────────────────────────────────
describe("GET /api/mvp", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeRequest(matchId?: string) {
    const url = matchId
      ? `http://localhost/api/mvp?matchId=${matchId}`
      : "http://localhost/api/mvp";
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

  it("200: 투표 목록 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["match_mvp_votes", mockVotes]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET(makeRequest("m1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.votes).toEqual(mockVotes);
  });

  it("400: DB 에러 발생시 에러 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["match_mvp_votes", null, { message: "DB connection failed" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET(makeRequest("m1"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("DB connection failed");
  });
});

// ─── POST /api/mvp ────────────────────────────────────────────────────────────
describe("POST /api/mvp", () => {
  beforeEach(() => vi.clearAllMocks());

  const voteBody = {
    matchId: "m1",
    candidateId: "u2",
  };

  function makeRequest(body: object) {
    return new NextRequest("http://localhost/api/mvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("401: 로그인하지 않은 경우", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await POST(makeRequest(voteBody));
    expect(res.status).toBe(401);
  });

  it("403: 팀이 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(noTeamSession);
    const res = await POST(makeRequest(voteBody));
    expect(res.status).toBe(403);
  });

  it("400: matchId 누락", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb();
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest({ candidateId: "u2" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("required");
  });

  it("400: candidateId 누락", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb();
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest({ matchId: "m1" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("required");
  });

  it("503: DB 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);
    const res = await POST(makeRequest(voteBody));
    expect(res.status).toBe(503);
  });

  it("403: 해당 경기 미참석자 — 투표 불가", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    // attendance.vote가 ATTEND가 아님
    const db = createMockDb(
      ["match_attendance", { vote: "ABSENT" }]
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest(voteBody));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain("참석자");
  });

  it("403: 출석 기록 없는 경우 — 투표 불가", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    // attendance null (single()이 null 반환)
    const db = createMockDb(
      ["match_attendance", null]
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest(voteBody));
    expect(res.status).toBe(403);
  });

  it("200: 참석자 투표 성공", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const voteData = {
      id: "v-new",
      match_id: "m1",
      voter_id: "user-member-001",
      candidate_id: "u2",
    };
    const db = createMockDb(
      ["match_attendance", { vote: "ATTEND" }],
      ["match_mvp_votes", voteData]
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest(voteBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe("v-new");
    expect(json.candidate_id).toBe("u2");
  });

  it("200: 기존 투표 upsert — 후보 변경 성공", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const updatedVote = {
      id: "v-existing",
      match_id: "m1",
      voter_id: "user-member-001",
      candidate_id: "u3",
    };
    const db = createMockDb(
      ["match_attendance", { vote: "ATTEND" }],
      ["match_mvp_votes", updatedVote]
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest({ matchId: "m1", candidateId: "u3" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.candidate_id).toBe("u3");
  });

  it("400: 투표 DB 에러 시 에러 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(
      ["match_attendance", { vote: "ATTEND" }],
      ["match_mvp_votes", null, { message: "upsert failed" }]
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest(voteBody));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("upsert failed");
  });
});
