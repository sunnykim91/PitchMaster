import type { DetailedPosition } from "@/lib/types";
import type { Player } from "./TacticsBoard.types";
import { roleToSubPosition } from "./AutoFormationBuilder.utils";

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

/**
 * "적합" 판정 — 선수의 포지션이 슬롯 포지션과 **정확히 일치**하는지.
 * 슬롯 role(RCB/LCB/LM 등)과 선수 포지션 모두 roleToSubPosition으로 13개 선호 포지션 단위
 * (CB/LW 등)로 정규화해 비교한다. 따라서 좌우·변형 슬롯(RCB↔LCB)은 같은 CB로 보되,
 * 카테고리만 같고 포지션이 다른 경우(CB 선수의 LB 슬롯 등)는 적합으로 보지 않는다.
 * roster의 preferredPositions는 "감독지정 우선(없으면 본인 선호)"으로 이미 구성돼 있어,
 * 감독지정이 있으면 감독지정과, 없으면 선호와 정확히 일치할 때만 true.
 */
export function isPositionMatched(player: Player | null | undefined, slotRole: DetailedPosition): boolean {
  if (!player) return false;
  const prefs = player.preferredPositions && player.preferredPositions.length > 0
    ? player.preferredPositions
    : [player.role];
  const slotSub = roleToSubPosition(slotRole);
  return prefs.some((p) => roleToSubPosition(p) === slotSub);
}
