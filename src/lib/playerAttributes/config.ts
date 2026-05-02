// PitchScore™ Triple Trust 알고리즘 — 가중치 설정
// 누가(authority) × 언제(recency) × 어떻게(formality) 평가했는지를 모두 반영

import type { EvaluationSource, EvaluationContext, AttributeCategory } from './types';

export const PITCHSCORE_VERSION = 'v1.0';
export const ALGORITHM_NAME = 'Triple Trust';
export const PRODUCT_NAME = 'PitchScore™';

// ============================================================
// Authority (영향력) — 누가 평가했나
// ============================================================
export const AUTHORITY_WEIGHTS: Record<EvaluationSource, number> = {
  STAFF: 1.3,   // 운영진(회장·스태프): 가장 큰 영향력
  PEER:  1.0,   // 일반 회원: 기준 가중치
  SELF:  0.7,   // 본인 자가 평가: 객관성 보정
};

// ============================================================
// Recency (신선도) — 얼마나 최근인가
// ============================================================
export function calculateRecencyWeight(daysAgo: number): number {
  if (daysAgo < 0) return 1.0;
  if (daysAgo <= 90)  return 1.0;
  if (daysAgo <= 180) return 0.85;
  if (daysAgo <= 365) return 0.7;
  return 0.5;
}

// ============================================================
// Formality (정식성) — 어떤 상황에서 평가했나
// ============================================================
// SELF는 source 자체가 자가라서 formality도 낮음 (0.7)
// 그 외는 context로 결정 (ROUND 정식 라운드 1.0, 그 외 0.85)
export function calculateFormalityWeight(
  source: EvaluationSource,
  context: EvaluationContext,
): number {
  if (source === 'SELF') return 0.7;
  if (context === 'ROUND') return 1.0;
  return 0.85; // FREE, POST_MATCH
}

// ============================================================
// 카테고리 메타 데이터 (UI용)
// ============================================================
export const CATEGORY_META: Record<AttributeCategory, { name_ko: string; emoji: string; color: string }> = {
  PACE:        { name_ko: '속도',   emoji: '🚀', color: '#22c55e' },
  SHOOTING:    { name_ko: '슈팅',   emoji: '⚽', color: '#ef4444' },
  PASSING:     { name_ko: '패스',   emoji: '🎯', color: '#3b82f6' },
  DRIBBLING:   { name_ko: '드리블', emoji: '🌀', color: '#a855f7' },
  DEFENDING:   { name_ko: '수비',   emoji: '🛡️', color: '#14b8a6' },
  PHYSICAL:    { name_ko: '체력',   emoji: '💪', color: '#f97316' },
  HEADING:     { name_ko: '공중볼', emoji: '🤜', color: '#eab308' },
  GOALKEEPING: { name_ko: 'GK',     emoji: '🧤', color: '#64748b' },
};
