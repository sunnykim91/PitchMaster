import type { DetailedPosition } from "@/lib/types";
import type { Player } from "./TacticsBoard.types";

export const SAVE_DEBOUNCE_MS = 300;

/** 메타 슬롯(주심/부심/촬영) → 한글 역할 라벨. formation.slots엔 없어서 별도 매핑 (없으면 "배치" fallback) */
export const META_SLOT_LABELS: Record<string, string> = {
  __referee: "주심",
  __linesman1: "부심1",
  __linesman2: "부심2",
  __camera: "촬영",
};

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/**
 * 선수의 출전 쿼터 가중 합산: full=1쿼터, first/second(반쿼터)=0.5쿼터.
 * 쿼터 개수(map.size)로 세면 반쿼터가 1로 계산돼 2.5쿼터가 3쿼터로 표시되는 버그가 남.
 */
export function sumPlayedQuarters(
  qTypeMap: Map<number, "full" | "first" | "second"> | undefined
): number {
  if (!qTypeMap) return 0;
  return Array.from(qTypeMap.values()).reduce(
    (sum, type) => sum + (type === "full" ? 1 : 0.5),
    0
  );
}

/** 쿼터 합계 표시: 정수는 그대로, 반쿼터가 있으면 소수 1자리 (예: 2.5) */
export function formatQuarterTotal(total: number): string {
  return total % 1 === 0 ? String(total) : total.toFixed(1);
}

/** DetailedPosition → 카테고리(GK/DF/MF/FW) */
export function positionCategory(role: DetailedPosition): "GK" | "DF" | "MF" | "FW" {
  if (role === "GK") return "GK";
  if (["RB", "RCB", "CB", "LCB", "LB", "RWB", "LWB"].includes(role)) return "DF";
  if (["RDM", "LDM", "CDM", "RCM", "CM", "LCM", "CAM", "RAM", "LAM", "RM", "LM", "MF"].includes(role)) return "MF";
  return "FW"; // RW, LW, CF, ST, RS, LS, FW
}

/** 선수의 선호 포지션 중 하나라도 슬롯 포지션과 같은 카테고리면 true */
export function isPositionMatched(player: Player | null | undefined, slotRole: DetailedPosition): boolean {
  if (!player) return false;
  const prefs = player.preferredPositions && player.preferredPositions.length > 0
    ? player.preferredPositions
    : [player.role];
  const slotCat = positionCategory(slotRole);
  return prefs.some((p) => positionCategory(p) === slotCat);
}
