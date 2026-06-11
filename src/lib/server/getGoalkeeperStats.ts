import type { Placement } from "@/components/TacticsBoard.types";

/**
 * 골키퍼 클린시트(무실점) 집계 — 순수 함수 (DB 비의존). 단위는 "무실점 쿼터"로 통일.
 *
 * 두 경로 (플랜 humble-squishing-hellman + 82차 보완 확정):
 *  ① 전술판 있는 경기 → 쿼터별 정밀 귀속
 *     match_squads(quarter_number=Q)의 GK 슬롯 playerId(+secondPlayerId)를 같은 경기·쿼터
 *     match_goals 실점(scorer_id="OPPONENT" || is_own_goal) 0건이면 그 키퍼에게 무실점 쿼터 +1.
 *     키퍼로 선 쿼터(분모)는 실점 여부 무관하게 항상 +1.
 *  ② 전술판 없는 경기 → 경기 단위를 쿼터로 환산 (폴백, 추정치)
 *     "선호 포지션에 GK 포함 + 실제 참석(PRESENT/LATE)"인 선수를 그 경기 키퍼로 추정.
 *     경기 전체 무실점이면 그 경기 쿼터 수(quarter_count)만큼 무실점 쿼터 인정(키퍼 풀타임 가정).
 *     실점이 있으면 분모(키퍼 쿼터)만 쿼터 수만큼 +.
 *
 * 정책 세부:
 *  - 일반전만 (side IS NULL). 자체전(A/B)은 includeInternal=false 기본 제외.
 *  - 반쿼터 교체(secondPlayerId): half 데이터 없어 그 쿼터 무실점이면 두 키퍼 모두 +1.
 *  - 쿼터 미상 실점(quarter_number null/0): 전술판 경로에선 특정 쿼터 귀속 불가→무시.
 *    폴백 경로의 "경기 무실점" 판정에는 포함(그 경기에 실점이 1개라도 있으면 무실점 아님).
 *  - 전술판 유무는 side IS NULL squad row 존재로 판정 → 폴백과 배타.
 *
 * 반환 Map 키: 전술판 경로는 positions.playerId(users.id/team_members.id/게스트 혼재),
 * 폴백 경로는 멤버 canonicalId(user_id ?? team_members.id). 호출부에서 멤버의 [user_id, member_id]
 * 양쪽으로 합산하면 둘 다 흡수된다.
 */

export type GkSquadRow = {
  match_id: string;
  quarter_number: number | null;
  positions: Record<string, unknown> | null;
  side?: string | null;
};

export type GkGoalRow = {
  match_id: string;
  quarter_number: number | null;
  scorer_id: string | null;
  is_own_goal: boolean | null;
  side?: string | null;
};

export type GkCleanSheetStat = { cleanSheets: number; quarters: number };

/** 폴백용 — 선호 포지션에 GK 포함 + 출석 식별자 양쪽(user_id, member_id) 보유 멤버 */
export type GkRosterMember = { canonicalId: string; ids: string[]; isGk: boolean };
export type GkAttendanceRow = { match_id: string; user_id: string | null; member_id: string | null };

export type GkFallback = {
  /** matchId → 쿼터 수 (quarter_count) */
  matchQuarterCounts: Map<string, number>;
  /** matchId → 그 경기 키퍼로 추정되는 선수 canonicalId 목록 */
  gkAttendeesByMatch: Map<string, string[]>;
};

/** 슬롯 키가 골키퍼인지 — 'gk'(소문자 슬롯 id) / 'GK' 모두 매칭 */
export function isGkSlot(slot: string): boolean {
  return slot.toUpperCase().includes("GK");
}

/** 선호 포지션 배열에 GK 가 포함됐는지 */
export function isGkPreferred(preferredPositions: unknown): boolean {
  return Array.isArray(preferredPositions) && preferredPositions.some((p) => String(p).toUpperCase().includes("GK"));
}

/** 우리 골문에 들어간 골(실점) 판정 */
function isConceded(g: GkGoalRow): boolean {
  return g.scorer_id === "OPPONENT" || g.is_own_goal === true;
}

