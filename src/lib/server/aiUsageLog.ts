import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * AI 사용량 관측성 + 레이트리밋.
 *
 * 테이블 없어도 graceful하게 동작 — 로그 실패가 AI 기능을 막지 않음.
 * 마이그레이션 00029 참조.
 */

export type AiFeature = "signature" | "match_summary" | "tactics" | "ocr";
export type AiSource = "ai" | "rule" | "error";

export type UsageLogEntry = {
  feature: AiFeature;
  source: AiSource;
  model?: string | null;
  userId?: string | null;
  teamId?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  cacheReadTokens?: number | null;
  cacheCreationTokens?: number | null;
  latencyMs?: number | null;
  errorReason?: string | null;
  retryCount?: number;
  entityId?: string | null;
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

/** 기능별 일일 캡 (메모리 로드맵 기준) */
export const DAILY_CAPS: Record<AiFeature, { user: number; team: number }> = {
  signature: { user: 50, team: 300 },       // 선수 카드 — 캐시 대상이라 여유 있게
  match_summary: { user: 30, team: 200 },   // 경기 후기 — 경기 1회당 1번만 필요
  tactics: { user: 40, team: 200 },         // 코치 분석 — 편성 조정 반복 예상
  ocr: { user: 20, team: 100 },             // OCR — 비용 가장 큼 (건당 3~5원)
};

export type RateLimitStatus = {
  allowed: boolean;
  reason?: "user_cap" | "team_cap";
  userCount?: number;
  teamCount?: number;
  cap?: number;
};

/** 최근 24시간 사용량 조회 → 캡 초과 여부 판정 */
export async function checkRateLimit(
  feature: AiFeature,
  userId: string,
  teamId: string | null
): Promise<RateLimitStatus> {
  const db = getSupabaseAdmin();
  if (!db) return { allowed: true }; // DB 없으면 통과 (데모/로컬)

  const caps = DAILY_CAPS[feature];
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  try {
    // 사용자 카운트
    const { count: userCount, error: userErr } = await db
      .from("ai_usage_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("feature", feature)
      .eq("source", "ai") // rule fallback은 카운트 안 함 (비용 0)
      .gte("created_at", since);

    if (userErr) {
      // 테이블 없거나 DB 에러 → 통과 (관측성 손실 용인)
      return { allowed: true };
    }

    if ((userCount ?? 0) >= caps.user) {
      return {
        allowed: false,
        reason: "user_cap",
        userCount: userCount ?? 0,
        cap: caps.user,
      };
    }

    // 팀 카운트 (teamId 있을 때만)
    if (teamId) {
      const { count: teamCount } = await db
        .from("ai_usage_log")
        .select("id", { count: "exact", head: true })
        .eq("team_id", teamId)
        .eq("feature", feature)
        .eq("source", "ai")
        .gte("created_at", since);

      if ((teamCount ?? 0) >= caps.team) {
        return {
          allowed: false,
          reason: "team_cap",
          teamCount: teamCount ?? 0,
          cap: caps.team,
        };
      }

      return {
        allowed: true,
        userCount: userCount ?? 0,
        teamCount: teamCount ?? 0,
      };
    }

    return { allowed: true, userCount: userCount ?? 0 };
  } catch {
    return { allowed: true }; // 관측성 실패 ≠ 기능 차단
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
