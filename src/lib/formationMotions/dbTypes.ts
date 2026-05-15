/**
 * team_tactical_animations DB row 매핑 타입.
 * animation_data JSONB 는 FormationMotion 의 attack/defense 만 저장 (formationId 는 컬럼).
 */

import type { MotionPhase, MotionStep } from "./types";

/** DB row → API 응답 형태 */
export interface TeamTacticalAnimation {
  id: string;
  team_id: string;
  formation_id: string;
  name: string;
  description: string | null;
  animation_data: TacticalAnimationData;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** 전술 영상 카테고리 (3분류) — 목록 칩 필터·자동 매핑·매치 노출 분기에 사용.
 *  TRANSITION은 실제 사용 0건이라 제거(2026-05-15). 필요해지면 다시 추가. */
export const ANIMATION_CATEGORIES = ["ATTACK", "DEFENSE", "SETPIECE"] as const;
export type AnimationCategory = (typeof ANIMATION_CATEGORIES)[number];

export const ANIMATION_CATEGORY_LABEL: Record<AnimationCategory, string> = {
  ATTACK: "공격",
  DEFENSE: "수비",
  SETPIECE: "세트피스",
};

/** animation_data JSONB 내용.
 *
 * P3 평면화 — 신규 영상은 `steps`만 채우고 `attack`/`defense`는 빈 배열.
 * 기존(레거시) 영상은 `attack`/`defense`에 phase 배열을 가지며, P4 마이그레이션 시
 * 각 phase가 별도 영상으로 분리되면서 `steps`로 옮겨진다.
 */
export interface TacticalAnimationData {
  /** P3 신규 — 영상 1개에 컷 N개. mode·phase 개념 제거. */
  steps?: MotionStep[];
  /** 레거시 호환 — phase 배열. 신규 영상은 빈 배열로 저장. P4 마이그레이션 완료 후 제거 예정. */
  attack: MotionPhase[];
  /** 레거시 호환 — phase 배열. 신규 영상은 빈 배열로 저장. P4 마이그레이션 완료 후 제거 예정. */
  defense: MotionPhase[];
  /** 작성자가 저장한 기본 재생 배속 — 미리보기·GIF·미니뷰에서 첫 진입 시 이 값으로 시작.
   * 미설정(레거시 영상)은 1로 폴백. PLAYBACK_RATES = [0.5, 1, 1.5, 2] 중 하나. */
  defaultRate?: number;
  /** 영상 단위 카테고리 (4분류). 평면화 영상은 필수에 가깝고, 레거시는 phase 라벨 기반 자동 매핑 폴백. */
  category?: AnimationCategory;
}

/** 영상이 P3 평면화 구조인지 검사. 신규/마이그레이션 후 영상은 true. */
export function isFlatAnimation(data: TacticalAnimationData | null | undefined): boolean {
  if (!data) return false;
  return Array.isArray(data.steps) && data.steps.length > 0;
}

/**
 * 평면 영상을 FormationMotionViewer / GifExport 호환 형태(attack/defense phases)로 변환.
 * 평면 영상은 카테고리에 따라 단일 phase로 wrap.
 * 레거시 영상은 그대로 반환.
 */
export function toLegacyMotionShape(data: TacticalAnimationData): { attack: MotionPhase[]; defense: MotionPhase[] } {
  if (!isFlatAnimation(data)) {
    return { attack: data.attack ?? [], defense: data.defense ?? [] };
  }
  const cat = data.category ?? "ATTACK";
  const phase: MotionPhase = {
    label: ANIMATION_CATEGORY_LABEL[cat] ?? "영상",
    steps: data.steps ?? [],
  };
  // 카테고리에 따라 attack 또는 defense에 단일 phase로 배치 — viewer mode 토글 자연스러움
  if (cat === "DEFENSE") return { attack: [], defense: [phase] };
  return { attack: [phase], defense: [] };
}

/** 생성 payload */
export interface CreateAnimationPayload {
  formation_id: string;
  name: string;
  description?: string | null;
  animation_data: TacticalAnimationData;
  is_default?: boolean;
}

/** 수정 payload — 모든 필드 선택 */
export interface UpdateAnimationPayload {
  name?: string;
  description?: string | null;
  animation_data?: TacticalAnimationData;
  is_default?: boolean;
}
