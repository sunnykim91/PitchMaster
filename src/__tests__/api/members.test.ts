import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createMockDb } from "../helpers/db";
import { memberSession, staffSession, presidentSession, noTeamSession } from "../helpers/auth";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: vi.fn() }));

import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { GET, POST, PUT, DELETE } from "@/app/api/members/route";

// ─── GET /api/members ─────────────────────────────────────────────────────────
describe("GET /api/members", () => {
  beforeEach(() => vi.clearAllMocks());

  const memberRows = [
    { id: "mem-1", user_id: "user-1", role: "MEMBER", status: "ACTIVE", users: { id: "user-1", name: "홍길동", preferred_positions: ["FW"] } },
    { id: "mem-2", user_id: "user-2", role: "STAFF", status: "ACTIVE", users: { id: "user-2", name: "김철수", preferred_positions: ["MF"] } },
  ];

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

  it("200: MEMBER — 멤버 목록 + isStaff=false 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["team_members", memberRows]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.members).toEqual(memberRows);
    expect(json.isStaff).toBe(false);
  });

  it("200: STAFF — 멤버 목록 + isStaff=true 반환", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const db = createMockDb(["team_members", memberRows]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.isStaff).toBe(true);
  });

  it("200: PRESIDENT — isStaff=true 반환", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    const db = createMockDb(["team_members", memberRows]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.isStaff).toBe(true);
  });

  it("400: DB 에러 시 에러 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["team_members", null, { message: "DB error" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET();
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("DB error");
  });
});

// ─── POST /api/members ────────────────────────────────────────────────────────
describe("POST /api/members", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeRequest(body: object) {
    return new NextRequest("http://localhost/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("401: 비로그인 접근 거부", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await POST(makeRequest({ action: "pre_register", name: "테스터" }));
    expect(res.status).toBe(401);
  });

  it("403: MEMBER 권한 — 접근 거부", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const res = await POST(makeRequest({ action: "pre_register", name: "테스터" }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("Insufficient permissions");
  });

  it("403: STAFF 권한 — 접근 거부", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const res = await POST(makeRequest({ action: "pre_register", name: "테스터" }));
    expect(res.status).toBe(403);
  });

  // pre_register
  describe("action: pre_register", () => {
    it("400: name 누락 시 에러", async () => {
      vi.mocked(auth).mockResolvedValue(presidentSession);
      const db = createMockDb();
      vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

      const res = await POST(makeRequest({ action: "pre_register" }));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("이름");
    });

    it("400: name이 빈 문자열인 경우 에러", async () => {
      vi.mocked(auth).mockResolvedValue(presidentSession);
      const db = createMockDb();
      vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

      const res = await POST(makeRequest({ action: "pre_register", name: "  " }));
      expect(res.status).toBe(400);
    });

    it("201: PRESIDENT — 사전 등록 성공 (phone 포함)", async () => {
      vi.mocked(auth).mockResolvedValue(presidentSession);
      const newMember = { id: "mem-new", pre_name: "신규회원", pre_phone: "01012345678", user_id: null };
      const db = createMockDb(["team_members", newMember]);
      vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

      const res = await POST(makeRequest({ action: "pre_register", name: "신규회원", phone: "010-1234-5678" }));
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.pre_name).toBe("신규회원");
    });

    it("201: PRESIDENT — 사전 등록 성공 (phone 없음)", async () => {
      vi.mocked(auth).mockResolvedValue(presidentSession);
      const newMember = { id: "mem-new2", pre_name: "이름만", pre_phone: null, user_id: null };
      const db = createMockDb(["team_members", newMember]);
      vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

      const res = await POST(makeRequest({ action: "pre_register", name: "이름만" }));
      expect(res.status).toBe(201);
    });

    it("503: DB 없는 경우", async () => {
      vi.mocked(auth).mockResolvedValue(presidentSession);
      vi.mocked(getSupabaseAdmin).mockReturnValue(null);

      const res = await POST(makeRequest({ action: "pre_register", name: "테스터" }));
      expect(res.status).toBe(503);
    });
  });

  // link
  describe("action: link", () => {
    it("400: memberId 누락 시 에러", async () => {
      vi.mocked(auth).mockResolvedValue(presidentSession);
      const db = createMockDb();
      vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

      const res = await POST(makeRequest({ action: "link", userId: "user-1" }));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("memberId");
    });

    it("400: userId 누락 시 에러", async () => {
      vi.mocked(auth).mockResolvedValue(presidentSession);
      const db = createMockDb();
      vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

      const res = await POST(makeRequest({ action: "link", memberId: "mem-1" }));
      expect(res.status).toBe(400);
    });

    it("200: PRESIDENT — 멤버 연동 성공 (기존 row 삭제 후 update)", async () => {
      vi.mocked(auth).mockResolvedValue(presidentSession);
      // 2 calls to team_members: delete (first), update (second)
      const db = createMockDb(
        ["team_members", null], // delete call
        ["team_members", null]  // update call
      );
      vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

      const res = await POST(makeRequest({ action: "link", memberId: "mem-1", userId: "user-1" }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
    });

    it("400: DB 에러 시 에러 반환", async () => {
      vi.mocked(auth).mockResolvedValue(presidentSession);
      const db = createMockDb(
        ["team_members", null], // delete call (no error)
        ["team_members", null, { message: "update failed" }] // update call (error)
      );
      vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

      const res = await POST(makeRequest({ action: "link", memberId: "mem-1", userId: "user-1" }));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("update failed");
    });

    it("503: DB 없는 경우", async () => {
      vi.mocked(auth).mockResolvedValue(presidentSession);
      vi.mocked(getSupabaseAdmin).mockReturnValue(null);

      const res = await POST(makeRequest({ action: "link", memberId: "mem-1", userId: "user-1" }));
      expect(res.status).toBe(503);
    });
  });

  // unknown action
  it("400: 알 수 없는 action", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    const db = createMockDb();
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest({ action: "unknown_action" }));
    expect(res.status).toBe(400);
  });
});

