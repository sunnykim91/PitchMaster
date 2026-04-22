import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createMockDb } from "../helpers/db";
import { memberSession, presidentSession, noTeamSession } from "../helpers/auth";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/server/aiTacticsAnalysis", () => ({
  generateAiTacticsAnalysisStream: vi.fn(async function* () {
    // 빈 async generator
  }),
}));
vi.mock("@/lib/server/aiUsageLog", () => ({
  checkRateLimit: vi.fn(),
  getMonthlyTeamUsage: vi.fn(),
  MATCH_CAPS: { "tactics-coach": 4 },
}));

import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/server/aiUsageLog";
import { GET, POST } from "@/app/api/ai/tactics/route";

// ─── GET /api/ai/tactics ──────────────────────────────────────────────────────
describe("GET /api/ai/tactics", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeRequest(matchId?: string) {
    const url = matchId
      ? `http://localhost/api/ai/tactics?matchId=${matchId}`
      : "http://localhost/api/ai/tactics";
    return new NextRequest(url, { method: "GET" });
  }

  it("401: 비로그인 접근 거부", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await GET(makeRequest("match-001"));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("unauthorized");
  });

  it("400: matchId 누락", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("missing_matchId");
  });

  it("503: DB unavailable", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);
    const res = await GET(makeRequest("match-001"));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toBe("db_unavailable");
  });

  it("404: match not found (row null)", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["matches", null]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);
    const res = await GET(makeRequest("match-001"));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("match_not_found");
  });

  it("200: 저장된 분석 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const matchRow = {
      ai_coach_analysis: "분석 텍스트",
      ai_coach_generated_at: "2026-04-22T12:00:00Z",
      ai_coach_model: "claude-haiku-4-5",
    };
    const db = createMockDb(["matches", matchRow]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);
    const res = await GET(makeRequest("match-001"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.analysis).toBe("분석 텍스트");
    expect(json.generatedAt).toBe("2026-04-22T12:00:00Z");
    expect(json.model).toBe("claude-haiku-4-5");
  });

  it("200: 분석 없는 경기 → analysis null 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const matchRow = {
      ai_coach_analysis: null,
      ai_coach_generated_at: null,
      ai_coach_model: null,
    };
    const db = createMockDb(["matches", matchRow]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);
    const res = await GET(makeRequest("match-001"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.analysis).toBeNull();
  });
});

// ─── POST /api/ai/tactics ─────────────────────────────────────────────────────
describe("POST /api/ai/tactics", () => {
  beforeEach(() => vi.clearAllMocks());

  // Feature flag 통과용 세션 (name === "김선휘")
  const kimSession = { ...presidentSession, user: { ...presidentSession.user, name: "김선휘" } };

  const validBody = {
    formationName: "4-3-3",
    attendees: [{ id: "mem-1", name: "홍길동" }],
    matchId: "match-001",
  };

  function makeRequest(body?: object) {
    return new NextRequest("http://localhost/api/ai/tactics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  it("401: 비로그인 접근 거부", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("unauthorized");
  });

  it("403: 김선휘 아닌 유저 차단 (ai_not_available)", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession); // name !== "김선휘"
    const req = new NextRequest("http://localhost/api/ai/tactics", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("ai_not_available");
  });

  it("503: team_lookup_failed (teams 조회 에러)", async () => {
    vi.mocked(auth).mockResolvedValue(kimSession);
    const db = createMockDb(["teams", null, { message: "DB error" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toBe("team_lookup_failed");
  });

  it("403: FUTSAL 팀 차단", async () => {
    vi.mocked(auth).mockResolvedValue(kimSession);
    const db = createMockDb(["teams", { sport_type: "FUTSAL" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("ai_not_available_for_futsal");
  });

  it("400: invalid_payload (formationName 없음)", async () => {
    vi.mocked(auth).mockResolvedValue(kimSession);
    const db = createMockDb(["teams", { sport_type: "SOCCER" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true });
    const res = await POST(makeRequest({ attendees: [] }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid_payload");
  });

  it("400: invalid_payload (attendees 없음)", async () => {
    vi.mocked(auth).mockResolvedValue(kimSession);
    const db = createMockDb(["teams", { sport_type: "SOCCER" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true });
    const res = await POST(makeRequest({ formationName: "4-3-3" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid_payload");
  });

  it("429: rate_limited", async () => {
    vi.mocked(auth).mockResolvedValue(kimSession);
    const db = createMockDb(["teams", { sport_type: "SOCCER" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      reason: "match_used",
      monthlyCount: 4,
      monthlyCap: 30,
      message: "경기당 한도 초과",
    });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toBe("rate_limited");
    expect(json.reason).toBe("match_used");
  });

  it("200: 성공 — text/event-stream 반환", async () => {
    vi.mocked(auth).mockResolvedValue(kimSession);
    const db = createMockDb(["teams", { sport_type: "SOCCER" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/event-stream");
  });

  it("200: teamId 없는 세션 — 팀 조회 건너뜀 후 rate limit 통과 시 스트림 반환", async () => {
    // name="김선휘" + teamId 없는 조합으로 feature flag 통과 + 팀 조회 스킵 경로 검증
    const kimNoTeamSession = { ...kimSession, user: { ...kimSession.user, teamId: undefined } };
    vi.mocked(auth).mockResolvedValue(kimNoTeamSession);
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/event-stream");
  });
});
