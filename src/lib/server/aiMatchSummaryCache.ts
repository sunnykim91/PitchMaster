import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { generateAiMatchSummary, type MatchSummaryInput } from "@/lib/server/aiMatchSummary";
import { checkRateLimit } from "@/lib/server/aiUsageLog";

/**
 * 경기 후기 캐시 — 시그니처 카피와 유사한 구조.
 *
 * 특징:
 * - 경기는 완료 후 스탯 변경 거의 없음 → TTL 없이 영구 캐시
 * - 단, 경기 수정 시 "재생성" 버튼 필요 (향후)
 * - Feature Flag: 김선휘만 새 생성 트리거, 나머지는 캐시만 조회
 */

export type MatchSummaryCacheParams = {
  matchId: string;
  cachedSummary: string | null;
  /** ai_summary_generated_at 값 — 이미 생성된 경기는 재생성 금지 (토큰 낭비 방지) */
  cachedGeneratedAt?: string | null;
  enableGenerate: boolean;
  input: MatchSummaryInput;
  /** 관측성용 */
  userId?: string | null;
  teamId?: string | null;
  /** true면 기존 ai_summary가 있어도 강제 재생성 (재생성 버튼용) */
  forceRegenerate?: boolean;
};

export async function getOrGenerateMatchSummary(params: MatchSummaryCacheParams): Promise<string | null> {
  const { matchId, cachedSummary, cachedGeneratedAt, enableGenerate, input, userId, teamId, forceRegenerate } = params;

  // 1. 캐시 hit → 재사용 (강제 재생성 아닐 때)
  if (cachedSummary && !forceRegenerate) return cachedSummary;

  // 1-b. 한 번이라도 생성된 기록이 있으면 재생성 금지 (forceRegenerate 예외)
  if (cachedGeneratedAt && !forceRegenerate) return null;

  // 2. 생성 권한 없음 + 캐시 없음 → null (UI에서 안 보이게)
  if (!enableGenerate) return null;

  // 2-b. 레이트리밋
  if (userId) {
    const rate = await checkRateLimit("match_summary", userId, teamId ?? null);
    if (!rate.allowed) {
      console.warn(`[aiMatchSummaryCache] rate limit 초과 (${rate.reason})`);
      return null;
    }
  }

  // 3. 생성 권한 있음 → LLM 호출 + DB 저장 (관측성 ID 주입)
  const inputWithContext: MatchSummaryInput = { ...input, userId: userId ?? null, teamId: teamId ?? null, matchId };
  const result = await generateAiMatchSummary(inputWithContext);
  if (result.source === "ai") {
    const db = getSupabaseAdmin();
    if (!db) {
      console.warn("[aiMatchSummaryCache] getSupabaseAdmin null — 저장 스킵");
    } else {
      const { error } = await db
        .from("matches")
        .update({
          ai_summary: result.summary,
          ai_summary_generated_at: new Date().toISOString(),
          ai_summary_model: result.model ?? null,
        })
        .eq("id", matchId);
      if (error) {
        console.error("[aiMatchSummaryCache] DB update 실패 — matchId=", matchId, "err=", error.message);
      } else {
        console.log("[aiMatchSummaryCache] DB 저장 성공 — matchId=", matchId);
      }
    }
  } else {
    console.warn("[aiMatchSummaryCache] AI 결과가 'rule' fallback — 저장 스킵. matchId=", matchId);
  }
  return result.summary;
}
