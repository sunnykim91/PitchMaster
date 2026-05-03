import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * 팀 생성 rate limit 검증 + 로그 기록.
 *
 * 정책 (38차 보안 사고 대응):
 *   - 사용자당 시간 1팀
 *   - 사용자당 일 3팀
 *
 * 기준: `team_creation_log` 테이블의 `user_id` + `created_at`.
 * 마이그레이션 00054에서 테이블 신설.
 */

const HOURLY_LIMIT = 1;
const DAILY_LIMIT = 3;

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; reason: string; retryAfterSec?: number };

/** 팀 생성 가능 여부 확인. DB 미설정이면 통과(개발 환경). */
export async function checkTeamCreationRateLimit(userId: string): Promise<RateLimitResult> {
  const db = getSupabaseAdmin();
  if (!db) return { allowed: true };

  const now = Date.now();
  const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();

  // 1시간 내 생성 수
  const hourly = await db
    .from("team_creation_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", oneHourAgo);

  if ((hourly.count ?? 0) >= HOURLY_LIMIT) {
    return {
      allowed: false,
      reason: "시간당 팀 생성 한도(1개)에 도달했습니다. 잠시 후 다시 시도해 주세요.",
      retryAfterSec: 60 * 60,
    };
  }

  // 24시간 내 생성 수
  const daily = await db
    .from("team_creation_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", oneDayAgo);

  if ((daily.count ?? 0) >= DAILY_LIMIT) {
    return {
      allowed: false,
      reason: "하루 팀 생성 한도(3개)에 도달했습니다. 내일 다시 시도해 주세요.",
      retryAfterSec: 24 * 60 * 60,
    };
  }

  return { allowed: true };
}

/**
 * 팀 생성 성공 후 로그 기록. 실패해도 사용자 흐름엔 영향 없음(상위 try/catch에서 swallow 권장).
 */
export async function logTeamCreation(args: {
  userId: string;
  kakaoId?: string | null;
  teamId: string;
  teamName: string;
}): Promise<void> {
  const db = getSupabaseAdmin();
  if (!db) return;

  await db.from("team_creation_log").insert({
    user_id: args.userId,
    kakao_id: args.kakaoId ?? null,
    team_id: args.teamId,
    team_name: args.teamName,
  });
}
