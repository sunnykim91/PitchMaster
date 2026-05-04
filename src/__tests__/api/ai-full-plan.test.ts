import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createMockDb } from "../helpers/db";
import { presidentSession, noTeamSession } from "../helpers/auth";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/server/aiFullPlan", () => ({
  generateAiFullPlan: vi.fn(),
}));
vi.mock("@/lib/server/aiUsageLog", () => ({
  checkRateLimit: vi.fn(),
  getMonthlyTeamUsage: vi.fn(),
  MATCH_CAPS: { "tactics-plan": 3 },
}));
vi.mock("@/lib/server/aiTacticsAnalysis", () => ({
  // TacticsAnalysisInput 타입만 사용하므로 빈 mock
}));

import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { generateAiFullPlan } from "@/lib/server/aiFullPlan";
import { checkRateLimit } from "@/lib/server/aiUsageLog";
import { POST } from "@/app/api/ai/full-plan/route";

// ─── POST /api/ai/full-plan ───────────────────────────────────────────────────
describe("POST /api/ai/full-plan", () => {
  beforeEach(() => vi.clearAllMocks());

  // Feature flag 통과용 세션 (name === "김선휘")
  const kimSession = { ...presidentSession, user: { ...presidentSession.user, name: "김선휘" } };

  const validBody = {
    formationName: "4-3-3",
    attendees: [{ id: "mem-1", name: "홍길동" }],
    quarterCount: 4,
    matchId: "match-001",
  };

  function makeRequest(body?: object) {
    return new NextRequest("http://localhost/api/ai/full-plan", {
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

  it("200: FUTSAL 팀 — 풋살 지원 통과 (41차 차단 해제)", async () => {
    vi.mocked(auth).mockResolvedValue(kimSession);
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true });
    vi.mocked(generateAiFullPlan).mockResolvedValue({
      plans: [{ quarter: 1, formation: "futsal-2-2-1", placement: [] }],
      coaching: "풋살 화이팅",
      source: "ai",
      model: "claude-haiku-4-5",
    });
    const res = await POST(makeRequest({ ...validBody, formationName: "futsal-2-2-1" }));
    expect(res.status).toBe(200);
  });

  it("400: invalid_payload (formationName 없음)", async () => {
    vi.mocked(auth).mockResolvedValue(kimSession);
    const db = createMockDb(["teams", { sport_type: "SOCCER" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true });
    const res = await POST(makeRequest({ attendees: [], quarterCount: 4 }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid_payload");
  });

  it("400: invalid_payload (attendees 없음)", async () => {
    vi.mocked(auth).mockResolvedValue(kimSession);
    const db = createMockDb(["teams", { sport_type: "SOCCER" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true });
    const res = await POST(makeRequest({ formationName: "4-3-3", quarterCount: 4 }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid_payload");
  });

  it("400: invalid_payload (quarterCount 없음)", async () => {
    vi.mocked(auth).mockResolvedValue(kimSession);
    const db = createMockDb(["teams", { sport_type: "SOCCER" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true });
    const res = await POST(makeRequest({ formationName: "4-3-3", attendees: [] }));
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
      reason: "monthly_team_cap",
      monthlyCount: 20,
      monthlyCap: 20,
      message: "팀 월 한도 초과",
    });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toBe("rate_limited");
    expect(json.reason).toBe("monthly_team_cap");
  });

  it("200: 성공 — plans, coaching, source 필드 반환", async () => {
    vi.mocked(auth).mockResolvedValue(kimSession);
    const db = createMockDb(["teams", { sport_type: "SOCCER" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true });
    vi.mocked(generateAiFullPlan).mockResolvedValue({
      plans: [{ quarter: 1, formation: "4-3-3", placement: [] }],
      coaching: "선수들 화이팅",
      source: "ai",
      model: "claude-haiku-4-5",
    });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.plans)).toBe(true);
    expect(json.coaching).toBe("선수들 화이팅");
    expect(json.source).toBe("ai");
  });

  it("200: rule fallback 결과도 정상 반환", async () => {
    vi.mocked(auth).mockResolvedValue(kimSession);
    const db = createMockDb(["teams", { sport_type: "SOCCER" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true });
    vi.mocked(generateAiFullPlan).mockResolvedValue({
      plans: [],
      coaching: "",
      source: "rule",
    });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.source).toBe("rule");
  });

  it("200: teamId 없는 세션 — 팀 조회 건너뜀 후 성공", async () => {
    // name="김선휘" + teamId 없는 조합으로 feature flag 통과 + 팀 조회 스킵 경로 검증
    const kimNoTeamSession = { ...kimSession, user: { ...kimSession.user, teamId: undefined } };
    vi.mocked(auth).mockResolvedValue(kimNoTeamSession);
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true });
    vi.mocked(generateAiFullPlan).mockResolvedValue({
      plans: [],
      coaching: "",
      source: "rule",
    });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
  });
});
