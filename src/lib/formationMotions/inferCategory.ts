import type { AnimationCategory, TacticalAnimationData } from "./dbTypes";

/**
 * 영상의 카테고리 추정 — P3 평면화 전까지 폴백.
 *
 * 우선순위:
 *  1. animation_data.category가 명시되어 있으면 그대로 사용
 *  2. phase 라벨에 세트피스·전환 키워드 → SETPIECE / TRANSITION
 *  3. 공격 phase가 더 많으면 ATTACK, 수비가 더 많으면 DEFENSE
 *  4. 폴백 ATTACK
 */
export function inferAnimationCategory(data: TacticalAnimationData | null | undefined): AnimationCategory {
  if (!data) return "ATTACK";
  if (data.category) return data.category;

  const allLabels = [...(data.attack ?? []), ...(data.defense ?? [])]
    .map((p) => (p.label ?? "").toLowerCase());
  const joined = allLabels.join(" ");

  if (/(세트피스|코너|코너킥|프리킥|킥오프|페널티|throw[- ]?in|free[- ]?kick)/.test(joined)) {
    return "SETPIECE";
  }
  if (/(전환|trans|역습|카운터)/.test(joined)) {
    return "TRANSITION";
  }
  const attackPhases = (data.attack ?? []).length;
  const defensePhases = (data.defense ?? []).length;
  if (defensePhases > attackPhases) return "DEFENSE";
  return "ATTACK";
}
