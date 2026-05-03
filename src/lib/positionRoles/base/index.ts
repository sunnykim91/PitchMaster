/**
 * 포지션 베이스 역할 통합 — 24종
 *
 * DetailedPosition 코드와 동일한 키를 사용해서
 * 포메이션 슬롯의 role 필드로 바로 조회 가능.
 */

import type { PositionBaseRole } from "../types";
import { DEFENDERS_BASE } from "./defenders";
import { MIDFIELDERS_BASE } from "./midfielders";
import { FORWARDS_BASE } from "./forwards";
import { FUTSAL_BASE } from "./futsal";

export const POSITION_BASE_ROLES: Record<string, PositionBaseRole> = {
  ...DEFENDERS_BASE,
  ...MIDFIELDERS_BASE,
  ...FORWARDS_BASE,
  ...FUTSAL_BASE,
};

export { DEFENDERS_BASE, MIDFIELDERS_BASE, FORWARDS_BASE, FUTSAL_BASE };
