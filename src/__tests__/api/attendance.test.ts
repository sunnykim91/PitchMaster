import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/attendance/route";
import { createMockDb } from "../helpers/db";
import { memberSession, staffSession, noTeamSession } from "../helpers/auth";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: vi.fn() }));

import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// ─── GET /api/attendance ──────────────────────────────────────────────────────
describe("GET /api/attendance", () => {
  beforeEach(() => vi.clearAllMocks());

  const attendanceData = [
    { match_id: "m1", user_id: "u1", vote: "ATTEND" },
    { match_id: "m1", user_id: "u2", vote: "ABSENT" },
  ];

  function makeRequest(params?: Record<string, string>) {
    const url = new URL("http://localhost/api/attendance");
    if (params) {
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    }
    return new NextRequest(url);
  }

  it("401: 비로그인 접근 거부", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("403: 팀 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(noTeamSession);
    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
  });

  it("200: matchId로 특정 경기 출석 조회", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["match_attendance", attendanceData]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET(makeRequest({ matchId: "m1" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.attendance).toEqual(attendanceData);
  });

  it("200: matchId 없으면 팀 전체 경기 출석 조회", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(
      ["matches", [{ id: "m1" }, { id: "m2" }]],
      ["match_attendance", attendanceData]
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.attendance).toEqual(attendanceData);
  });

  it("200: 경기 없으면 빈 배열 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["matches", []]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.attendance).toEqual([]);
  });
});

// ─── POST /api/attendance ─────────────────────────────────────────────────────
describe("POST /api/attendance", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeRequest(body: object) {
    return new NextRequest("http://localhost/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("401: 비로그인", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await POST(makeRequest({ matchId: "m1", vote: "ATTEND" }));
    expect(res.status).toBe(401);
  });

  it("400: matchId 누락", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb();
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest({ vote: "ATTEND" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("required");
  });

  it("400: vote 누락", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb();
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest({ matchId: "m1" }));
    expect(res.status).toBe(400);
  });

  it("200: 본인 투표 — 마감 전 성공 (신규 레코드)", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);

    // matches: vote_deadline이 미래
    const futureDeadline = new Date(Date.now() + 86400000).toISOString();
    const matchData = { vote_deadline: futureDeadline };
    // team_members: user의 member 레코드
    const memberData = { id: "mem-001" };
    // match_attendance: 기존 기록 없음
    const existingAttendance = null;
    // 최종 insert 결과
    const insertedAttendance = {
      id: "att-001",
      match_id: "m1",
      user_id: "user-member-001",
      vote: "ATTEND",
    };

    const db = createMockDb(
      ["matches", matchData],       // vote_deadline 조회
      ["team_members", memberData], // member_id 조회
      ["match_attendance", existingAttendance], // 기존 기록 확인
      ["match_attendance", insertedAttendance]  // insert 결과
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest({ matchId: "m1", vote: "ATTEND" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.vote).toBe("ATTEND");
  });

  it("400: 본인 투표 — 마감 지난 경우 거부", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);

    const pastDeadline = new Date(Date.now() - 86400000).toISOString();
    const matchData = { vote_deadline: pastDeadline };
    const memberData = { id: "mem-001" };

    const db = createMockDb(
      ["matches", matchData],
      ["team_members", memberData]
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest({ matchId: "m1", vote: "ATTEND" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("마감");
  });

  it("200: 기존 투표 업데이트", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);

    const futureDeadline = new Date(Date.now() + 86400000).toISOString();
    const matchData = { vote_deadline: futureDeadline };
    const memberData = { id: "mem-001" };
    const existingAttendance = { id: "att-existing" };
    const updatedAttendance = {
      id: "att-existing",
      match_id: "m1",
      user_id: "user-member-001",
      vote: "ABSENT",
    };

    const db = createMockDb(
      ["matches", matchData],
      ["team_members", memberData],
      ["match_attendance", existingAttendance],
      ["match_attendance", updatedAttendance]
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest({ matchId: "m1", vote: "ABSENT" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.vote).toBe("ABSENT");
  });

  it("403: 대리 투표 — MEMBER 권한 거부", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);

    // 운영진 권한 확인 쿼리 → MEMBER 반환
    const callerMember = { role: "MEMBER" };
    const db = createMockDb(["team_members", callerMember]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    // targetUserId가 자신과 다름 → 대리 투표
    const res = await POST(
      makeRequest({ matchId: "m1", vote: "ATTEND", targetUserId: "other-user-id" })
    );
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain("권한");
  });

  it("200: 대리 투표 — STAFF 권한 성공", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);

    const callerMember = { role: "STAFF" };
    const targetMember = { id: "mem-target" };
    const existingRecord = null;
    const insertResult = {
      id: "att-proxy",
      match_id: "m1",
      user_id: "target-user",
      vote: "ATTEND",
    };

    const db = createMockDb(
      ["team_members", callerMember],  // 대리 투표 권한 확인
      ["team_members", targetMember],  // target user의 member_id 조회
      ["match_attendance", existingRecord], // 기존 기록 없음
      ["match_attendance", insertResult]    // insert
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(
      makeRequest({ matchId: "m1", vote: "ATTEND", targetUserId: "target-user" })
    );
    expect(res.status).toBe(200);
  });
});
