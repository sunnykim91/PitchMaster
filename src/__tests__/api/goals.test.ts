import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST, PUT, DELETE } from "@/app/api/goals/route";
import { createMockDb } from "../helpers/db";
import { memberSession, staffSession, noTeamSession } from "../helpers/auth";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: vi.fn() }));

import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const mockGoals = [
  { id: "g1", match_id: "m1", quarter_number: 1, minute: 10, scorer_id: "u1", assist_id: null, is_own_goal: false },
  { id: "g2", match_id: "m1", quarter_number: 2, minute: 30, scorer_id: "u2", assist_id: "u1", is_own_goal: false },
];

// ─── GET /api/goals ───────────────────────────────────────────────────────────
describe("GET /api/goals", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeRequest(matchId?: string) {
    const url = matchId
      ? `http://localhost/api/goals?matchId=${matchId}`
      : "http://localhost/api/goals";
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

  it("200: 골 목록 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["matches", { id: "m1" }], ["match_goals", mockGoals]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET(makeRequest("m1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.goals).toEqual(mockGoals);
  });

  it("400: DB 에러 발생시 에러 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["matches", { id: "m1" }], ["match_goals", null, { message: "DB connection failed" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET(makeRequest("m1"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("DB connection failed");
  });
});

// ─── POST /api/goals ──────────────────────────────────────────────────────────
describe("POST /api/goals", () => {
  beforeEach(() => vi.clearAllMocks());

  const goalBody = {
    matchId: "m1",
    quarter: 1,
    minute: 15,
    scorerId: "u1",
    assistId: "u2",
    isOwnGoal: false,
  };

  function makeRequest(body: object) {
    return new NextRequest("http://localhost/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("401: 로그인하지 않은 경우", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await POST(makeRequest(goalBody));
    expect(res.status).toBe(401);
  });

  it("403: 팀이 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(noTeamSession);
    const res = await POST(makeRequest(goalBody));
    expect(res.status).toBe(403);
  });

  it("503: DB 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);
    const res = await POST(makeRequest(goalBody));
    expect(res.status).toBe(503);
  });

  it("201: 골 기록 생성 성공", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const newGoal = { id: "g-new", match_id: "m1", quarter_number: 1, minute: 15, scorer_id: "u1" };
    const db = createMockDb(["matches", { id: "m1" }], ["match_goals", newGoal]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest(goalBody));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe("g-new");
  });

  it("400: DB 에러 시 에러 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["matches", { id: "m1" }], ["match_goals", null, { message: "insert failed" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest(goalBody));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("insert failed");
  });
});

// ─── PUT /api/goals ───────────────────────────────────────────────────────────
describe("PUT /api/goals", () => {
  beforeEach(() => vi.clearAllMocks());

  const updateBody = {
    id: "g1",
    quarter: 2,
    minute: 20,
    scorerId: "u1",
    assistId: null,
    isOwnGoal: false,
  };

  function makeRequest(body: object) {
    return new NextRequest("http://localhost/api/goals", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("401: 로그인하지 않은 경우", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await PUT(makeRequest(updateBody));
    expect(res.status).toBe(401);
  });

  it("403: 팀이 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(noTeamSession);
    const res = await PUT(makeRequest(updateBody));
    expect(res.status).toBe(403);
  });

  it("400: id 누락", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb();
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makeRequest({ quarter: 2, minute: 20 }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("id");
  });

  it("503: DB 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);
    const res = await PUT(makeRequest(updateBody));
    expect(res.status).toBe(503);
  });

  it("200: 골 수정 성공 — 업데이트된 골 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const updatedGoal = { id: "g1", match_id: "m1", quarter_number: 2, minute: 20, scorer_id: "u1" };
    // First match_goals call: goalCheck, second: update result
    const db = createMockDb(["match_goals", { id: "g1" }], ["match_goals", updatedGoal]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makeRequest(updateBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe("g1");
    expect(json.quarter_number).toBe(2);
  });

  it("400: DB 에러 시 에러 반환", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    // First match_goals call: goalCheck succeeds, second: update fails
    const db = createMockDb(["match_goals", { id: "g1" }], ["match_goals", null, { message: "update failed" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makeRequest(updateBody));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("update failed");
  });
});

// ─── DELETE /api/goals ────────────────────────────────────────────────────────
describe("DELETE /api/goals", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeRequest(id?: string) {
    const url = id
      ? `http://localhost/api/goals?id=${id}`
      : "http://localhost/api/goals";
    return new NextRequest(url, { method: "DELETE" });
  }

  it("401: 로그인하지 않은 경우", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await DELETE(makeRequest("g1"));
    expect(res.status).toBe(401);
  });

  it("403: 팀이 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(noTeamSession);
    const res = await DELETE(makeRequest("g1"));
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
    const res = await DELETE(makeRequest("g1"));
    expect(res.status).toBe(503);
  });

  it("200: 골 삭제 성공", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    // First match_goals call: goalCheck, second: delete (no data returned)
    const db = createMockDb(["match_goals", { id: "g1" }], ["match_goals", null]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await DELETE(makeRequest("g1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("400: DB 에러 시 에러 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    // First match_goals call: goalCheck succeeds, second: delete fails
    const db = createMockDb(["match_goals", { id: "g1" }], ["match_goals", null, { message: "delete failed" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await DELETE(makeRequest("g1"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("delete failed");
  });
});

// ─── 팀 설정: stats_recording_staff_only 권한 게이트 ────────────────────────────
describe("/api/goals — stats_recording_staff_only 권한 게이트", () => {
  beforeEach(() => vi.clearAllMocks());

  const goalBody = {
    matchId: "m1",
    quarter: 1,
    minute: 15,
    scorerId: "u1",
    assistId: null,
    isOwnGoal: false,
  };

  it("POST 403: 토글 ON + MEMBER 는 차단", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(
      ["teams", { stats_recording_staff_only: true }],
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const req = new NextRequest("http://localhost/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(goalBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain("운영진");
  });

  it("POST 201: 토글 ON + STAFF 는 허용", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const newGoal = { id: "g-new", match_id: "m1" };
    const db = createMockDb(
      ["teams", { stats_recording_staff_only: true }],
      ["matches", { id: "m1" }],
      ["match_goals", newGoal],
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const req = new NextRequest("http://localhost/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(goalBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it("POST 201: 토글 OFF + MEMBER 는 기존대로 허용", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const newGoal = { id: "g-new", match_id: "m1" };
    const db = createMockDb(
      ["teams", { stats_recording_staff_only: false }],
      ["matches", { id: "m1" }],
      ["match_goals", newGoal],
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const req = new NextRequest("http://localhost/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(goalBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it("PUT 403: 토글 ON + MEMBER 는 차단", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(
      ["teams", { stats_recording_staff_only: true }],
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const req = new NextRequest("http://localhost/api/goals", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "g1", quarter: 1, minute: 5, scorerId: "u1" }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(403);
  });

  it("DELETE 403: 토글 ON + MEMBER 는 차단", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(
      ["teams", { stats_recording_staff_only: true }],
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const req = new NextRequest("http://localhost/api/goals?id=g1", {
      method: "DELETE",
    });
    const res = await DELETE(req);
    expect(res.status).toBe(403);
  });
});
