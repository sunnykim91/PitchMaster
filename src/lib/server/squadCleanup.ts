/**
 * 전술판 배치(match_squads.positions)에서 명단에 없는(빠진) 인원 제거.
 *
 * 용병 삭제·참석→불참 전환으로 더 이상 출전하지 않는 인원이 전술판에 "알 수 없음"
 * 슬롯으로 남는 걸 정리한다. (`/api/matches/cleanup-roster` 에서 사용)
 *
 * 규칙:
 * - 메타 슬롯(__referee·__linesman·__camera 등)은 출전 명단과 무관 → 건드리지 않음
 * - 전반 선수가 빠지고 후반(secondPlayerId)이 유효하면 후반을 전반으로 승격
 * - 후반 선수만 빠지면 secondPlayerId 만 제거 (전반 유지)
 * - 전·후반 모두 빠지면 슬롯 비움(null)
 */

export type SquadPosition =
  | { playerId: string; x: number; y: number; secondPlayerId?: string }
  | null;

/** 코어 — `keep(playerId)` 가 false 인 인원을 슬롯에서 제거. */
function scrubPositions(
  positions: Record<string, SquadPosition>,
  keep: (playerId: string) => boolean,
): { positions: Record<string, SquadPosition>; removed: number } {
  let removed = 0;
  const out: Record<string, SquadPosition> = {};

  for (const [slotId, pos] of Object.entries(positions ?? {})) {
    // 메타 슬롯(심판·부심·촬영)·빈 슬롯은 그대로 유지
    if (slotId.startsWith("__") || !pos) {
      out[slotId] = pos;
      continue;
    }

    const firstOk = keep(pos.playerId);
    const hasSecond = !!pos.secondPlayerId;
    const secondOk = hasSecond ? keep(pos.secondPlayerId as string) : true;

    if (firstOk && secondOk) {
      out[slotId] = pos;
    } else if (!firstOk && hasSecond && secondOk) {
      // 전반 빠짐 → 후반을 전반으로 승격
      out[slotId] = { playerId: pos.secondPlayerId as string, x: pos.x, y: pos.y };
      removed += 1;
    } else if (firstOk && hasSecond && !secondOk) {
      // 후반만 빠짐 → secondPlayerId 제거
      out[slotId] = { playerId: pos.playerId, x: pos.x, y: pos.y };
      removed += 1;
    } else {
      // 전반(+후반) 모두 빠짐 → 슬롯 비움
      out[slotId] = null;
      removed += 1;
    }
  }

  return { positions: out, removed };
}

/** 참석 명단(validIds)에 없는 인원을 전부 제거 — 정리 버튼/엔드포인트용. */
export function scrubAbsentFromPositions(
  positions: Record<string, SquadPosition>,
  validIds: Set<string>,
): { positions: Record<string, SquadPosition>; removed: number } {
  return scrubPositions(positions, (id) => validIds.has(id));
}

/** 특정 인원 1명만 제거 — 용병 삭제 시 자동 정리용. */
export function removePlayerFromPositions(
  positions: Record<string, SquadPosition>,
  playerId: string,
): { positions: Record<string, SquadPosition>; removed: number } {
  return scrubPositions(positions, (id) => id !== playerId);
}
