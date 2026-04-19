/**
 * 포지션 역할 조회 엔트리 포인트
 *
 * 사용법:
 *   getPositionRole("4-2-3-1", "LCB") → MergedPositionRole | null
 *
 * 내부적으로 POSITION_BASE_ROLES[roleCode] 와 FORMATION_OVERRIDES[formationId][roleCode] 를
 * 병합해서 화면에 그대로 렌더링할 수 있는 형태로 반환.
 */

import { POSITION_BASE_ROLES } from "./base";
import { FORMATION_OVERRIDES } from "./overrides";
import type {
  FormationPositionOverride,
  MergedPositionRole,
  PositionBaseRole,
} from "./types";

function mergeRole(
  base: PositionBaseRole,
  override: FormationPositionOverride
): MergedPositionRole {
  return {
    title: base.title,
    summary: base.summary,
    whyItMatters: override.whyItMatters,
    attack: [...base.attack, ...(override.extraAttack ?? [])],
    defense: [...base.defense, ...(override.extraDefense ?? [])],
    communication: [...base.communication, ...(override.extraCommunication ?? [])],
    stamina: [...base.stamina, ...(override.extraStamina ?? [])],
    caution: [...base.caution, ...(override.extraCaution ?? [])],
    linkage: override.linkage,
  };
}

/**
 * 특정 포메이션의 특정 포지션 역할 조회
 *
 * @param formationId "4-2-3-1", "4-4-2" 등 formations.ts id
 * @param roleCode "LCB", "CAM" 등 DetailedPosition 코드
 * @returns 병합된 역할 정보. 베이스 또는 오버라이드 없으면 null
 */
export function getPositionRole(
  formationId: string,
  roleCode: string
): MergedPositionRole | null {
  const base = POSITION_BASE_ROLES[roleCode];
  if (!base) return null;

  const formationOverride = FORMATION_OVERRIDES[formationId];
  const override = formationOverride?.[roleCode];
  if (!override) return null;

  return mergeRole(base, override);
}

/**
 * 특정 포지션의 베이스 역할만 조회 (포메이션 맥락 없이)
 */
export function getPositionBaseRole(roleCode: string): PositionBaseRole | null {
  return POSITION_BASE_ROLES[roleCode] ?? null;
}

/**
 * 특정 포메이션의 모든 포지션 역할 조회
 *
 * @returns roleCode → MergedPositionRole 맵. 오버라이드 없는 포지션은 제외.
 */
export function getAllPositionRolesForFormation(
  formationId: string
): Record<string, MergedPositionRole> {
  const formationOverride = FORMATION_OVERRIDES[formationId];
  if (!formationOverride) return {};

  const result: Record<string, MergedPositionRole> = {};
  for (const [roleCode, override] of Object.entries(formationOverride)) {
    const base = POSITION_BASE_ROLES[roleCode];
    if (base) {
      result[roleCode] = mergeRole(base, override);
    }
  }
  return result;
}

export type { MergedPositionRole, PositionBaseRole, FormationPositionOverride };
export { POSITION_BASE_ROLES, FORMATION_OVERRIDES };
