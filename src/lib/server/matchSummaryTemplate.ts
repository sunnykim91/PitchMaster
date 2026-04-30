/**
 * 경기 후기 템플릿 생성기 — AI 대체 (팩트 엄수·비용 0·지연 0ms)
 *
 * 설계 원칙:
 * - 입력 데이터에 있는 사실만 서술 (환각 없음)
 * - 정보 부재 시 해당 단락/문장 생략
 * - 카톡 공유 톤 (3단락, 200~300자 내외)
 */

import type { MatchSummaryInput } from "@/lib/server/aiMatchSummary";

/** "2026-04-13" → "4월 13일" */
function formatKoreanDate(iso: string): string {
  if (!iso) return "";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${Number(m[2])}월 ${Number(m[3])}일`;
}

/** score + result 로부터 자연스러운 결과 문구 */
function resolveResultText(score: { us: number; opp: number } | null, result: "W" | "D" | "L" | null): string {
  if (!score) return "경기";
  const { us, opp } = score;
  const diff = Math.abs(us - opp);
  if (result === "D" || diff === 0) return `${us}-${opp} 무승부`;
  if (result === "W") {
    if (diff >= 5) return `${us}-${opp} 대승`;
    if (diff <= 2) return `${us}-${opp} 신승`;
    return `${us}-${opp}으로 승리`;
  }
  if (result === "L") {
    if (diff >= 5) return `${us}-${opp} 대패`;
    if (diff <= 2) return `${us}-${opp} 아쉬운 패배`;
    return `${us}-${opp} 패배`;
  }
  return `${us}-${opp} 경기`;
}

/** 마지막 글자의 받침 여부로 주격 조사 '이/가' 반환 */
function getJosa이가(str: string): string {
  if (!str) return "이(가)";
  const last = str.charAt(str.length - 1);
  const code = last.charCodeAt(0);
  if (code < 0xAC00 || code > 0xD7A3) return "이(가)"; // 한글 외 문자 fallback
  const hasBatchim = (code - 0xAC00) % 28 !== 0;
  return hasBatchim ? "이" : "가";
}

/** 중복 제거하되 순서 유지 */
function unique<T>(arr: T[]): T[] {
  const seen = new Set<T>();
  const out: T[] = [];
  for (const x of arr) {
    if (!seen.has(x)) { seen.add(x); out.push(x); }
  }
  return out;
}

/** N명 초과 시 상위 N명만 + "외 M명" 처리 */
function joinNamesWithOverflow(names: string[], max: number = 6): string {
  const list = unique(names);
  if (list.length === 0) return "";
  if (list.length <= max) return list.join(", ");
  return `${list.slice(0, max).join(", ")} 외 ${list.length - max}명`;
}

/** 2단락: 득점자·어시스트·MOM 서술 */
function buildHighlightsParagraph(input: MatchSummaryInput): string {
  const scorerNames = input.goals.map((g) => g.scorerName);
  const assistNames = input.assists;
  const uniqueScorers = unique(scorerNames);
  const uniqueAssists = unique(assistNames);

  const parts: string[] = [];

  // 득점 서술
  if (uniqueScorers.length === 1) {
    const name = uniqueScorers[0];
    const count = scorerNames.filter((n) => n === name).length;
    if (count >= 2) {
      parts.push(`${name}${getJosa이가(name)} ${count}골로 득점을 책임졌습니다.`);
    } else {
      parts.push(`${name}${getJosa이가(name)} 득점했습니다.`);
    }
  } else if (uniqueScorers.length >= 2) {
    // 여러 명 — 최다 득점자 강조 여부
    const counts = new Map<string, number>();
    for (const n of scorerNames) counts.set(n, (counts.get(n) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] >= 3) {
      // 한 명이 3골+ 이면 강조
      const others = uniqueScorers.filter((n) => n !== top[0]);
      parts.push(
        `${top[0]}${getJosa이가(top[0])} ${top[1]}골로 득점을 주도했고, ${joinNamesWithOverflow(others, 5)}도 득점에 가세했습니다.`
      );
    } else {
      const joined = joinNamesWithOverflow(uniqueScorers, 6);
      parts.push(`${joined}${getJosa이가(joined)} 득점을 나눠 쌓았습니다.`);
    }
  }

  // 어시스트
  if (uniqueAssists.length > 0) {
    parts.push(`어시스트는 ${joinNamesWithOverflow(uniqueAssists, 5)}.`);
  }

  // MOM
  if (input.mom) {
    parts.push(`MOM은 ${input.mom}.`);
  }

  return parts.join(" ");
}

/** 3단락: 참석 + 장소 */
function buildFooterParagraph(input: MatchSummaryInput): string {
  const bits: string[] = [];
  if (input.attendanceCount > 0) bits.push(`참석 ${input.attendanceCount}명`);
  if (input.location) bits.push(input.location);
  return bits.join(" · ");
}

/** 일반 경기 (REGULAR) */
function buildRegularSummary(input: MatchSummaryInput): string {
  const date = formatKoreanDate(input.date);
  const opp = input.opponent?.trim() ? input.opponent : "상대팀";
  const resultText = resolveResultText(input.score, input.result);

  const line1 = `${date} ${opp}전 ${resultText}.`;
  const line2 = buildHighlightsParagraph(input);
  const line3 = buildFooterParagraph(input);

  // 득점 전무 + 스코어도 없음 → 경기 기록이 사실상 없음
  if (!line2 && !input.score) {
    const fallback = input.mom
      ? `MOM은 ${input.mom}.`
      : "";
    return [line1, fallback, line3].filter(Boolean).join("\n\n");
  }

  return [line1, line2, line3].filter(Boolean).join("\n\n");
}

/** 자체전 (INTERNAL) — 우리팀 vs 상대 구도 아닌 A팀 vs B팀 */
function buildInternalSummary(input: MatchSummaryInput): string {
  const date = formatKoreanDate(input.date);
  let header = `${date} 자체전`;
  if (input.score) {
    const { us, opp } = input.score;
    header += ` A팀 ${us}-${opp} B팀`;
  }
  header += ".";

  const line2 = buildHighlightsParagraph(input);
  const line3 = buildFooterParagraph(input);

  return [header, line2, line3].filter(Boolean).join("\n\n");
}

/** EVENT — 회식·MT 등 */
function buildEventSummary(input: MatchSummaryInput): string {
  const date = formatKoreanDate(input.date);
  const bits = [`${date} 팀 모임`];
  if (input.attendanceCount > 0) bits.push(`참석 ${input.attendanceCount}명`);
  if (input.location) bits.push(input.location);
  return bits.join(" · ");
}

/**
 * 메인 진입점 — 경기 정보로부터 후기 텍스트 생성.
 * AI 호출 없이 결정론적으로 팩트 기반 서술.
 */
export function generateMatchSummaryFromTemplate(input: MatchSummaryInput): string {
  if (input.matchType === "EVENT") return buildEventSummary(input);
  if (input.matchType === "INTERNAL") return buildInternalSummary(input);
  return buildRegularSummary(input);
}
