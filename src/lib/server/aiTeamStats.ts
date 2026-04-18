import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * AI 코치 분석용 팀 통계 (Phase D + E).
 *
 * - 포메이션별 승률·득실 (formationStats)
 * - 선수 포지션별 활약 (playerPositionStats) — top N
 * - 상대팀 이력 (opponentHistory)
 *
 * 캐시: ai_team_stats_cache 테이블, TTL 24h.
 * 마이그레이션 00031 필요.
 */

const TTL_MS = 24 * 60 * 60 * 1000;

export type FormationStat = {
  name: string;          // "4-3-3"
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
};

export type PlayerPositionStat = {
  playerName: string;
  position: string;       // "CB", "LW" 등
  matches: number;        // 해당 포지션으로 출전 수
  goals: number;
  assists: number;
};

export type OpponentHistoryItem = {
  opponentName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  recentScores: Array<{ date: string; us: number; opp: number; result: "W" | "D" | "L" }>;
};

export type QuarterStat = {
  quarter: number;     // 1,2,3,4...
  goalsFor: number;    // 해당 쿼터 누적 득점
  goalsAgainst: number; // 해당 쿼터 누적 실점
  matches: number;     // 해당 쿼터 데이터가 있는 경기 수
};

export type TeamStats = {
  formationStats: FormationStat[];     // 출전 수 desc
  playerPositionStats: PlayerPositionStat[];  // matches desc, top 30
  opponentHistory: OpponentHistoryItem[];     // played desc, top 10
  quarterStats: QuarterStat[];         // 쿼터별 득실 (quarter asc)
  totalCompletedMatches: number;
  computedAt: string;
};

const EMPTY: TeamStats = {
  formationStats: [],
  playerPositionStats: [],
  opponentHistory: [],
  quarterStats: [],
  totalCompletedMatches: 0,
  computedAt: new Date(0).toISOString(),
};

/** 캐시 우선 조회. stale or miss → 재계산 + 저장. */
export async function getOrComputeTeamStats(teamId: string): Promise<TeamStats> {
  const db = getSupabaseAdmin();
  if (!db) return EMPTY;

  // 1) 캐시 조회
  try {
    const { data } = await db
      .from("ai_team_stats_cache")
      .select("data, updated_at")
      .eq("team_id", teamId)
      .maybeSingle();
    if (data?.data && data.updated_at) {
      const age = Date.now() - new Date(data.updated_at).getTime();
      if (age < TTL_MS) return data.data as TeamStats;
    }
  } catch {
    // 테이블 없거나 에러 → 무시하고 계산
  }

  // 2) 재계산
  const stats = await computeTeamStats(teamId);

  // 3) 저장 (실패해도 무시)
  try {
    await db.from("ai_team_stats_cache").upsert(
      { team_id: teamId, data: stats, updated_at: new Date().toISOString() },
      { onConflict: "team_id" }
    );
  } catch {
    /* ignore */
  }

  return stats;
}

/** 강제 무효화 (경기 완료 시 호출 가능) */
export async function invalidateTeamStats(teamId: string): Promise<void> {
  const db = getSupabaseAdmin();
  if (!db) return;
  try {
    await db.from("ai_team_stats_cache").delete().eq("team_id", teamId);
  } catch {
    /* ignore */
  }
}

