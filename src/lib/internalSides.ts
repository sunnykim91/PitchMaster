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
    text: "text-primary",
    border: "border-primary/30",
    bg: "bg-primary/5",
    tabActive: "border-primary bg-primary/10 text-primary",
    chipBg: "bg-primary/15",
  },
  {
    side: "B",
    label: "B팀",
    text: "text-[hsl(var(--info))]",
    border: "border-[hsl(var(--info))]/30",
    bg: "bg-[hsl(var(--info))]/5",
    tabActive: "border-[hsl(var(--info))] bg-[hsl(var(--info))]/10 text-[hsl(var(--info))]",
    chipBg: "bg-[hsl(var(--info))]/15",
  },
  {
    side: "C",
    label: "C팀",
    text: "text-[hsl(var(--success))]",
    border: "border-[hsl(var(--success))]/30",
    bg: "bg-[hsl(var(--success))]/5",
    tabActive: "border-[hsl(var(--success))] bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
    chipBg: "bg-[hsl(var(--success))]/15",
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
