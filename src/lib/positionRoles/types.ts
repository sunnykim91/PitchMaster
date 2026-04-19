/**
 * 포지션 역할 데이터 — 아마추어 축구 선수용 코칭 가이드
 *
 * 구조:
 * - base: 포메이션 무관한 공통 원칙 (해당 포지션의 본질)
 * - override: 특정 포메이션에서의 맥락 (왜 중요한지 + 실제 동료 연계)
 * - merged: 런타임에 둘을 합친 결과 (화면 렌더링용)
 */

export type CautionItem = {
  title: string;
  detail: string;
};

export type LinkageItem = {
  /** 연계 상대 포지션 — 포메이션에 실제 존재하는 슬롯 기준 */
  position: string;
  /** 왜 연계하고 어떻게 연계하는지 */
  note: string;
};

/** 포메이션 무관한 공통 베이스 역할 */
export type PositionBaseRole = {
  /** 포지션 풀 네임 (한글 병기) */
  title: string;
  /** 한 줄 요약 — 이 자리의 본질 */
  summary: string;
  /** 공격 시 기본 원칙 */
  attack: string[];
  /** 수비 시 기본 원칙 */
  defense: string[];
  /** 커뮤니케이션·리더십 */
  communication: string[];
  /** 체력 관리·판단 */
  stamina: string[];
  /** 조심할 공통 실수 */
  caution: CautionItem[];
};

/** 특정 포메이션에서 해당 포지션의 맥락 */
export type FormationPositionOverride = {
  /** 이 포메이션에서 이 포지션이 왜 특별한지 */
  whyItMatters: string;
  /** 베이스 attack에 덧붙일 포메이션 특화 지시 */
  extraAttack?: string[];
  extraDefense?: string[];
  extraCommunication?: string[];
  extraStamina?: string[];
  extraCaution?: CautionItem[];
  /** 이 포메이션에서 실제 동료와의 연계 */
  linkage: LinkageItem[];
};

/** base + override 병합 결과 (화면 표시용) */
export type MergedPositionRole = {
  title: string;
  summary: string;
  whyItMatters: string;
  attack: string[];
  defense: string[];
  communication: string[];
  stamina: string[];
  caution: CautionItem[];
  linkage: LinkageItem[];
};

/** 포메이션 ID → (포지션 코드 → 오버라이드) 맵 */
export type FormationOverrideMap = Record<string, FormationPositionOverride>;
