import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createMockDb } from "../helpers/db";
import { memberSession, staffSession, presidentSession, noTeamSession } from "../helpers/auth";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: vi.fn() }));

import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { GET, POST, PUT, DELETE } from "@/app/api/penalties/route";

// ─── GET /api/penalties ───────────────────────────────────────────────────────
describe("GET /api/penalties", () => {
  beforeEach(() => vi.clearAllMocks());

  const rulesData = [
    { id: "rule-1", team_id: "team-test-001", name: "지각", amount: 5000 },
    { id: "rule-2", team_id: "team-test-001", name: "결석", amount: 10000 },
  ];

  const recordsData = [
    { id: "rec-1", team_id: "team-test-001", rule_id: "rule-1", member_id: "mem-1", amount: 5000, is_paid: false },
    { id: "rec-2", team_id: "team-test-001", rule_id: "rule-2", member_id: "mem-2", amount: 10000, is_paid: true },
  ];

  function makeRequest(params?: Record<string, string>) {
    const url = new URL("http://localhost/api/penalties");
    if (params) {
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    }
    return new NextRequest(url);
  }

  it("401: 비로그인 접근 거부", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("403: 팀 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(noTeamSession);
    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
  });

  it("503: DB 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);

    const res = await GET(makeRequest());
    expect(res.status).toBe(503);
  });

  describe("type=rules (default)", () => {
    it("200: type 없을 때 규칙 목록 반환", async () => {
      vi.mocked(auth).mockResolvedValue(memberSession);
      const db = createMockDb(["penalty_rules", rulesData]);
      vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

      const res = await GET(makeRequest());
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.rules).toEqual(rulesData);
    });

    it("200: type=rules 일 때 규칙 목록 반환", async () => {
      vi.mocked(auth).mockResolvedValue(memberSession);
      const db = createMockDb(["penalty_rules", rulesData]);
      vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

      const res = await GET(makeRequest({ type: "rules" }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.rules).toEqual(rulesData);
    });

    it("400: DB 에러 시 에러 반환", async () => {
      vi.mocked(auth).mockResolvedValue(memberSession);
      const db = createMockDb(["penalty_rules", null, { message: "rules query failed" }]);
      vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

      const res = await GET(makeRequest());
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("rules query failed");
    });
  });

  describe("type=records", () => {
    it("200: type=records 일 때 기록 목록 반환", async () => {
      vi.mocked(auth).mockResolvedValue(memberSession);
      const db = createMockDb(["penalty_records", recordsData]);
      vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

      const res = await GET(new NextRequest("http://localhost/api/penalties?type=records"));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.records).toEqual(recordsData);
    });

    it("200: STAFF — 기록 목록 반환", async () => {
      vi.mocked(auth).mockResolvedValue(staffSession);
      const db = createMockDb(["penalty_records", recordsData]);
      vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

      const res = await GET(new NextRequest("http://localhost/api/penalties?type=records"));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.records).toEqual(recordsData);
    });

    it("400: DB 에러 시 에러 반환", async () => {
      vi.mocked(auth).mockResolvedValue(memberSession);
      const db = createMockDb(["penalty_records", null, { message: "records query failed" }]);
      vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

      const res = await GET(new NextRequest("http://localhost/api/penalties?type=records"));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("records query failed");
    });
  });
});

// ─── POST /api/penalties ──────────────────────────────────────────────────────
describe("POST /api/penalties", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeRequest(body: object) {
    return new NextRequest("http://localhost/api/penalties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("401: 비로그인 접근 거부", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await POST(makeRequest({ name: "지각", amount: 5000 }));
    expect(res.status).toBe(401);
  });

  it("403: 팀 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(noTeamSession);
    const res = await POST(makeRequest({ name: "지각", amount: 5000 }));
    expect(res.status).toBe(403);
  });

  it("403: MEMBER 권한 — 접근 거부", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const res = await POST(makeRequest({ name: "지각", amount: 5000 }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("Insufficient permissions");
  });

  it("503: DB 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);

    const res = await POST(makeRequest({ name: "지각", amount: 5000 }));
    expect(res.status).toBe(503);
  });

  describe("action: record", () => {
    const recordBody = {
      action: "record",
      ruleId: "rule-1",
      memberId: "mem-1",
      amount: 5000,
      date: "2025-03-15",
      note: "3쿼터 지각",
    };

    it("201: STAFF — 벌금 기록 생성 성공", async () => {
      vi.mocked(auth).mockResolvedValue(staffSession);
      const newRecord = { id: "rec-new", ...recordBody, is_paid: false, team_id: "team-test-001" };
      const db = createMockDb(["penalty_records", newRecord]);
      vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

      const res = await POST(makeRequest(recordBody));
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.id).toBe("rec-new");
    });

    it("201: PRESIDENT — 벌금 기록 생성 성공", async () => {
      vi.mocked(auth).mockResolvedValue(presidentSession);
      const newRecord = { id: "rec-pres", amount: 10000, is_paid: false };
      const db = createMockDb(["penalty_records", newRecord]);
      vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

      const res = await POST(makeRequest({ ...recordBody, ruleId: null, amount: 10000 }));
      expect(res.status).toBe(201);
    });

    it("400: DB 에러 시 에러 반환", async () => {
      vi.mocked(auth).mockResolvedValue(staffSession);
      const db = createMockDb(["penalty_records", null, { message: "insert record failed" }]);
      vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

      const res = await POST(makeRequest(recordBody));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("insert record failed");
    });
  });

  describe("default: create rule", () => {
    const ruleBody = { name: "지각", amount: 5000, description: "경기 시작 후 15분 이상 지각" };

    it("201: STAFF — 벌금 규칙 생성 성공", async () => {
      vi.mocked(auth).mockResolvedValue(staffSession);
      const newRule = { id: "rule-new", team_id: "team-test-001", ...ruleBody };
      const db = createMockDb(["penalty_rules", newRule]);
      vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

      const res = await POST(makeRequest(ruleBody));
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.id).toBe("rule-new");
      expect(json.name).toBe("지각");
    });

    it("201: PRESIDENT — 벌금 규칙 생성 성공", async () => {
      vi.mocked(auth).mockResolvedValue(presidentSession);
      const newRule = { id: "rule-pres", name: "결석", amount: 10000 };
      const db = createMockDb(["penalty_rules", newRule]);
      vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

      const res = await POST(makeRequest({ name: "결석", amount: 10000 }));
      expect(res.status).toBe(201);
    });

    it("400: DB 에러 시 에러 반환", async () => {
      vi.mocked(auth).mockResolvedValue(staffSession);
      const db = createMockDb(["penalty_rules", null, { message: "insert rule failed" }]);
      vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

      const res = await POST(makeRequest(ruleBody));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("insert rule failed");
    });
  });
});

