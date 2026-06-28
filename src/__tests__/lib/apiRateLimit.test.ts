import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkMutationRateLimit } from "@/lib/server/apiRateLimit";

/**
 * count 쿼리 전용 mock — `.from().select().eq().gte().eq()` 체인을 지원하고
 * await 시 { count, error }를 반환한다. (공용 createMockDb는 data/error만 반환)
 */
function countDb(result: { count?: number | null; error?: unknown }) {
  const calls: { eq: unknown[][]; gte: unknown[][]; table: string[] } = { eq: [], gte: [], table: [] };
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn((...a: unknown[]) => { calls.eq.push(a); return chain; }),
    gte: vi.fn((...a: unknown[]) => { calls.gte.push(a); return chain; }),
    then: (onF: (v: { count: number | null; error: unknown }) => unknown) =>
      Promise.resolve({ count: result.count ?? null, error: result.error ?? null }).then(onF),
  };
  const db = {
    from: vi.fn((t: string) => { calls.table.push(t); return chain; }),
    _calls: calls,
  };
  return db;
}

const baseArgs = {
  table: "match_goals",
  actorColumn: "recorded_by",
  actorId: "user-1",
  windowSec: 60,
  max: 40,
};

describe("checkMutationRateLimit — per-user mutation 스팸 방지", () => {
  it("윈도 내 생성 수가 한도 미만이면 allow", async () => {
    const db = countDb({ count: 5 });
    const r = await checkMutationRateLimit(db as unknown as SupabaseClient, baseArgs);
    expect(r.allowed).toBe(true);
    expect(db.from).toHaveBeenCalledWith("match_goals");
  });

  it("한도 도달(>=max)이면 deny + retryAfterSec = windowSec", async () => {
    const db = countDb({ count: 40 });
    const r = await checkMutationRateLimit(db as unknown as SupabaseClient, baseArgs);
    expect(r.allowed).toBe(false);
    expect(r.retryAfterSec).toBe(60);
  });

  it("한도 초과(>max)도 deny", async () => {
    const db = countDb({ count: 99 });
    const r = await checkMutationRateLimit(db as unknown as SupabaseClient, baseArgs);
    expect(r.allowed).toBe(false);
  });

  it("count 쿼리 에러 시 allow (graceful — limiter 오류로 정상 사용자 차단 금지)", async () => {
    const db = countDb({ count: null, error: { message: "boom" } });
    const r = await checkMutationRateLimit(db as unknown as SupabaseClient, baseArgs);
    expect(r.allowed).toBe(true);
  });

  it("행이 없으면(count null) allow", async () => {
    const db = countDb({ count: null });
    const r = await checkMutationRateLimit(db as unknown as SupabaseClient, baseArgs);
    expect(r.allowed).toBe(true);
  });

  it("actorColumn=actorId 필터와 timeColumn gte를 적용한다", async () => {
    const db = countDb({ count: 0 });
    await checkMutationRateLimit(db as unknown as SupabaseClient, baseArgs);
    // recorded_by = user-1
    expect(db._calls.eq).toContainEqual(["recorded_by", "user-1"]);
    // created_at >= (ISO 문자열)
    expect(db._calls.gte[0][0]).toBe("created_at");
    expect(typeof db._calls.gte[0][1]).toBe("string");
  });

  it("scope가 주어지면 추가 eq 필터를 적용한다", async () => {
    const db = countDb({ count: 0 });
    await checkMutationRateLimit(db as unknown as SupabaseClient, {
      ...baseArgs,
      table: "posts",
      actorColumn: "author_id",
      scope: { column: "team_id", value: "team-9" },
    });
    expect(db._calls.eq).toContainEqual(["author_id", "user-1"]);
    expect(db._calls.eq).toContainEqual(["team_id", "team-9"]);
  });

  it("timeColumn 커스텀(예: recorded_at)을 반영한다", async () => {
    const db = countDb({ count: 0 });
    await checkMutationRateLimit(db as unknown as SupabaseClient, {
      ...baseArgs,
      table: "dues_records",
      timeColumn: "recorded_at",
    });
    expect(db._calls.gte[0][0]).toBe("recorded_at");
  });
});
