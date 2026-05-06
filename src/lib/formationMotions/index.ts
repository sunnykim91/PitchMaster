import type { FormationMotion } from "./types";
import { FORMATION_4231_MOTION } from "./4-2-3-1";

const REGISTRY: Record<string, FormationMotion> = {
  "4-2-3-1": FORMATION_4231_MOTION,
};

/**
 * 포메이션 ID 로 움직임 데이터 조회.
 * 미정의 포메이션은 null 반환 → 컴포넌트는 토글 자체를 숨김.
 */
export function getFormationMotion(formationId: string): FormationMotion | null {
  return REGISTRY[formationId] ?? null;
}

export function hasFormationMotion(formationId: string): boolean {
  return formationId in REGISTRY;
}

export type { FormationMotion, MotionPhase, PhasePosition } from "./types";
