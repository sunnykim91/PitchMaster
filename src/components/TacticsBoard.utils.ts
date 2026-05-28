import type { DetailedPosition } from "@/lib/types";
import type { Player } from "./TacticsBoard.types";

export const SAVE_DEBOUNCE_MS = 300;

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

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
