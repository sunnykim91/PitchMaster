/**
 * 자체전(INTERNAL) 팀 구분 — A/B/C 최대 3팀.
 *
 * A/B 2팀 하드코딩을 이 파일 하나로 모음. 팀별 라벨·색상 클래스를 여기서만
 * 관리하고 UI는 config 를 돌려서 렌더한다. (Tailwind 가 .ts 도 스캔하므로
 * 클래스 문자열을 리터럴로 박아두면 JIT 가 생성함)
 *
 * 점수는 "팀별 골 합계 + 가벼운 수기 승/무/패 카운트"만 — 매치업별 결과는 저장 안 함.
 */

export type InternalSide = "A" | "B" | "C";

export const MAX_INTERNAL_TEAMS = 3;

export interface InternalSideConfig {
  side: InternalSide;
  label: string;
  /** 골 카드/그룹 라벨용 이모지 점 */
  emoji: string;
  /** 텍스트 색 (요약·탭·라벨) */
  text: string;
  /** 카드 테두리 */
  border: string;
  /** 카드 배경 */
  bg: string;
  /** 활성 탭 스타일 */
  tabActive: string;
  /** 골 카드/칩 배경 (Phase 2) */
  chipBg: string;
}

export const INTERNAL_SIDES: InternalSideConfig[] = [
  {
    side: "A",
    label: "A팀",
    emoji: "🔴",
    text: "text-primary",
    border: "border-primary/30",
    bg: "bg-[hsl(var(--primary)_/_0.05)]",
    tabActive: "border-primary bg-[hsl(var(--primary)_/_0.1)] text-primary",
    chipBg: "bg-[hsl(var(--primary)_/_0.15)]",
  },
  {
    side: "B",
    label: "B팀",
    emoji: "🔵",
    text: "text-[hsl(var(--info))]",
    border: "border-[hsl(var(--info))]/30",
    bg: "bg-[hsl(var(--info)_/_0.05)]",
    tabActive: "border-[hsl(var(--info))] bg-[hsl(var(--info)_/_0.1)] text-[hsl(var(--info))]",
    chipBg: "bg-[hsl(var(--info)_/_0.15)]",
  },
  {
    side: "C",
    label: "C팀",
    emoji: "🟢",
    text: "text-[hsl(var(--success))]",
    border: "border-[hsl(var(--success))]/30",
    bg: "bg-[hsl(var(--success)_/_0.05)]",
    tabActive: "border-[hsl(var(--success))] bg-[hsl(var(--success)_/_0.1)] text-[hsl(var(--success))]",
    chipBg: "bg-[hsl(var(--success)_/_0.15)]",
  },
];

/** 팀 수(2~3)에 해당하는 side 배열 */
export function sidesForCount(count: number): InternalSide[] {
  const n = Math.max(2, Math.min(count, MAX_INTERNAL_TEAMS));
  return INTERNAL_SIDES.slice(0, n).map((s) => s.side);
}

export function sideConfig(side: InternalSide): InternalSideConfig {
  return INTERNAL_SIDES.find((s) => s.side === side) ?? INTERNAL_SIDES[0];
}

/** "A" → "A팀" (문자열 입력 허용 — 알 수 없으면 `${side}팀`) */
export function sideLabel(side: string): string {
  return INTERNAL_SIDES.find((s) => s.side === side)?.label ?? `${side}팀`;
}

/** 배정 맵 → API payload. 실제 배정된 side 만 포함 */
export function buildTeamsPayload(map: Record<string, InternalSide>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const { side } of INTERNAL_SIDES) {
    const ids = Object.entries(map)
      .filter(([, s]) => s === side)
      .map(([id]) => id);
    if (ids.length > 0) out[side] = ids;
  }
  return out;
}

/** 다음 팀으로 순환 (배정 토글: A→B→C→A) */
export function nextSide(current: InternalSide, sides: InternalSide[]): InternalSide {
  const i = sides.indexOf(current);
  if (i < 0) return sides[0];
  return sides[(i + 1) % sides.length];
}

/**
 * 미배정 인원만 균형 배정 — 기존 배정은 건드리지 않는 증분 분배.
 *
 * 전원 재셔플하는 자동분배와 달리, 이미 팀이 나뉜 뒤 합류한 용병·추가 참석자를
 * 현재 인원이 가장 적은 팀부터 채워 인원 균형을 맞춘다.
 *
 * @param orderedIds 배정할 미배정 인원 id (호출부에서 셔플해 넘기면 동률 시 랜덤 효과)
 * @param currentCounts 팀별 현재 인원 수
 * @param sides 활성 팀(2~3)
 * @returns id → side **추가** 맵 (기존 배정은 포함 안 함)
 */
export function distributeToBalance(
  orderedIds: string[],
  currentCounts: Partial<Record<InternalSide, number>>,
  sides: InternalSide[],
): Record<string, InternalSide> {
  const counts: Record<string, number> = {};
  for (const s of sides) counts[s] = currentCounts[s] ?? 0;
  const out: Record<string, InternalSide> = {};
  for (const id of orderedIds) {
    // 인원이 가장 적은 팀 — 동률이면 sides 순서(A→B→C) 우선
    let target = sides[0];
    for (const s of sides) if (counts[s] < counts[target]) target = s;
    out[id] = target;
    counts[target] += 1;
  }
  return out;
}

/** 팀별 가벼운 승/무/패 수기 카운트 (matches.internal_team_results JSONB) */
export interface SideRecord { w: number; d: number; l: number; }
export type InternalTeamResults = Partial<Record<InternalSide, SideRecord>>;
export const EMPTY_RECORD: SideRecord = { w: 0, d: 0, l: 0 };