async function computeTeamStats(teamId: string): Promise<TeamStats> {
  const db = getSupabaseAdmin();
  if (!db) return EMPTY;

  // 완료 경기 (REGULAR — 자체전·이벤트 제외) 최근 30경기
  const { data: matches } = await db
    .from("matches")
    .select("id, match_date, opponent_name, match_type")
    .eq("team_id", teamId)
    .eq("status", "COMPLETED")
    .eq("match_type", "REGULAR")
    .order("match_date", { ascending: false })
    .limit(30);

  if (!matches || matches.length === 0) return EMPTY;

  const matchIds = matches.map((m) => m.id);

  // 골 데이터 (스코어 + 쿼터별 계산용)
  const { data: goals } = await db
    .from("match_goals")
    .select("match_id, scorer_id, assist_id, is_own_goal, quarter_number")
    .in("match_id", matchIds);

  // 경기별 스코어 + 결과
  const matchScores = new Map<string, { our: number; opp: number }>();
  for (const g of goals ?? []) {
    if (!matchScores.has(g.match_id)) matchScores.set(g.match_id, { our: 0, opp: 0 });
    const s = matchScores.get(g.match_id)!;
    if (g.scorer_id === "OPPONENT" || g.is_own_goal) s.opp++;
    else s.our++;
  }
  function getResult(mid: string): "W" | "D" | "L" {
    const s = matchScores.get(mid) ?? { our: 0, opp: 0 };
    return s.our > s.opp ? "W" : s.our < s.opp ? "L" : "D";
  }

  // 1쿼터 squad의 formation 사용 (대표값)
  const { data: squads } = await db
    .from("match_squads")
    .select("match_id, quarter_number, formation, positions")
    .in("match_id", matchIds);

  // 포메이션별 통계
  const formationMap = new Map<string, FormationStat>();
  const matchToFormation = new Map<string, string>();
  for (const sq of squads ?? []) {
    if (sq.quarter_number === 1 && sq.formation) {
      matchToFormation.set(sq.match_id, sq.formation);
    }
  }
  for (const m of matches) {
    const formation = matchToFormation.get(m.id);
    if (!formation) continue;
    const score = matchScores.get(m.id) ?? { our: 0, opp: 0 };
    const result = getResult(m.id);
    let stat = formationMap.get(formation);
    if (!stat) {
      stat = { name: formation, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 };
      formationMap.set(formation, stat);
    }
    stat.played++;
    if (result === "W") stat.won++;
    else if (result === "D") stat.drawn++;
    else stat.lost++;
    stat.goalsFor += score.our;
    stat.goalsAgainst += score.opp;
  }
  const formationStats = [...formationMap.values()].sort((a, b) => b.played - a.played);

  // 선수 포지션별 통계 — squad.positions JSONB에서 (slot, member_id) 추출
  // positions 형식: { "GK": "memberId1", "CB": "memberId2", ... } 가정
  // 안전하게 string-string 매핑으로 처리
  const memberPosCount = new Map<string, Map<string, number>>(); // memberId → position → count

  for (const sq of squads ?? []) {
    const positions = (sq.positions as Record<string, string> | null) ?? {};
    for (const [slot, memberId] of Object.entries(positions)) {
      if (!memberId || typeof memberId !== "string") continue;
      // slot 라벨에서 숫자 제거 (LW1 → LW)
      const cleanSlot = slot.replace(/[0-9]/g, "");
      let posMap = memberPosCount.get(memberId);
      if (!posMap) {
        posMap = new Map();
        memberPosCount.set(memberId, posMap);
      }
      posMap.set(cleanSlot, (posMap.get(cleanSlot) ?? 0) + 1);
    }
  }

  // 선수별 골/어시
  const memberGoals = new Map<string, number>();
  const memberAssists = new Map<string, number>();
  for (const g of goals ?? []) {
    if (g.scorer_id && g.scorer_id !== "OPPONENT" && !g.is_own_goal) {
      memberGoals.set(g.scorer_id, (memberGoals.get(g.scorer_id) ?? 0) + 1);
    }
    if (g.assist_id) {
      memberAssists.set(g.assist_id, (memberAssists.get(g.assist_id) ?? 0) + 1);
    }
  }

  // 멤버 이름 매핑
  const memberIds = [...memberPosCount.keys()];
  const nameMap = new Map<string, string>();
  if (memberIds.length > 0) {
    const { data: members } = await db
      .from("team_members")
      .select("id, pre_name, users(name)")
      .in("id", memberIds);
    for (const mb of members ?? []) {
      const u = Array.isArray(mb.users) ? mb.users[0] : mb.users;
      nameMap.set(mb.id, u?.name ?? mb.pre_name ?? "선수");
    }
  }

  // 포지션별 상위 30개
  const playerPositionStats: PlayerPositionStat[] = [];
  for (const [memberId, posMap] of memberPosCount.entries()) {
    const playerName = nameMap.get(memberId) ?? "선수";
    for (const [position, matchCount] of posMap.entries()) {
      if (matchCount < 2) continue; // 1경기만 출전한 포지션은 의미 약함
      playerPositionStats.push({
        playerName,
        position,
        matches: matchCount,
        goals: memberGoals.get(memberId) ?? 0,
        assists: memberAssists.get(memberId) ?? 0,
      });
    }
  }
  playerPositionStats.sort((a, b) => b.matches - a.matches);

  // 상대팀 이력 — opponent_name별 그룹
  const oppMap = new Map<string, OpponentHistoryItem>();
  for (const m of matches) {
    if (!m.opponent_name) continue;
    const score = matchScores.get(m.id) ?? { our: 0, opp: 0 };
    const result = getResult(m.id);
    let item = oppMap.get(m.opponent_name);
    if (!item) {
      item = { opponentName: m.opponent_name, played: 0, won: 0, drawn: 0, lost: 0, recentScores: [] };
      oppMap.set(m.opponent_name, item);
    }
    item.played++;
    if (result === "W") item.won++;
    else if (result === "D") item.drawn++;
    else item.lost++;
    item.recentScores.push({ date: m.match_date ?? "", us: score.our, opp: score.opp, result });
  }
  for (const item of oppMap.values()) {
    item.recentScores.sort((a, b) => (b.date > a.date ? 1 : -1));
    item.recentScores = item.recentScores.slice(0, 5);
  }
  const opponentHistory = [...oppMap.values()].sort((a, b) => b.played - a.played).slice(0, 10);

  // 쿼터별 득실 집계 (quarter_number null/0 제외)
  const quarterGoalsFor = new Map<number, number>();
  const quarterGoalsAgainst = new Map<number, number>();
  const quarterMatchSet = new Map<number, Set<string>>();
  for (const g of goals ?? []) {
    const q = (g as { quarter_number?: number | null }).quarter_number;
    if (q == null || q === 0) continue;
    if (!quarterMatchSet.has(q)) {
      quarterMatchSet.set(q, new Set());
      quarterGoalsFor.set(q, 0);
      quarterGoalsAgainst.set(q, 0);
    }
    quarterMatchSet.get(q)!.add(g.match_id);
    if (g.scorer_id === "OPPONENT" || g.is_own_goal) {
      quarterGoalsAgainst.set(q, (quarterGoalsAgainst.get(q) ?? 0) + 1);
    } else {
      quarterGoalsFor.set(q, (quarterGoalsFor.get(q) ?? 0) + 1);
    }
  }
  const quarterStats: QuarterStat[] = [];
  for (const [quarter, matchSet] of quarterMatchSet.entries()) {
    quarterStats.push({
      quarter,
      goalsFor: quarterGoalsFor.get(quarter) ?? 0,
      goalsAgainst: quarterGoalsAgainst.get(quarter) ?? 0,
      matches: matchSet.size,
    });
  }
  quarterStats.sort((a, b) => a.quarter - b.quarter);

  return {
    formationStats,
    playerPositionStats: playerPositionStats.slice(0, 30),
    opponentHistory,
    quarterStats,
    totalCompletedMatches: matches.length,
    computedAt: new Date().toISOString(),
  };
}

/**
 * 상대팀 단일 조회 — getOrComputeTeamStats에서 추출.
 * AI 코치 분석에서 "이 상대 정보만" 필요할 때.
 */
export function findOpponentHistory(
  stats: TeamStats,
  opponentName: string | null | undefined
): OpponentHistoryItem | null {
  if (!opponentName) return null;
  return stats.opponentHistory.find((o) => o.opponentName === opponentName) ?? null;
}
