import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 일반 mutation API용 per-user rate limit (남용·스팸 방지).
 *
 * 설계: 별도 로그 테이블/마이그레이션 없이, **보호 대상 테이블에서
 * "이 사용자가 최근 windowSec 동안 만든 행 수"를 COUNT**해 한도 초과 시 차단.
 * - serverless에서 인스턴스 간 공유가 안 되는 in-memory 카운터 대신 DB 카운트 사용
 *   (기존 `aiUsageLog`·`teamCreationRateLimit`와 동일 전략)
 * - 신규 테이블·정리 cron 불필요, 실제 남용 벡터(생성량)를 직접 측정
 *
 * graceful: count 쿼리 실패 시 allow — limiter 오류로 정상 사용자를 막지 않는다.
 */

export type MutationRateLimitArgs = {
  /** 카운트 대상 테이블 (예: "match_goals", "posts", "post_comments", "dues_records") */
  table: string;
  /** 행을 만든 주체를 가리키는 컬럼 (예: "recorded_by", "author_id") */
  actorColumn: string;
  /** 현재 요청 사용자 id */
  actorId: string;
  /** 슬라이딩 윈도 길이(초) */
  windowSec: number;
  /** 윈도 내 허용 최대 생성 수 */
  max: number;
  /** 행 생성 시각 컬럼 (기본 "created_at") */
  timeColumn?: string;
  /** 선택적 추가 범위 필터 (예: { column: "team_id", value: teamId }) */
  scope?: { column: string; value: string };
};

export type MutationRateLimitResult = { allowed: boolean; retryAfterSec?: number };

export async function checkMutationRateLimit(
  db: SupabaseClient,
  {
    table,
    actorColumn,
    actorId,
    windowSec,
    max,
    timeColumn = "created_at",
    scope,
  }: MutationRateLimitArgs
): Promise<MutationRateLimitResult> {
  const since = new Date(Date.now() - windowSec * 1000).toISOString();

  let query = db
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(actorColumn, actorId)
    .gte(timeColumn, since);

  if (scope) query = query.eq(scope.column, scope.value);

  const { count, error } = await query;

  // limiter 오류 시 정상 사용자 차단 금지 (graceful)
  if (error) return { allowed: true };

  if ((count ?? 0) >= max) return { allowed: false, retryAfterSec: windowSec };

  return { allowed: true };
}
