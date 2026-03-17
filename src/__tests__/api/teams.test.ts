import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createMockDb } from "../helpers/db";
import { memberSession, staffSession, presidentSession, noTeamSession } from "../helpers/auth";

vi.mock("@/lib/auth", () => ({ auth: vi.fn(), updateSession: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: vi.fn() }));

import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const mockTeam = {
  id: "team-test-001",
  name: "테스트 FC",
  logo_url: null,
  invite_code: "INVITE123",
  invite_expires_at: null,
  join_mode: "INVITE",
  uniform_primary: "#FF0000",
  uniform_secondary: "#FFFFFF",
  uniform_pattern: "SOLID",
};

// ─── GET /api/teams ────────────────────────────────────────────────────────────
describe("GET /api/teams", () => {
  beforeEach(() => vi.clearAllMocks());

  // lazy import to allow vi.mock to take effect
  async function getHandler() {
    const { GET } = await import("@/app/api/teams/route");
    return GET;
  }

  it("401: 로그인하지 않은 경우", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const GET = await getHandler();
    const res = await GET();
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("403: 팀이 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(noTeamSession);
    const GET = await getHandler();
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("503: DB 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);
    const GET = await getHandler();
    const res = await GET();
    expect(res.status).toBe(503);
  });

  it("200: 팀 정보 반환 성공", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["teams", mockTeam]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);
    const GET = await getHandler();
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.team).toEqual(mockTeam);
  });

  it("404: DB 에러 또는 팀 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["teams", null, { message: "not found" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);
    const GET = await getHandler();
    const res = await GET();
    expect(res.status).toBe(404);
  });
});