// ─── PUT /api/penalties ───────────────────────────────────────────────────────
describe("PUT /api/penalties", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeRequest(body: object) {
    return new NextRequest("http://localhost/api/penalties", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("401: 비로그인 접근 거부", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await PUT(makeRequest({ id: "rec-1", isPaid: true }));
    expect(res.status).toBe(401);
  });

  it("403: MEMBER 권한 — 접근 거부", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const res = await PUT(makeRequest({ id: "rec-1", isPaid: true }));
    expect(res.status).toBe(403);
  });

  it("503: DB 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);

    const res = await PUT(makeRequest({ id: "rec-1", isPaid: true }));
    expect(res.status).toBe(503);
  });

  it("200: STAFF — isPaid=true 업데이트 성공", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const updatedRecord = { id: "rec-1", is_paid: true, amount: 5000 };
    const db = createMockDb(["penalty_records", updatedRecord]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makeRequest({ id: "rec-1", isPaid: true }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.is_paid).toBe(true);
  });

  it("200: STAFF — isPaid=false 로 되돌리기 성공", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const updatedRecord = { id: "rec-1", is_paid: false, amount: 5000 };
    const db = createMockDb(["penalty_records", updatedRecord]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makeRequest({ id: "rec-1", isPaid: false }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.is_paid).toBe(false);
  });

  it("200: PRESIDENT — 업데이트 성공", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    const updatedRecord = { id: "rec-2", is_paid: true, amount: 10000 };
    const db = createMockDb(["penalty_records", updatedRecord]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makeRequest({ id: "rec-2", isPaid: true }));
    expect(res.status).toBe(200);
  });

  it("400: DB 에러 시 에러 반환", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const db = createMockDb(["penalty_records", null, { message: "update paid status failed" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await PUT(makeRequest({ id: "rec-1", isPaid: true }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("update paid status failed");
  });
});

// ─── DELETE /api/penalties ────────────────────────────────────────────────────
describe("DELETE /api/penalties", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeRequest(params?: Record<string, string>) {
    const url = new URL("http://localhost/api/penalties");
    if (params) {
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    }
    return new NextRequest(url, { method: "DELETE" });
  }

  it("401: 비로그인 접근 거부", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await DELETE(makeRequest({ id: "rule-1", type: "rule" }));
    expect(res.status).toBe(401);
  });

  it("403: MEMBER 권한 — 접근 거부", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const res = await DELETE(makeRequest({ id: "rule-1", type: "rule" }));
    expect(res.status).toBe(403);
  });

  it("503: DB 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);

    const res = await DELETE(makeRequest({ id: "rule-1", type: "rule" }));
    expect(res.status).toBe(503);
  });

  describe("type=rule", () => {
    it("200: STAFF — 벌금 규칙 삭제 성공", async () => {
      vi.mocked(auth).mockResolvedValue(staffSession);
      const db = createMockDb(["penalty_rules", null]);
      vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

      const res = await DELETE(makeRequest({ id: "rule-1", type: "rule" }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.deleted).toBe(true);
    });

    it("200: PRESIDENT — 벌금 규칙 삭제 성공", async () => {
      vi.mocked(auth).mockResolvedValue(presidentSession);
      const db = createMockDb(["penalty_rules", null]);
      vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

      const res = await DELETE(makeRequest({ id: "rule-2", type: "rule" }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.deleted).toBe(true);
    });

    it("400: DB 에러 시 에러 반환", async () => {
      vi.mocked(auth).mockResolvedValue(staffSession);
      const db = createMockDb(["penalty_rules", null, { message: "delete rule failed" }]);
      vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

      const res = await DELETE(makeRequest({ id: "rule-1", type: "rule" }));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("delete rule failed");
    });
  });

  describe("type=record", () => {
    it("200: STAFF — 벌금 기록 삭제 성공", async () => {
      vi.mocked(auth).mockResolvedValue(staffSession);
      const db = createMockDb(["penalty_records", null]);
      vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

      const res = await DELETE(makeRequest({ id: "rec-1", type: "record" }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.deleted).toBe(true);
    });

    it("200: PRESIDENT — 벌금 기록 삭제 성공", async () => {
      vi.mocked(auth).mockResolvedValue(presidentSession);
      const db = createMockDb(["penalty_records", null]);
      vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

      const res = await DELETE(makeRequest({ id: "rec-2", type: "record" }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.deleted).toBe(true);
    });

    it("400: DB 에러 시 에러 반환", async () => {
      vi.mocked(auth).mockResolvedValue(staffSession);
      const db = createMockDb(["penalty_records", null, { message: "delete record failed" }]);
      vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

      const res = await DELETE(makeRequest({ id: "rec-1", type: "record" }));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("delete record failed");
    });
  });
});
