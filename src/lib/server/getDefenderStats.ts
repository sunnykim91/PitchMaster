import type { Placement } from "@/components/TacticsBoard.types";

/**
 * 필드 수비수(센터백·풀백·윙백) 무실점 쿼터 집계 — 순수 함수 (DB 비의존).
 *
 * 노진우(FC.LIBRE B) 요청 2026-07-06 최초 구현 → 서경카페 피드백(2026-07-12)으로
 * 키퍼와 통합. 전술판에 수비로 선 인원의 "무실점 쿼터"를 센다.
 *
 * 산식(통합 수비 포인트의 필드수비 몫): 무실점 쿼터 1개당 1점.
 *  - 키퍼(getGoalkeeperStats)는 무실점 쿼터 1개당 2점 — 호출부에서 gk×2 + def×1 로 합산한다.
 *  - 무실점 쿼터: 수비수가 전술판에 선 쿼터 중 그 쿼터 실점(OPPONENT/자책)이 0인 쿼터.
 *
 * 정책:
 *  - 가산 전용(감점 없음). 쿼터 미기입 실점은 무실점 쿼터를 부풀릴 뿐 감점 왜곡은 없다.
 *  - 전술판 있는 경기만 (GK와 달리 폴백 없음 — 수비수는 선호 포지션 추정이 부정확).
 *  - 상대전(side IS NULL)만. 자체전(A/B)은 includeInternal=false 기본 제외.
 *  - 대상 role: CB·LCB·RCB(센터백), LB·RB(풀백), LWB·RWB(윙백). 수비형 미드(CDM/LDM/RDM)·풋살 FIXO 제외.
 *  - 반쿼터 교체(secondPlayerId): 그 쿼터 무실점이면 두 수비수 모두 +1.
 *
 * 반환 Map 키: positions.playerId (users.id/team_members.id/게스트 혼재).
 * 호출부에서 멤버의 [user_id, member_id] 양쪽으로 합산하면 흡수된다.
 */

/** 필드수비 무실점 쿼터 1개당 포인트 (키퍼는 2점 — getGoalkeeperStats 참조) */
export const DEFENDER_CLEAN_QUARTER_POINTS = 1;

/** 수비 role (전술판 slot id 를 대문자화하면 role 과 일치). 센터백·풀백·윙백. */
const DEFENDER_ROLES = new Set(["CB", "LCB", "RCB", "LB", "RB", "LWB", "RWB"]);

export type DefenderSquadRow = {
  match_id: string;
  quarter_number: number | null;
  positions: Record<string, unknown> | null;
  side?: string | null;
};

export type DefenderGoalRow = {
  match_id: string;
  quarter_number: number | null;
  scorer_id: string | null;
  is_own_goal: boolean | null;
  side?: string | null;
};

export type DefenderStat = {
  cleanQuarters: number;
  points: number;
};

/** 요약 스탯 */
export type DefenderSummary = { cleanQuarters: number; points: number };

/** 슬롯 키가 수비(센터백·풀백·윙백)인지 — 메타슬롯(__) 제외, slot id 대문자화 == role */
export function isDefenderSlot(slot: string): boolean {
  if (slot.startsWith("__")) return false;
  return DEFENDER_ROLES.has(slot.toUpperCase());
}

/** 무실점 쿼터 → 포인트 환산 (단일 소스) */
export function computeDefenderPoints(cleanQuarters: number): number {
  return cleanQuarters * DEFENDER_CLEAN_QUARTER_POINTS;
}

/** 우리 골문에 들어간 골(실점) 판정 */
function isConceded(g: DefenderGoalRow): boolean {
  return g.scorer_id === "OPPONENT" || g.is_own_goal === true;
}

/** positions JSONB 에서 수비 슬롯의 playerId 추출 (반쿼터 secondPlayerId 포함, 한 쿼터 내 중복 제거) */
function defenderPlayerIdsFromPositions(positions: Record<string, unknown> | null): string[] {
  if (!positions) return [];
  const ids = new Set<string>();
  for (const [slot, raw] of Object.entries(positions)) {
    if (!isDefenderSlot(slot)) continue;
    if (!raw || typeof raw !== "object") continue;
    const p = raw as Placement;
    if (p.playerId) ids.add(p.playerId);
    if (p.secondPlayerId) ids.add(p.secondPlayerId);
  }
  return [...ids];
}

/**
 * 여러 경기의 squads + goals → Map<playerId, {cleanQuarters, points}> 누적.
 * 무실점 쿼터가 0인 선수는 Map 에 넣지 않는다 — 랭킹은 가산 전용.
 */
export function aggregateDefenderPoints(
  squads: DefenderSquadRow[],
  goals: DefenderGoalRow[],
  opts: { includeInternal?: boolean } = {}
): Map<string, DefenderStat> {
  const includeInternal = opts.includeInternal ?? false;
  const sqRows = squads.filter((s) => includeInternal || s.side == null);
  const goalRows = goals.filter((g) => includeInternal || g.side == null);

  // 실점 집계 — 쿼터별(무실점 쿼터용)
  const concededByMatchQuarter = new Map<string, number>();
  for (const g of goalRows) {
    if (!isConceded(g)) continue;
    if (g.quarter_number == null || g.quarter_number === 0) continue; // 쿼터 미상은 쿼터 귀속 불가
    const key = `${g.match_id}:${g.quarter_number}`;
    concededByMatchQuarter.set(key, (concededByMatchQuarter.get(key) ?? 0) + 1);
  }

  const cleanQuarters = new Map<string, number>();
  for (const sq of sqRows) {
    if (sq.quarter_number == null || sq.quarter_number === 0) continue;
    const defIds = defenderPlayerIdsFromPositions(sq.positions);
    if (defIds.length === 0) continue;
    const conceded = concededByMatchQuarter.get(`${sq.match_id}:${sq.quarter_number}`) ?? 0;
    if (conceded === 0) {
      for (const id of defIds) cleanQuarters.set(id, (cleanQuarters.get(id) ?? 0) + 1);
    }
  }

  const result = new Map<string, DefenderStat>();
  for (const [id, cq] of cleanQuarters) {
    result.set(id, { cleanQuarters: cq, points: computeDefenderPoints(cq) });
  }
  return result;
}

/**
 * 한 멤버의 여러 키([user_id, member_id])에 흩어진 수비 스탯을 합산.
 *
 * cleanQuarters 는 단순 합산 — 한 쿼터의 한 슬롯엔 playerId 가 하나뿐이라
 * 같은 멤버가 두 키로 같은 쿼터에 중복 집계될 수 없다(이중계산 불가).
 *
 * SSR(getRecordsData)·API(records route) 두 경로가 공유해 드리프트를 막는다.
 */
export function mergeDefenderStats(defMap: Map<string, DefenderStat>, ids: string[]): DefenderSummary {
  let cleanQuarters = 0;
  for (const id of ids) {
    const v = defMap.get(id);
    if (!v) continue;
    cleanQuarters += v.cleanQuarters;
  }
  return { cleanQuarters, points: computeDefenderPoints(cleanQuarters) };
}
