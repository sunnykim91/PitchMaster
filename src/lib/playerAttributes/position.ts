// PitchScore™ 룰 기반 적합 포지션 추천
// 포지션별 핵심 능력치 평균 → TOP 3

import type { AttributeCode } from "./types";

interface PositionFormula {
  name_ko: string;
  codes: AttributeCode[];
}

export const POSITION_FORMULAS: Record<string, PositionFormula> = {
  ST:  { name_ko: "스트라이커",       codes: ["FINISHING", "SHOT_POWER", "DRIBBLING", "HEADING", "SPEED"] },
  LW:  { name_ko: "레프트 윙",        codes: ["SPEED", "DRIBBLING", "CROSS", "FINISHING"] },
  RW:  { name_ko: "라이트 윙",        codes: ["SPEED", "DRIBBLING", "CROSS", "FINISHING"] },
  CAM: { name_ko: "공격형 미드",      codes: ["VISION", "SHORT_PASS", "LONG_PASS", "DRIBBLING", "FINISHING"] },
  CM:  { name_ko: "중앙 미드",        codes: ["SHORT_PASS", "STAMINA", "VISION", "BREAK_PRESS"] },
  CDM: { name_ko: "수비형 미드",      codes: ["INTERCEPT", "TACKLING", "STAMINA", "SHORT_PASS", "POSITIONING"] },
  CB:  { name_ko: "센터백",           codes: ["TACKLING", "POSITIONING", "CLEARING", "HEADING", "STRENGTH"] },
  LB:  { name_ko: "레프트백",         codes: ["SPEED", "TACKLING", "CROSS", "STAMINA", "POSITIONING"] },
  RB:  { name_ko: "라이트백",         codes: ["SPEED", "TACKLING", "CROSS", "STAMINA", "POSITIONING"] },
  GK:  { name_ko: "골키퍼",           codes: ["GK_REFLEX", "GK_HANDLING", "GK_FOOT", "GK_LONG_KICK"] },
};

export interface AttributeScoreLookup {
  pitch_score: number;
  sample_count: number;
  name_ko: string;
}

export interface PositionRecommendation {
  position: string;
  name_ko: string;
  score: number;        // 평균 능력치 (0~5)
  matched_count: number; // 평가가 있는 능력치 갯수
  top_attributes: { code: AttributeCode; name_ko: string; score: number }[];
}

export function recommendPositions(
  scoreMap: Map<AttributeCode, AttributeScoreLookup>,
  isGoalkeeper: boolean = false,
  limit: number = 3,
): PositionRecommendation[] {
  const candidates = isGoalkeeper
    ? ["GK"]
    : Object.keys(POSITION_FORMULAS).filter((p) => p !== "GK");

  // 평가가 없는 능력치는 중립값(3.0) 가정 — 일부 능력치만 강한 포지션이 잘못 1위 되는 것 방지
  const NEUTRAL = 3.0;

  const ranked = candidates.map((pos) => {
    const formula = POSITION_FORMULAS[pos];
    const ratedItems = formula.codes
      .map((c) => {
        const s = scoreMap.get(c);
        if (s && s.sample_count > 0) {
          return { code: c, name_ko: s.name_ko, score: s.pitch_score, count: s.sample_count };
        }
        return null;
      })
      .filter((s): s is { code: AttributeCode; name_ko: string; score: number; count: number } => s !== null);

    // 능력치별 효과적 점수 (평가 있으면 실제, 없으면 3.0)
    const totalScore = formula.codes.reduce((sum, c) => {
      const s = scoreMap.get(c);
      return sum + (s && s.sample_count > 0 ? s.pitch_score : NEUTRAL);
    }, 0);
    const avg = totalScore / formula.codes.length;

    const top = [...ratedItems]
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((s) => ({ code: s.code, name_ko: s.name_ko, score: s.score }));

    return {
      position: pos,
      name_ko: formula.name_ko,
      score: Math.round(avg * 100) / 100,
      matched_count: ratedItems.length,
      top_attributes: top,
    };
  });

  return ranked
    .filter((r) => r.matched_count > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
