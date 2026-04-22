import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createMockDb } from "../helpers/db";
import { presidentSession, noTeamSession } from "../helpers/auth";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/server/aiUsageLog", () => ({
  getMonthlyTeamUsage: vi.fn(),
  MATCH_CAPS: {
    "tactics-coach": 4,
    "tactics-plan": 3,
    "match_summary": 1,
  },
}));

import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getMonthlyTeamUsage } from "@/lib/server/aiUsageLog";
import { GET } from "@/app/api/ai/usage/route";

// ─── GET /api/ai/usage ────────────────────────────────────────────────────────
describe("GET /api/ai/usage", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeRequest(params: Record<string, string>) {
    const searchParams = new URLSearchParams(params).toString();
    return new NextRequest(`http://localhost/api/ai/usage?${searchParams}`, {
      method: "GET",
    });
  }

  it("401: 비로그인 접근 거부", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await GET(makeRequest({ feature: "tactics-coach" }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("unauthorized");
  });

  it("400: feature 파라미터 없음", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    const res = await GET(makeRequest({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("200: feature=tactics-coach, matchId 포함 — monthlyCount/matchUsed/matchCap 반환", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    vi.mocked(getMonthlyTeamUsage).mockResolvedValue({ count: 3, cap: 30 });
    // ai_usage_log count 쿼리 결과 mock
    const db = createMockDb(["ai_usage_log", null]);
    // count를 직접 반환하도록 override: createQueryBuilder는 count를 지원하지 않으므로
    // getSupabaseAdmin mock을 커스터마이징
    const mockDb = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: (onFulfilled: (v: unknown) => unknown) =>
          Promise.resolve({ count: 1, data: null, error: null }).then(onFulfilled),
        catch: vi.fn().mockReturnThis(),
        finally: vi.fn().mockReturnThis(),
      })),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(mockDb as ReturnType<typeof getSupabaseAdmin>);
    const res = await GET(makeRequest({ feature: "tactics-coach", matchId: "match-001" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.monthlyCount).toBe(3);
    expect(json.monthlyCap).toBe(30);
    expect(typeof json.matchUsed).toBe("boolean");
    expect(json.matchCap).toBe(4);
  });

  it("200: feature=match_summary, matchId 포함 — regenerateCount 반환", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    vi.mocked(getMonthlyTeamUsage).mockResolvedValue({ count: 1, cap: null });
    const matchRow = { ai_summary_regenerate_count: 1 };
    // ai_usage_log count + matches select 두 번
    const mockDb = {
      from: vi.fn((table: string) => {
        if (table === "ai_usage_log") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: (onFulfilled: (v: unknown) => unknown) =>
              Promise.resolve({ count: 0, data: null, error: null }).then(onFulfilled),
            catch: vi.fn().mockReturnThis(),
            finally: vi.fn().mockReturnThis(),
          };
        }
        // matches
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: matchRow, error: null }),
          then: (onFulfilled: (v: unknown) => unknown) =>
            Promise.resolve({ data: matchRow, error: null }).then(onFulfilled),
          catch: vi.fn().mockReturnThis(),
          finally: vi.fn().mockReturnThis(),
        };
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(mockDb as ReturnType<typeof getSupabaseAdmin>);
    const res = await GET(makeRequest({ feature: "match_summary", matchId: "match-001" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.regenerateCount).toBe(1);
  });

  it("200: matchId 없음 — matchUsed false, regenerateCount null", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    vi.mocked(getMonthlyTeamUsage).mockResolvedValue({ count: 2, cap: 30 });
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);
    const res = await GET(makeRequest({ feature: "tactics-coach" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.matchUsed).toBe(false);
    expect(json.regenerateCount).toBeNull();
  });

  it("200: teamId 없는 세션 — monthlyCount null 반환", async () => {
    vi.mocked(auth).mockResolvedValue(noTeamSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);
    const res = await GET(makeRequest({ feature: "tactics-coach" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.monthlyCount).toBeNull();
    expect(json.monthlyCap).toBeNull();
  });
});
