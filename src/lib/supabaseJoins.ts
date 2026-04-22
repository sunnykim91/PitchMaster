/**
 * Supabase-js v2 조인 결과 정규화 헬퍼.
 *
 * Supabase 는 FK 조인 시 타입 추론이 `T | T[] | null` 로 나오는 경우가 있어
 * (특히 `.select("... users(name)")` 같은 임의 관계),
 * 클라이언트에서 매번 `Array.isArray` + 캐스팅으로 우회해 왔음.
 *
 * 이 헬퍼로 대체:
 *   const u = firstOf(p.users); // T | null
 *   u?.name
 *
 * `as unknown as X[]` 같은 타입 우회 캐스팅이 필요 없다.
 */

/** 단일 row 또는 row 배열이 섞여 올 수 있는 조인 결과 */
export type JoinedRow<T> = T | T[] | null | undefined;

/**
 * JoinedRow 에서 첫 번째 값(또는 단일 객체 자체) 를 꺼낸다.
 * 배열이면 [0], 단일이면 그대로, null/undefined 면 null.
 */
export function firstOf<T>(v: JoinedRow<T>): T | null {
  if (v == null) return null;
  if (Array.isArray(v)) return v[0] ?? null;
  return v;
}
