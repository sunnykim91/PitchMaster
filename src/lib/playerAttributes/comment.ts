// PitchScore™ 룰 기반 한 줄 코멘트
// 카테고리별 평균에서 강점·약점 추출 → 별명 + 한국어 한 줄

import type { AttributeCategory } from "./types";

const STRENGTH_THRESHOLD = 4.0;
const WEAKNESS_THRESHOLD = 2.5;

export interface CategoryAvgInput {
  category: AttributeCategory;
  avg: number;
  count: number;
}

export interface PitchCommentResult {
  comment: string;
  archetype: string | null;
  strengths: AttributeCategory[];
  weaknesses: AttributeCategory[];
}

interface CategoryTone {
  strong: string;
  weak: string;
  name: string;
}

const CATEGORY_TONES: Record<AttributeCategory, CategoryTone> = {
  PACE:        { strong: "발이 빨라요",       weak: "스피드 아쉬워요",       name: "속도" },
  SHOOTING:    { strong: "결정력 강해요",     weak: "결정력 보강 필요해요",  name: "슈팅" },
  PASSING:     { strong: "패스 정확해요",     weak: "패스 약점 있어요",      name: "패스" },
  DRIBBLING:   { strong: "드리블 좋아요",     weak: "드리블 약점 있어요",    name: "드리블" },
  DEFENDING:   { strong: "수비 단단해요",     weak: "수비 가담 부족해요",    name: "수비" },
  PHYSICAL:    { strong: "체력·몸싸움 좋아요", weak: "피지컬 보강 필요해요",   name: "체력" },
  HEADING:     { strong: "공중볼 강해요",     weak: "공중볼 약해요",         name: "공중볼" },
  GOALKEEPING: { strong: "GK 안정적이에요",   weak: "GK 불안정해요",         name: "GK" },
};

// 강점 패턴 → 별명 (선언 순서대로 first-match)
const ARCHETYPE_PATTERNS: Array<{
  test: (s: Set<AttributeCategory>, w: Set<AttributeCategory>) => boolean;
  archetype: string;
}> = [
  { test: (s) => s.has("GOALKEEPING"), archetype: "안정적인 골키퍼" },
  { test: (s) => s.has("SHOOTING") && s.has("PACE") && s.has("DRIBBLING"), archetype: "폭발적인 공격수" },
  { test: (s) => s.has("PASSING") && s.has("DRIBBLING") && s.has("PHYSICAL"), archetype: "전천후 미드필더" },
  { test: (s) => s.has("DEFENDING") && s.has("HEADING") && s.has("PHYSICAL"), archetype: "믿음직한 수비수" },
  { test: (s, w) => s.has("PACE") && (s.has("PASSING") || s.has("DRIBBLING")) && w.has("DEFENDING"), archetype: "공격적인 윙어" },
  { test: (s) => s.has("PASSING") && s.has("DRIBBLING"), archetype: "플레이메이커" },
  { test: (s) => s.has("DEFENDING") && s.has("PASSING"), archetype: "현대적인 수비수" },
  { test: (s) => s.has("SHOOTING") && s.has("HEADING"), archetype: "타깃형 공격수" },
  { test: (s) => s.has("PHYSICAL") && s.has("DEFENDING"), archetype: "철벽 디펜더" },
  { test: (s) => s.has("PASSING") && s.has("PHYSICAL"), archetype: "박스투박스" },
];

export function generatePitchComment(
  categoryAvgs: CategoryAvgInput[],
): PitchCommentResult | null {
  const rated = categoryAvgs.filter((c) => c.count > 0);
  if (rated.length < 3) return null;

  const strengths: AttributeCategory[] = rated
    .filter((c) => c.avg >= STRENGTH_THRESHOLD)
    .sort((a, b) => b.avg - a.avg)
    .map((c) => c.category);

  const weaknesses: AttributeCategory[] = rated
    .filter((c) => c.avg <= WEAKNESS_THRESHOLD)
    .sort((a, b) => a.avg - b.avg)
    .map((c) => c.category);

  const sSet = new Set(strengths);
  const wSet = new Set(weaknesses);
  const archetype = ARCHETYPE_PATTERNS.find((p) => p.test(sSet, wSet))?.archetype ?? null;

  // 강점·약점 텍스트 조합
  const strongText = strengths.slice(0, 2).map((c) => CATEGORY_TONES[c].strong).join(" · ");
  const weakText = weaknesses[0] ? CATEGORY_TONES[weaknesses[0]].weak : "";

  let comment = "";
  if (archetype) {
    if (strongText && weakText) comment = `${archetype} — ${strongText} · ${weakText}`;
    else if (strongText) comment = `${archetype} — ${strongText}`;
    else if (weakText) comment = `${archetype} — 다만 ${weakText}`;
    else comment = archetype;
  } else if (strongText && weakText) {
    comment = `${strongText} · ${weakText}`;
  } else if (strongText) {
    comment = `${strongText}이 강점이에요`;
  } else if (weakText) {
    comment = weakText;
  } else {
    comment = "전반적으로 평균적인 균형형 선수";
  }

  return { comment, archetype, strengths, weaknesses };
}
