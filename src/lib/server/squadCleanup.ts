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

export function scrubAbsentFromPositions(
  positions: Record<string, SquadPosition>,
  validIds: Set<string>,
): { positions: Record<string, SquadPosition>; removed: number } {
  let removed = 0;
  const out: Record<string, SquadPosition> = {};

  for (const [slotId, pos] of Object.entries(positions ?? {})) {
    // 메타 슬롯(심판·부심·촬영)·빈 슬롯은 그대로 유지
    if (slotId.startsWith("__") || !pos) {
      out[slotId] = pos;
      continue;
    }

    const firstOk = validIds.has(pos.playerId);
    const hasSecond = !!pos.secondPlayerId;
    const secondOk = hasSecond ? validIds.has(pos.secondPlayerId as string) : true;

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