// ─── PUT /api/teams ────────────────────────────────────────────────────────────
describe("PUT /api/teams", () => {
  beforeEach(() => vi.clearAllMocks());

  async function getHandler() {
    const { PUT } = await import("@/app/api/teams/route");
    return PUT;
  }

  function makeRequest(body: object) {
    return new NextRequest("http://localhost/api/teams", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("401: 로그인하지 않은 경우", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const PUT = await getHandler();
    const res = await PUT(makeRequest({ name: "새 팀명" }));
    expect(res.status).toBe(401);
  });

  it("403: 팀이 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(noTeamSession);
    const PUT = await getHandler();
    const res = await PUT(makeRequest({ name: "새 팀명" }));
    expect(res.status).toBe(403);
  });

  it("403: MEMBER 권한 — 팀 설정 변경 불가", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const PUT = await getHandler();
    const res = await PUT(makeRequest({ name: "새 팀명" }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("Insufficient permissions");
  });

  it("403: STAFF 권한 — 팀 설정 변경 불가", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const PUT = await getHandler();
    const res = await PUT(makeRequest({ name: "새 팀명" }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("Insufficient permissions");
  });

  it("503: DB 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);
    const PUT = await getHandler();
    const res = await PUT(makeRequest({ name: "새 팀명" }));
    expect(res.status).toBe(503);
  });

  it("200: PRESIDENT 권한 — 팀 이름 변경 성공", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    const db = createMockDb(["teams", { id: "team-test-001", name: "새 팀명" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);
    const PUT = await getHandler();
    const res = await PUT(makeRequest({ name: "새 팀명" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("200: PRESIDENT 권한 — 유니폼 설정 변경 성공", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    const db = createMockDb(["teams", { id: "team-test-001" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);
    const PUT = await getHandler();
    const res = await PUT(
      makeRequest({ uniformPrimary: "#0000FF", uniformSecondary: "#FFFF00", uniformPattern: "STRIPE" })
    );
    expect(res.status).toBe(200);
  });

  it("400: DB 에러 시 에러 반환", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    const db = createMockDb(["teams", null, { message: "update failed" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);
    const PUT = await getHandler();
    const res = await PUT(makeRequest({ name: "새 팀명" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("update failed");
  });
});

// ─── DELETE /api/teams ─────────────────────────────────────────────────────────
describe("DELETE /api/teams", () => {
  beforeEach(() => vi.clearAllMocks());

  async function getHandler() {
    const { DELETE } = await import("@/app/api/teams/route");
    return DELETE;
  }

  it("401: 로그인하지 않은 경우", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const DELETE = await getHandler();
    const res = await DELETE();
    expect(res.status).toBe(401);
  });

  it("403: 팀이 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(noTeamSession);
    const DELETE = await getHandler();
    const res = await DELETE();
    expect(res.status).toBe(403);
  });

  it("403: MEMBER 권한 — 팀 삭제 불가", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const DELETE = await getHandler();
    const res = await DELETE();
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("Insufficient permissions");
  });

  it("403: STAFF 권한 — 팀 삭제 불가", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const DELETE = await getHandler();
    const res = await DELETE();
    expect(res.status).toBe(403);
  });

  it("503: DB 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);
    const DELETE = await getHandler();
    const res = await DELETE();
    expect(res.status).toBe(503);
  });

  it("200: PRESIDENT 권한 — 팀 삭제 성공", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    const db = createMockDb(["teams", null]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);
    const DELETE = await getHandler();
    const res = await DELETE();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("400: DB 에러 시 에러 반환", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    const db = createMockDb(["teams", null, { message: "delete failed" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);
    const DELETE = await getHandler();
    const res = await DELETE();
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("delete failed");
  });
});

// ─── GET /api/teams/check-name ─────────────────────────────────────────────────
describe("GET /api/teams/check-name", () => {
  beforeEach(() => vi.clearAllMocks());

  async function getHandler() {
    const { GET } = await import("@/app/api/teams/check-name/route");
    return GET;
  }

  it("name 파라미터 없으면 available: false 반환", async () => {
    const GET = await getHandler();
    const res = await GET(new NextRequest("http://localhost/api/teams/check-name"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.available).toBe(false);
    expect(json.error).toBe("이름을 입력해주세요");
  });

  it("503: DB 없는 경우", async () => {
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);
    const GET = await getHandler();
    const res = await GET(
      new NextRequest("http://localhost/api/teams/check-name?name=테스트FC")
    );
    expect(res.status).toBe(503);
  });

  it("available: false — 같은 이름의 팀이 이미 존재하는 경우", async () => {
    const db = createMockDb(["teams", { id: "existing-team-id" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);
    const GET = await getHandler();
    const res = await GET(
      new NextRequest("http://localhost/api/teams/check-name?name=테스트FC")
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.available).toBe(false);
  });

  it("available: true — 사용 가능한 팀 이름인 경우", async () => {
    const db = createMockDb(["teams", null]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);
    const GET = await getHandler();
    const res = await GET(
      new NextRequest("http://localhost/api/teams/check-name?name=신규팀FC")
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.available).toBe(true);
  });

  it("공백만 있는 name은 빈 값으로 처리", async () => {
    const GET = await getHandler();
    const res = await GET(
      new NextRequest("http://localhost/api/teams/check-name?name=   ")
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.available).toBe(false);
    expect(json.error).toBe("이름을 입력해주세요");
  });
});

// ─── GET /api/teams/my-teams ───────────────────────────────────────────────────
describe("GET /api/teams/my-teams", () => {
  beforeEach(() => vi.clearAllMocks());

  async function getHandler() {
    const { GET } = await import("@/app/api/teams/my-teams/route");
    return GET;
  }

  const mockTeamMemberships = [
    {
      team_id: "team-test-001",
      role: "MEMBER",
      teams: { id: "team-test-001", name: "테스트 FC", invite_code: "INVITE123" },
    },
    {
      team_id: "team-other-001",
      role: "STAFF",
      teams: { id: "team-other-001", name: "다른 팀 FC", invite_code: "OTHER456" },
    },
  ];

  it("401: 로그인하지 않은 경우", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const GET = await getHandler();
    const res = await GET();
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("503: DB 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);
    const GET = await getHandler();
    const res = await GET();
    expect(res.status).toBe(503);
  });

  it("200: 소속 팀 목록 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["team_members", mockTeamMemberships]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);
    const GET = await getHandler();
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.teams).toHaveLength(2);
    expect(json.teams[0].id).toBe("team-test-001");
    expect(json.teams[0].name).toBe("테스트 FC");
    expect(json.teams[0].role).toBe("MEMBER");
  });

  it("200: 현재 팀에 isCurrent: true 표시", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession); // teamId: "team-test-001"
    const db = createMockDb(["team_members", mockTeamMemberships]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);
    const GET = await getHandler();
    const res = await GET();
    const json = await res.json();
    const currentTeam = json.teams.find((t: { id: string }) => t.id === "team-test-001");
    const otherTeam = json.teams.find((t: { id: string }) => t.id === "team-other-001");
    expect(currentTeam.isCurrent).toBe(true);
    expect(otherTeam.isCurrent).toBe(false);
  });

  it("200: 소속 팀 없으면 빈 배열 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["team_members", []]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);
    const GET = await getHandler();
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.teams).toEqual([]);
  });

  it("400: DB 에러 시 에러 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["team_members", null, { message: "query failed" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);
    const GET = await getHandler();
    const res = await GET();
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("query failed");
  });
});

// ─── POST /api/teams/my-teams ──────────────────────────────────────────────────
describe("POST /api/teams/my-teams", () => {
  beforeEach(() => vi.clearAllMocks());

  async function getHandler() {
    const { POST } = await import("@/app/api/teams/my-teams/route");
    return POST;
  }

  function makeRequest(body: object) {
    return new NextRequest("http://localhost/api/teams/my-teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  const mockMembership = {
    role: "MEMBER",
    teams: { id: "team-other-001", name: "다른 팀 FC", invite_code: "OTHER456" },
  };

  it("401: 로그인하지 않은 경우", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const POST = await getHandler();
    const res = await POST(makeRequest({ teamId: "team-other-001" }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("400: teamId 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const POST = await getHandler();
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("teamId required");
  });

  it("503: DB 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);
    const POST = await getHandler();
    const res = await POST(makeRequest({ teamId: "team-other-001" }));
    expect(res.status).toBe(503);
  });

  it("403: 해당 팀의 멤버가 아닌 경우", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["team_members", null]); // 멤버십 없음
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);
    const POST = await getHandler();
    const res = await POST(makeRequest({ teamId: "team-unknown-999" }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("Not a member of this team");
  });

  it("200: 팀 전환 성공", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["team_members", mockMembership]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);
    const POST = await getHandler();
    const res = await POST(makeRequest({ teamId: "team-other-001" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.teamName).toBe("다른 팀 FC");
    expect(json.role).toBe("MEMBER");
  });

  it("200: 팀 전환 시 updateSession 호출됨", async () => {
    const { updateSession } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["team_members", mockMembership]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);
    const POST = await getHandler();
    await POST(makeRequest({ teamId: "team-other-001" }));
    expect(vi.mocked(updateSession)).toHaveBeenCalledWith({
      teamId: "team-other-001",
      teamName: "다른 팀 FC",
      teamRole: "MEMBER",
      inviteCode: "OTHER456",
    });
  });
});
