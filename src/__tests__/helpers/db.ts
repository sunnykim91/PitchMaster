import { vi } from "vitest";

type QueryResult = { data: unknown; error: unknown };

/**
 * Supabase 체인 쿼리 빌더 모킹.
 * .from().select().eq().order() 같은 체인을 지원하며,
 * await시 { data, error }를 반환한다.
 */
function createQueryBuilder(result: QueryResult) {
  const handler: ProxyHandler<object> = {
    get(_target, prop: string | symbol) {
      // Thenable: await query 지원
      if (prop === "then") {
        return (onFulfilled: (v: unknown) => unknown) =>
          Promise.resolve(result).then(onFulfilled);
      }
      if (prop === "catch") {
        return (onRejected: (e: unknown) => unknown) =>
          Promise.resolve(result).catch(onRejected);
      }
      if (prop === "finally") {
        return (onFinally: () => void) =>
          Promise.resolve(result).finally(onFinally);
      }
      // .single(), .maybeSingle()은 Promise를 직접 반환
      if (prop === "single" || prop === "maybeSingle") {
        return vi.fn().mockResolvedValue(result);
      }
      // 모든 체인 메서드는 자기 자신(프록시) 반환
      return vi.fn().mockReturnValue(proxy);
    },
  };
  const proxy = new Proxy({} as object, handler);
  return proxy;
}

/**
 * 테이블별 응답을 설정하는 Supabase mock DB 생성.
 * 같은 테이블에 여러 번 호출될 경우 순서대로 다른 응답을 반환.
 *
 * @example
 * const db = createMockDb(
 *   ["matches", [{ id: "1" }]],
 *   ["matches", null, "DB error"],  // 두 번째 matches 호출시 에러
 * )
 */
export function createMockDb(
  ...entries: Array<[table: string, data: unknown, error?: unknown]>
) {
  // 테이블별 응답 큐
  const queues = new Map<string, Array<QueryResult>>();
  for (const [table, data, error = null] of entries) {
    if (!queues.has(table)) queues.set(table, []);
    queues.get(table)!.push({ data, error });
  }
  const callCounts = new Map<string, number>();

  return {
    from: vi.fn((table: string) => {
      const count = callCounts.get(table) ?? 0;
      callCounts.set(table, count + 1);
      const queue = queues.get(table) ?? [];
      const result = queue[count] ?? { data: null, error: null };
      return createQueryBuilder(result);
    }),
  };
}

/** 테이블명 → 단일 응답 매핑 (간단한 케이스용) */
export function createSimpleMockDb(
  tableResults: Record<string, { data: unknown; error?: unknown }>
) {
  return {
    from: vi.fn((table: string) => {
      const r = tableResults[table] ?? { data: null, error: null };
      return createQueryBuilder({ data: r.data, error: r.error ?? null });
    }),
  };
}