/** positions JSONB 에서 GK 슬롯의 playerId 추출 (반쿼터 secondPlayerId 포함, 한 쿼터 내 중복 제거) */
function gkPlayerIdsFromPositions(positions: Record<string, unknown> | null): string[] {
  if (!positions) return [];
  const ids = new Set<string>();
  for (const [slot, raw] of Object.entries(positions)) {
    if (slot.startsWith("__")) continue; // 메타슬롯(주심/부심/촬영) 제외
    if (!isGkSlot(slot)) continue;
    if (!raw || typeof raw !== "object") continue;
    const p = raw as Placement;
    if (p.playerId) ids.add(p.playerId);
    if (p.secondPlayerId) ids.add(p.secondPlayerId);
  }
  return [...ids];
}

/**
 * 실제 참석(PRESENT/LATE)한 GK 선호 멤버를 경기별로 묶는다 (폴백용).
 * 출석 row 의 user_id/member_id 를 멤버 canonicalId 로 역매핑.
 */
export function buildGkAttendeesByMatch(
  gkMembers: GkRosterMember[],
  attendance: GkAttendanceRow[]
): Map<string, string[]> {
  const byUserId = new Map<string, string>(); // user_id/member_id 식별자 → canonicalId
  for (const m of gkMembers) {
    if (!m.isGk) continue;
    for (const id of m.ids) byUserId.set(id, m.canonicalId);
  }
  const sets = new Map<string, Set<string>>();
  for (const a of attendance) {
    const canon = (a.user_id && byUserId.get(a.user_id)) || (a.member_id && byUserId.get(a.member_id));
    if (!canon) continue;
    if (!sets.has(a.match_id)) sets.set(a.match_id, new Set());
    sets.get(a.match_id)!.add(canon);
  }
  return new Map([...sets].map(([k, v]) => [k, [...v]]));
}

/**
 * 여러 경기의 squads + goals → Map<playerId|canonicalId, {cleanSheets, quarters}> 누적.
 */
export function aggregateGkCleanSheets(
  squads: GkSquadRow[],
  goals: GkGoalRow[],
  opts: { includeInternal?: boolean; fallback?: GkFallback } = {}
): Map<string, GkCleanSheetStat> {
  const includeInternal = opts.includeInternal ?? false;

  const sqRows = squads.filter((s) => includeInternal || s.side == null);
  const goalRows = goals.filter((g) => includeInternal || g.side == null);

  // 실점 집계 — 쿼터별(전술판 경로) + 경기별(폴백 경로)
  const concededByMatchQuarter = new Map<string, number>();
  const concededByMatch = new Map<string, number>();
  for (const g of goalRows) {
    if (!isConceded(g)) continue;
    concededByMatch.set(g.match_id, (concededByMatch.get(g.match_id) ?? 0) + 1);
    if (g.quarter_number == null || g.quarter_number === 0) continue;
    const key = `${g.match_id}:${g.quarter_number}`;
    concededByMatchQuarter.set(key, (concededByMatchQuarter.get(key) ?? 0) + 1);
  }

  const result = new Map<string, GkCleanSheetStat>();
  const bump = (id: string, qAdd: number, csAdd: number) => {
    const cur = result.get(id) ?? { cleanSheets: 0, quarters: 0 };
    cur.quarters += qAdd;
    cur.cleanSheets += csAdd;
    result.set(id, cur);
  };

  // ① 전술판 있는 경기 — 쿼터별 귀속
  const hasSquadMatch = new Set<string>();
  for (const sq of sqRows) {
    if (sq.quarter_number == null || sq.quarter_number === 0) continue;
    hasSquadMatch.add(sq.match_id);
    const gkIds = gkPlayerIdsFromPositions(sq.positions);
    if (gkIds.length === 0) continue;
    const conceded = concededByMatchQuarter.get(`${sq.match_id}:${sq.quarter_number}`) ?? 0;
    const cs = conceded === 0 ? 1 : 0;
    for (const id of gkIds) bump(id, 1, cs);
  }

  // ② 전술판 없는 경기 — 경기 단위를 쿼터로 환산 (폴백)
  if (opts.fallback) {
    const { matchQuarterCounts, gkAttendeesByMatch } = opts.fallback;
    for (const [matchId, qc] of matchQuarterCounts) {
      if (hasSquadMatch.has(matchId)) continue; // 전술판 있으면 ①에서 처리됨
      const attendees = gkAttendeesByMatch.get(matchId);
      if (!attendees || attendees.length === 0) continue;
      const quarters = qc > 0 ? qc : 1;
      const conceded = concededByMatch.get(matchId) ?? 0;
      const cs = conceded === 0 ? quarters : 0;
      for (const id of attendees) bump(id, quarters, cs);
    }
  }

  return result;
}
