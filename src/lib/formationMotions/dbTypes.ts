/**
 * team_tactical_animations DB row 매핑 타입.
 * animation_data JSONB 는 FormationMotion 의 attack/defense 만 저장 (formationId 는 컬럼).
 */

import type { MotionPhase } from "./types";

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

/** animation_data JSONB 내용 */
export interface TacticalAnimationData {
  attack: MotionPhase[];
  defense: MotionPhase[];
  /** 작성자가 저장한 기본 재생 배속 — 미리보기·GIF·미니뷰에서 첫 진입 시 이 값으로 시작.
   * 미설정(레거시 영상)은 1로 폴백. PLAYBACK_RATES = [0.5, 1, 1.5, 2] 중 하나. */
  defaultRate?: number;
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