// ─── PUT /api/members ─────────────────────────────────────────────────────────
describe("PUT /api/members", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeRequest(body: object) {
    return new NextRequest("http://localhost/api/members", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("401: 비로그인 접근 거부", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await PUT(makeRequest({ memberId: "mem-1", role: "STAFF" }));
    expect(res.status).toBe(401);
  });

  it("403: MEMBER 권한 — 접근 거부", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const res = await PUT(makeRequest({ memberId: "mem-1", role: "STAFF" }));
    expect(res.status).toBe(403);
  });

  it("403: STAFF 권한 — 접근 거부", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const res = await PUT(makeRequest({ memberId: "mem-1", role: "STAFF" }));
    expect(res.status).toBe(403);
  });

  it("400: memberId 누락 시 에러", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    const db = createMockDb();
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makeRequest({ role: "STAFF" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("memberId");
  });

  it("400: role 누락 시 에러", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    const db = createMockDb();
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makeRequest({ memberId: "mem-1" }));
    expect(res.status).toBe(400);
  });

  it("503: DB 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);

    const res = await PUT(makeRequest({ memberId: "mem-1", role: "STAFF" }));
    expect(res.status).toBe(503);
  });

  it("200: PRESIDENT — 역할 변경 성공", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    const db = createMockDb(
      ["team_members", { user_id: "other-user" }], // self-check select
      ["team_members", null],                        // update
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makeRequest({ memberId: "mem-1", role: "STAFF" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("400: 자기 자신 역할 변경 차단", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    const db = createMockDb(
      ["team_members", { user_id: presidentSession.user.id }], // self-check: 본인
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makeRequest({ memberId: "mem-1", role: "STAFF" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("자신의 역할");
  });

  it("400: 유효하지 않은 역할 값 거부", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    const db = createMockDb();
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makeRequest({ memberId: "mem-1", role: "ADMIN" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("유효하지 않은");
  });

  it("200: 회장 이임 — 대상을 PRESIDENT로, 기존 회장을 STAFF로", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    const db = createMockDb(
      ["team_members", { user_id: "other-user" }], // self-check select
      ["team_members", null],                        // demote current president
      ["team_members", null],                        // promote target
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makeRequest({ memberId: "mem-1", role: "PRESIDENT" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("400: DB 에러 시 에러 반환", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    const db = createMockDb(
      ["team_members", { user_id: "other-user" }],              // self-check select
      ["team_members", null, { message: "update failed" }],     // update error
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makeRequest({ memberId: "mem-1", role: "STAFF" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("update failed");
  });

  // ─── action: update_dues_type ─────────────────────────────────────────────
  describe("action: update_dues_type", () => {
    it("400: memberId 누락 시 에러", async () => {
      vi.mocked(auth).mockResolvedValue(presidentSession);
      const db = createMockDb();
      vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

      const res = await PUT(makeRequest({ action: "update_dues_type", duesType: "REGULAR" }));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("memberId");
    });

    it("503: DB 없는 경우", async () => {
      vi.mocked(auth).mockResolvedValue(presidentSession);
      vi.mocked(getSupabaseAdmin).mockReturnValue(null);

      const res = await PUT(makeRequest({ action: "update_dues_type", memberId: "mem-1", duesType: "REGULAR" }));
      expect(res.status).toBe(503);
    });

    it("200: 회비 유형 변경 성공", async () => {
      vi.mocked(auth).mockResolvedValue(presidentSession);
      const db = createMockDb(["team_members", null]);
      vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

      const res = await PUT(makeRequest({ action: "update_dues_type", memberId: "mem-1", duesType: "REGULAR" }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
    });

    it("200: duesType 미전달 시 null로 설정", async () => {
      vi.mocked(auth).mockResolvedValue(presidentSession);
      const db = createMockDb(["team_members", null]);
      vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

      const res = await PUT(makeRequest({ action: "update_dues_type", memberId: "mem-1" }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
    });

    it("400: DB 에러 시 에러 반환", async () => {
      vi.mocked(auth).mockResolvedValue(presidentSession);
      const db = createMockDb(["team_members", null, { message: "dues update failed" }]);
      vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

      const res = await PUT(makeRequest({ action: "update_dues_type", memberId: "mem-1", duesType: "REGULAR" }));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("dues update failed");
    });
  });

  // ─── action: bulk_update_dues_type ────────────────────────────────────────
  describe("action: bulk_update_dues_type", () => {
    it("400: updates 누락 시 에러", async () => {
      vi.mocked(auth).mockResolvedValue(presidentSession);
      const db = createMockDb();
      vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

      const res = await PUT(makeRequest({ action: "bulk_update_dues_type" }));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("updates");
    });

    it("400: updates 빈 배열 시 에러", async () => {
      vi.mocked(auth).mockResolvedValue(presidentSession);
      const db = createMockDb();
      vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

      const res = await PUT(makeRequest({ action: "bulk_update_dues_type", updates: [] }));
      expect(res.status).toBe(400);
    });

    it("503: DB 없는 경우", async () => {
      vi.mocked(auth).mockResolvedValue(presidentSession);
      vi.mocked(getSupabaseAdmin).mockReturnValue(null);

      const res = await PUT(makeRequest({
        action: "bulk_update_dues_type",
        updates: [{ memberId: "mem-1", duesType: "REGULAR" }],
      }));
      expect(res.status).toBe(503);
    });

    it("200: 일괄 회비 유형 변경 성공", async () => {
      vi.mocked(auth).mockResolvedValue(presidentSession);
      const db = createMockDb(
        ["team_members", null],
        ["team_members", null],
        ["team_members", null]
      );
      vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

      const updates = [
        { memberId: "mem-1", duesType: "REGULAR" },
        { memberId: "mem-2", duesType: "HALF" },
        { memberId: "mem-3", duesType: null },
      ];
      const res = await PUT(makeRequest({ action: "bulk_update_dues_type", updates }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.updated).toBe(3);
    });

    it("200: 부분 실패 시 updated 카운트 반영", async () => {
      vi.mocked(auth).mockResolvedValue(presidentSession);
      const db = createMockDb(
        ["team_members", null],
        ["team_members", null, { message: "update failed" }],
        ["team_members", null]
      );
      vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

      const updates = [
        { memberId: "mem-1", duesType: "REGULAR" },
        { memberId: "mem-2", duesType: "HALF" },
        { memberId: "mem-3", duesType: "REGULAR" },
      ];
      const res = await PUT(makeRequest({ action: "bulk_update_dues_type", updates }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.updated).toBe(2);
    });
  });
});

// ─── DELETE /api/members ──────────────────────────────────────────────────────
describe("DELETE /api/members", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeRequest(memberId?: string) {
    const url = memberId
      ? `http://localhost/api/members?memberId=${memberId}`
      : "http://localhost/api/members";
    return new NextRequest(url, { method: "DELETE" });
  }

  it("401: 비로그인 접근 거부", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await DELETE(makeRequest("mem-1"));
    expect(res.status).toBe(401);
  });

  it("403: MEMBER 권한 — 접근 거부", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const res = await DELETE(makeRequest("mem-1"));
    expect(res.status).toBe(403);
  });

  it("403: STAFF 권한 — 접근 거부", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const res = await DELETE(makeRequest("mem-1"));
    expect(res.status).toBe(403);
  });

  it("400: memberId 누락 시 에러", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    const db = createMockDb();
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await DELETE(makeRequest());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("memberId");
  });

  it("503: DB 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);

    const res = await DELETE(makeRequest("mem-1"));
    expect(res.status).toBe(503);
  });

  it("200: PRESIDENT — 멤버 추방(BANNED) 성공", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    const db = createMockDb(["team_members", null]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await DELETE(makeRequest("mem-1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("400: DB 에러 시 에러 반환", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    const db = createMockDb(["team_members", null, { message: "delete failed" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await DELETE(makeRequest("mem-1"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("delete failed");
  });
});
