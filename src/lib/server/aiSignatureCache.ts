import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { generateAiSignature, type AiSignatureInput } from "@/lib/server/aiSignature";
import { generateSignature as generateRuleBasedSignature } from "@/lib/playerCardUtils";
import { checkRateLimit } from "@/lib/server/aiUsageLog";

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
  /** 관측성용 — 호출한 유저/팀 */
  userId?: string | null;
  teamId?: string | null;
};

function isFresh(generatedAt: string | null): boolean {
  if (!generatedAt) return false;
  const age = Date.now() - new Date(generatedAt).getTime();
  return age < TTL_MS;
}

export async function getOrGenerateSignature(params: CacheParams): Promise<string> {
  const { input } = params;
  // AI 생성 경로 완전 비활성화 — 룰 기반(패턴 풀 + 결정론적 선택)이 품질·비용·속도 모두 우위.
  // 이전 AI 캐시는 의도적으로 무시: 사용자별로 새로운 룰 기반 카피를 노출.
  // 레거시 경로 보존: 필요 시 environment flag로 부활 가능.
  return generateRuleBasedSignature(input);
}
