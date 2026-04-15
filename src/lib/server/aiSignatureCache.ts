import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { generateAiSignature, type AiSignatureInput } from "@/lib/server/aiSignature";
import { generateSignature as generateRuleBasedSignature } from "@/lib/playerCardUtils";

/**
 * 시그니처 캐시 전략:
 * - team_members.ai_signature 컬럼에 LLM 결과 저장 (마이그레이션 00027)
 * - TTL 7일: ai_signature_generated_at 기준
 * - 조회 정책:
 *   1. 캐시 hit + 7일 이내 → 그대로 반환 (모든 사용자)
 *   2. 캐시 miss or stale + enableGenerate=true → LLM 호출 → DB 저장
 *   3. 캐시 miss or stale + enableGenerate=false → 룰 기반 반환 (저장 안 함)
 *
 * enableGenerate는 김선휘 Feature Flag 용. 모든 사용자에게 AI 결과를 노출하되,
 * 새 생성은 김선휘 계정만 트리거 → 비용 통제.
 */

const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7일

export type CacheParams = {
  teamMemberId: string;
  cachedSignature: string | null;
  cachedGeneratedAt: string | null;
  /** LLM 호출 허용 여부 (김선휘만 true) */
  enableGenerate: boolean;
  /** 시그니처 생성 입력 (fallback 및 신규 생성용) */
  input: AiSignatureInput;
};

function isFresh(generatedAt: string | null): boolean {
  if (!generatedAt) return false;
  const age = Date.now() - new Date(generatedAt).getTime();
  return age < TTL_MS;
}

export async function getOrGenerateSignature(params: CacheParams): Promise<string> {
  const { teamMemberId, cachedSignature, cachedGeneratedAt, enableGenerate, input } = params;

  // 1. 캐시 hit + 신선 → 재사용
  if (cachedSignature && isFresh(cachedGeneratedAt)) {
    return cachedSignature;
  }

  // 2. 생성 권한 없음 → 룰 기반 (저장 안 함)
  if (!enableGenerate) {
    // 캐시는 있지만 stale인 경우: 룰 기반보다 stale이 나을 수도 있으므로 우선 사용
    if (cachedSignature) return cachedSignature;
    return generateRuleBasedSignature(input);
  }

  // 3. 생성 권한 있음 → LLM 호출 + DB 저장
  const result = await generateAiSignature(input);

  // fallback이어도 DB에 저장? 아니, 룰 기반 결과는 다음 호출 때 재시도 기회 주기 위해 저장 안 함
  if (result.source === "ai") {
    const db = getSupabaseAdmin();
    if (!db) {
      console.warn("[aiSignatureCache] getSupabaseAdmin null — 저장 스킵");
    } else {
      const { error } = await db
        .from("team_members")
        .update({
          ai_signature: result.signature,
          ai_signature_generated_at: new Date().toISOString(),
          ai_signature_model: result.model ?? null,
        })
        .eq("id", teamMemberId);
      if (error) {
        console.error("[aiSignatureCache] DB update 실패 — memberId=", teamMemberId, "err=", error.message);
      } else {
        console.log("[aiSignatureCache] DB 저장 성공 — memberId=", teamMemberId);
      }
    }
  } else {
    console.warn("[aiSignatureCache] AI 결과가 'rule' fallback — 저장 스킵. memberId=", teamMemberId);
  }

  return result.signature;
}
