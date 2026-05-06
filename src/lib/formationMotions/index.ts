import type { FormationMotion } from "./types";
import { FORMATION_4231_MOTION } from "./4-2-3-1";
import { formationTemplates } from "@/lib/formations";
import { buildBasicMotion } from "./builder";

/**
 * Motion registry.
 *
 * 4-2-3-1 은 풀 시퀀스 (수동 작성) 사용. 그 외 모든 포메이션은 builder 가
 * "기본 전형 + 공격 1 + 수비 1" 단순 베이스 자동 생성.
 *
 * 각 팀 운영진은 편집기에서 이 표준을 복사·편집해 자기팀 영상으로 발전.
 */

const REGISTRY: Record<string, FormationMotion> = {};

// 4-2-3-1 은 별도 풀 시퀀스 사용
REGISTRY["4-2-3-1"] = FORMATION_4231_MOTION;

// 그 외 모든 포메이션은 자동 베이스
for (const template of formationTemplates) {
  if (template.id in REGISTRY) continue;
  REGISTRY[template.id] = buildBasicMotion(template);
}

export function getFormationMotion(formationId: string): FormationMotion | null {
  return REGISTRY[formationId] ?? null;
}

export function hasFormationMotion(formationId: string): boolean {
  return formationId in REGISTRY;
}

export type { FormationMotion, MotionPhase, MotionStep, PhasePosition } from "./types";
