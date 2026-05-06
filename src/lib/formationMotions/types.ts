/**
 * 포메이션별 공/수 움직임 시퀀스 데이터 타입.
 *
 * 좌표계: formations.ts 와 동일 (0~100 비율, y=0 상대골대 / y=100 우리골대).
 * 사용자 본인 포지션은 viewer 측에서 highlight.
 *
 * 구조:
 *  - FormationMotion → attack/defense MotionPhase 배열
 *  - MotionPhase → "기본 진형", "좌측 빌드업 시" 등 큰 분류
 *  - MotionStep → phase 안의 시퀀스 단계 (예: GK→LCB→LDM→LB→...→마무리)
 *  - 정지 phase 는 steps 1 개로 표현.
 */

export interface PhasePosition {
  /** 슬롯 id (formations.ts slot.id 와 매칭). */
  slot: string;
  x: number;
  y: number;
}

export interface MotionStep {
  /** 단계 캡션 — 사용자가 읽으며 흐름 파악할 한 줄 설명 */
  caption: string;
  /** 공 위치 (선택). null/undefined 시 미표시 */
  ball?: { x: number; y: number } | null;
  /** 11개 슬롯 위치 (GK 포함) */
  positions: PhasePosition[];
  /** 이 step 머무르는 시간 (ms). 미지정 시 컴포넌트 default 사용 */
  duration?: number;
}

export interface MotionPhase {
  /** 큰 분류 라벨 — "기본 진형" / "좌측 빌드업 시" 등 */
  label: string;
  /** 시퀀스 단계 (정지 phase 는 1 개) */
  steps: MotionStep[];
}

export interface FormationMotion {
  formationId: string;
  /** 공격 phase 들 — 보통 기본 진형 + 좌/우 빌드업 시퀀스 */
  attack: MotionPhase[];
  /** 수비 phase 들 — 기본 진형 + 좌/중/우 침투 + 전진 압박 */
  defense: MotionPhase[];
}
