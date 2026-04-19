/**
 * 쿼터별 포지션 배치 → 선수 관점 그룹화
 *
 * match_squads(JSONB positions) 형태를 받아 특정 선수의
 * 쿼터별 포지션을 뽑고, 연속된 같은 (formationId, role) 구간을
 * [startQ, endQ] 단위로 묶어 카드 표시에 적합한 형태로 변환.
 *
 * 참여 안 한 쿼터는 결과에서 제외 (벤치 별도 표시는 UI 레벨에서).
 */

import { formationTemplates } from "@/lib/formations";
import { getPositionRole } from "./index";
import type { MergedPositionRole } from "./types";

export type SquadPosition = {
  playerId: string;
  x?: number;
  y?: number;
  secondPlayerId?: string;
};

export type MatchSquadRow = {
  quarter_number: number;
  formation: string;
  positions: Record<string, SquadPosition | null>;
};

/** 한 쿼터 안에서의 단일 배치 */
export type QuarterAssignment = {
  quarter: number;
  formationId: string;
  slotId: string;
  role: string;
};

/** 연속된 같은 포지션을 묶은 표시 단위 */
export type AssignmentGroup = {
  /** inclusive. 단일 쿼터면 start === end */
  quarterStart: number;
  quarterEnd: number;
  formationId: string;
  role: string;
  /** base+override 병합 결과 — 11인제 외 포메이션이면 null */
  mergedRole: MergedPositionRole | null;
};

/** formation id + slot id → role 코드 조회 */
function findRoleForSlot(formationId: string, slotId: string): string | null {
  const tpl = formationTemplates.find((f) => f.id === formationId);
  if (!tpl) return null;
  const slot = tpl.slots.find((s) => s.id === slotId);
  return slot?.role ?? null;
}

/**
 * match_squads에서 특정 선수의 쿼터별 배치 뽑기.
 * secondPlayerId(하프쿼터 교체)도 동일한 쿼터 배치로 인식.
 */
export function extractPlayerAssignments(
  squads: MatchSquadRow[],
  targetPlayerIds: string[]
): QuarterAssignment[] {
  const targetSet = new Set(targetPlayerIds.filter(Boolean));
  if (targetSet.size === 0) return [];

  const result: QuarterAssignment[] = [];
  for (const squad of squads) {
    const formationId = squad.formation;
    for (const [slotId, pos] of Object.entries(squad.positions ?? {})) {
      if (!pos) continue;
      const matched =
        (pos.playerId && targetSet.has(pos.playerId)) ||
        (pos.secondPlayerId && targetSet.has(pos.secondPlayerId));
      if (!matched) continue;
      const role = findRoleForSlot(formationId, slotId);
      if (!role) continue;
      result.push({
        quarter: squad.quarter_number,
        formationId,
        slotId,
        role,
      });
      // 같은 쿼터에 한 선수가 두 슬롯에 등록되는 건 비정상이지만,
      // 데이터 상 가능하면 모두 포함.
    }
  }

  result.sort((a, b) => a.quarter - b.quarter);
  return result;
}

/**
 * 쿼터 순회하며 연속된 같은 (formationId, role)을 [start, end] 구간으로 묶음.
 * 중간에 불참(없는 쿼터)이 있으면 구간이 끊어짐.
 */
export function groupAssignments(
  assignments: QuarterAssignment[]
): AssignmentGroup[] {
  if (assignments.length === 0) return [];

  const groups: AssignmentGroup[] = [];
  let current: AssignmentGroup | null = null;

  for (const a of assignments) {
    const same =
      current !== null &&
      current.formationId === a.formationId &&
      current.role === a.role &&
      current.quarterEnd + 1 === a.quarter;

    if (same && current) {
      current.quarterEnd = a.quarter;
    } else {
      if (current) groups.push(current);
      current = {
        quarterStart: a.quarter,
        quarterEnd: a.quarter,
        formationId: a.formationId,
        role: a.role,
        mergedRole: getPositionRole(a.formationId, a.role),
      };
    }
  }
  if (current) groups.push(current);
  return groups;
}

/** 전체 파이프라인 단축 호출 */
export function buildAssignmentGroups(
  squads: MatchSquadRow[],
  targetPlayerIds: string[]
): AssignmentGroup[] {
  return groupAssignments(extractPlayerAssignments(squads, targetPlayerIds));
}

/**
 * 포메이션 전체 슬롯의 역할 카드 조회 (전술판 미작성 시 운영진 폴백).
 * 11인제 포메이션만 오버라이드 존재 — 없으면 빈 배열 반환.
 */
export function getAllRolesForFormation(
  formationId: string
): Array<{ slotId: string; role: string; mergedRole: MergedPositionRole | null }> {
  const tpl = formationTemplates.find((f) => f.id === formationId);
  if (!tpl) return [];
  return tpl.slots.map((s) => ({
    slotId: s.id,
    role: s.role,
    mergedRole: getPositionRole(formationId, s.role),
  }));
}
