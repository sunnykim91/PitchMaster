import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * AI 사용량 관측성 + 레이트리밋 v2.
 *
 * 한도 정책 (마이그레이션 00033):
 *   - 전술 분석 / 라인업: 경기당 1회 + 팀당 월 10회
 *   - 경기 후기: 자동생성 1회(ai_summary_generated_at) + 재생성 1회(ai_summary_regenerate_count)
 *   - OCR: 제한 없음 (이미지 해시 캐시로 중복 방지)
 *   - 선수 카드: 기존 유지
 *
 * 테이블 없어도 graceful하게 동작 — 로그 실패가 AI 기능을 막지 않음.
 */

/**
 * AI feature 종류.
 * - tactics-plan : AI 풀 플랜 (편성 + 코칭 통합, 경기당 2회·팀 월 10회)
 * - tactics-coach: 빠른 편성 후 독립 코치 분석 (경기당 1회 재생성 불가·팀 월 10회)
 * - tactics      : (legacy) 이전 기록과 호환 — 신규 집계 대상 아님
 */
export type AiFeature = "signature" | "match_summary" | "tactics" | "tactics-plan" | "tactics-coach" | "ocr";
export type AiSource = "ai" | "rule" | "error";

export type UsageLogEntry = {
  feature: AiFeature;
  source: AiSource;
  model?: string | null;
  userId?: string | null;
  teamId?: string | null;
  matchId?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  cacheReadTokens?: number | null;
  cacheCreationTokens?: number | null;
  latencyMs?: number | null;
  errorReason?: string | null;
  retryCount?: number;
  entityId?: string | null;
};

/** 팀당 월 한도 — feature별 독립 */
export const MONTHLY_TEAM_CAPS: Partial<Record<AiFeature, number>> = {
  "tactics-plan": 10,
  "tactics-coach": 10,
};

/** 경기당 허용 횟수 (동일 match_id에서 source='ai'로 기록된 건수 기준) */
export const MATCH_CAPS: Partial<Record<AiFeature, number>> = {
  "tactics-plan": 2, // 최초 생성 1회 + 재생성 1회
  "tactics-coach": 1, // 재생성 불가
};

export type RateLimitStatus = {
  allowed: boolean;
  reason?: "match_used" | "monthly_team_cap";
  monthlyCount?: number;
  monthlyCap?: number;
  message?: string;
};

/** 기록 — 실패해도 조용히 (AI 기능 영향 없음) */
export async function recordAiUsage(entry: UsageLogEntry): Promise<void> {
  const db = getSupabaseAdmin();
  if (!db) return;

  try {
    const { error } = await db.from("ai_usage_log").insert({
      feature: entry.feature,
      source: entry.source,
      model: entry.model ?? null,
      user_id: entry.userId ?? null,
      team_id: entry.teamId ?? null,
      match_id: entry.matchId ?? null,
      input_tokens: entry.inputTokens ?? null,
      output_tokens: entry.outputTokens ?? null,
      cache_read_tokens: entry.cacheReadTokens ?? null,
      cache_creation_tokens: entry.cacheCreationTokens ?? null,
      latency_ms: entry.latencyMs ?? null,
      error_reason: entry.errorReason ?? null,
      retry_count: entry.retryCount ?? 0,
      entity_id: entry.entityId ?? null,
    });
    if (error && !error.message.includes("relation") && !error.message.includes("does not exist")) {
      console.warn("[aiUsageLog] insert 실패:", error.message);
    }
  } catch {
    // 네트워크/스키마 이슈 — 무시
  }
}

/**
 * 전술 분석 / 라인업 레이트리밋 체크.
 *
 * 1) 이 경기에서 이미 AI 호출 → 차단
 * 2) 팀 이번 달 10회 초과 → 차단
 */
export async function checkRateLimit(
  feature: AiFeature,
  userId: string,
  teamId: string | null,
  matchId?: string | null,
): Promise<RateLimitStatus> {
  const db = getSupabaseAdmin();
  if (!db) return { allowed: true };

  try {
    // ① 경기당 허용 횟수 체크 (matchId 있을 때만)
    if (matchId && teamId) {
      const matchCap = MATCH_CAPS[feature] ?? 1;
      const { count: matchCount, error: matchErr } = await db
        .from("ai_usage_log")
        .select("id", { count: "exact", head: true })
        .eq("match_id", matchId)
        .eq("feature", feature)
        .eq("team_id", teamId)
        .eq("source", "ai");

      if (!matchErr && (matchCount ?? 0) >= matchCap) {
        return {
          allowed: false,
          reason: "match_used",
          message: matchCap === 1
            ? "이 경기에서 이미 AI 분석을 생성했습니다."
            : `이 경기에서 AI 분석을 ${matchCap}회 모두 사용했습니다.`,
        };
      }
    }

    // ② 팀 월 한도 체크
    const monthlyCap = MONTHLY_TEAM_CAPS[feature];
    if (monthlyCap != null && teamId) {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { count: monthlyCount, error: monthlyErr } = await db
        .from("ai_usage_log")
        .select("id", { count: "exact", head: true })
        .eq("team_id", teamId)
        .eq("feature", feature)
        .eq("source", "ai")
        .gte("created_at", monthStart);

      if (!monthlyErr && (monthlyCount ?? 0) >= monthlyCap) {
        return {
          allowed: false,
          reason: "monthly_team_cap",
          monthlyCount: monthlyCount ?? 0,
          monthlyCap,
          message: `이번 달 팀 한도(${monthlyCap}회)를 모두 사용했습니다. 다음 달 1일에 초기화됩니다.`,
        };
      }

      return {
        allowed: true,
        monthlyCount: monthlyCount ?? 0,
        monthlyCap,
      };
    }

    return { allowed: true };
  } catch {
    return { allowed: true }; // 관측성 실패 ≠ 기능 차단
  }
}

/**
 * 팀의 이번 달 AI 사용 현황 조회 (UI 표시용).
 * 에러 시 null 반환 — UI는 표시 생략.
 */
export async function getMonthlyTeamUsage(
  feature: AiFeature,
  teamId: string,
): Promise<{ count: number; cap: number } | null> {
  const monthlyCap = MONTHLY_TEAM_CAPS[feature];
  if (monthlyCap == null) return null;

  const db = getSupabaseAdmin();
  if (!db) return null;

  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { count, error } = await db
      .from("ai_usage_log")
      .select("id", { count: "exact", head: true })
      .eq("team_id", teamId)
      .eq("feature", feature)
      .eq("source", "ai")
      .gte("created_at", monthStart);

    if (error) return null;
    return { count: count ?? 0, cap: monthlyCap };
  } catch {
    return null;
  }
}

/** Anthropic SDK 응답에서 토큰 사용량 추출 (타입 우회) */
export function extractTokenUsage(
  response: unknown
): Pick<UsageLogEntry, "inputTokens" | "outputTokens" | "cacheReadTokens" | "cacheCreationTokens"> {
  if (!response || typeof response !== "object") return {};
  const r = response as { usage?: Record<string, unknown> };
  const u = r.usage;
  if (!u) return {};
  return {
    inputTokens: typeof u.input_tokens === "number" ? u.input_tokens : null,
    outputTokens: typeof u.output_tokens === "number" ? u.output_tokens : null,
    cacheReadTokens:
      typeof u.cache_read_input_tokens === "number" ? u.cache_read_input_tokens : null,
    cacheCreationTokens:
      typeof u.cache_creation_input_tokens === "number" ? u.cache_creation_input_tokens : null,
  };
}
