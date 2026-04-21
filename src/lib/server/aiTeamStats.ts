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

/** 최근 경기 요약 — AI 코치 경기 시나리오 톤 조정용 */
export type RecentMatchSummary = {
  date: string;              // YYYY-MM-DD
  opponent: string | null;
  us: number;
  opp: number;
  result: "W" | "D" | "L";
  formation: string | null;  // 1쿼터 formation
  topScorer: string | null;  // 가장 많이 득점한 우리팀 선수
  topScorerGoals: number;
};

/** 선수별 커리어 요약 — AI 코치 선수 부하·실력 판단용 */
export type PlayerCareerStat = {
  playerName: string;
  totalMatches: number;           // 총 출전 경기 수
  totalGoals: number;             // 누적 득점
  totalAssists: number;           // 누적 어시스트
  mvpCount: number;               // MVP/MOM 수상 횟수
  mostPlayedPosition: string;     // 가장 많이 뛴 포지션 슬롯
  otherPositions: string[];       // 2경기 이상 소화한 추가 포지션 (유연성)
  winRate: number;                // 출전 경기 승률 0–100 (임팩트 지표)
  goalsAgainstPerMatch: number;   // 출전 시 팀 경기당 실점 (수비 지표)
  cleanSheets: number;            // 출전 경기 중 무실점 경기 수
  recentForm: {                   // 최근 3경기 (출전 기준)
    matches: number;
    goals: number;
    assists: number;
  };
};

export type TeamStats = {
  formationStats: FormationStat[];     // 출전 수 desc
  playerPositionStats: PlayerPositionStat[];  // matches desc, top 30
  playerCareerStats: PlayerCareerStat[];      // totalMatches desc, top 20
  opponentHistory: OpponentHistoryItem[];     // played desc, top 10
  quarterStats: QuarterStat[];         // 쿼터별 득실 (quarter asc)
  recentMatchSummaries: RecentMatchSummary[]; // 최근 3경기 (최신 desc)
  totalCompletedMatches: number;
  computedAt: string;
};

const EMPTY: TeamStats = {
  formationStats: [],
  playerPositionStats: [],
  playerCareerStats: [],
  opponentHistory: [],
  quarterStats: [],
  recentMatchSummaries: [],
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

  // MVP 투표 데이터 (선수별 MOM 수상 횟수) — candidate_id는 users.id
  const { data: mvpVotes } = await db
    .from("match_mvp_votes")
    .select("match_id, candidate_id")
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

  // 선수별 골/어시 (총계 + 경기별 — 최근 폼 계산용)
  const memberGoals = new Map<string, number>();
  const memberAssists = new Map<string, number>();
  const matchMemberGoals = new Map<string, Map<string, number>>(); // matchId → memberId → goals
  const matchMemberAssists = new Map<string, Map<string, number>>();
  for (const g of goals ?? []) {
    if (g.scorer_id && g.scorer_id !== "OPPONENT" && !g.is_own_goal) {
      memberGoals.set(g.scorer_id, (memberGoals.get(g.scorer_id) ?? 0) + 1);
      if (!matchMemberGoals.has(g.match_id)) matchMemberGoals.set(g.match_id, new Map());
      const mm = matchMemberGoals.get(g.match_id)!;
      mm.set(g.scorer_id, (mm.get(g.scorer_id) ?? 0) + 1);
    }
    if (g.assist_id) {
      memberAssists.set(g.assist_id, (memberAssists.get(g.assist_id) ?? 0) + 1);
      if (!matchMemberAssists.has(g.match_id)) matchMemberAssists.set(g.match_id, new Map());
      const mm = matchMemberAssists.get(g.match_id)!;
      mm.set(g.assist_id, (mm.get(g.assist_id) ?? 0) + 1);
    }
  }

  // 멤버 이름 매핑
  const memberIds = [...memberPosCount.keys()];
  const nameMap = new Map<string, string>();
  const memberIdByUserId = new Map<string, string>(); // users.id → team_members.id (MVP 브릿지)
  if (memberIds.length > 0) {
    const { data: members } = await db
      .from("team_members")
      .select("id, pre_name, users(id, name)")
      .in("id", memberIds);
    for (const mb of members ?? []) {
      const u = Array.isArray(mb.users) ? mb.users[0] : mb.users;
      nameMap.set(mb.id, u?.name ?? mb.pre_name ?? "선수");
      if (u?.id) memberIdByUserId.set(u.id, mb.id);
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

  // 선수별 커리어 통계 — 포지션 통계에서 재활용 (중복 집계 방지: 경기별 1회만 카운트)
  const memberMatchSet = new Map<string, Set<string>>(); // memberId → 출전 경기 Set
  for (const sq of squads ?? []) {
    const positions = (sq.positions as Record<string, string> | null) ?? {};
    for (const memberId of Object.values(positions)) {
      if (!memberId || typeof memberId !== "string") continue;
      if (!memberMatchSet.has(memberId)) memberMatchSet.set(memberId, new Set());
      memberMatchSet.get(memberId)!.add(sq.match_id);
    }
  }
  // MVP 수상 횟수 집계 — 경기별 최다 득표자를 MOM으로 선정 (candidate_id = users.id)
  const matchVoteCount = new Map<string, Map<string, number>>(); // matchId → userId → votes
  for (const v of mvpVotes ?? []) {
    const uid = (v as { candidate_id?: string }).candidate_id;
    if (!uid) continue;
    if (!matchVoteCount.has(v.match_id)) matchVoteCount.set(v.match_id, new Map());
    const cm = matchVoteCount.get(v.match_id)!;
    cm.set(uid, (cm.get(uid) ?? 0) + 1);
  }
  const memberMvpCount = new Map<string, number>();
  for (const [, cmap] of matchVoteCount.entries()) {
    if (cmap.size === 0) continue;
    const winner = [...cmap.entries()].sort((a, b) => b[1] - a[1])[0];
    if (winner) {
      const memberId = memberIdByUserId.get(winner[0]);
      if (memberId) memberMvpCount.set(memberId, (memberMvpCount.get(memberId) ?? 0) + 1);
    }
  }
  // 선수별 최다 출전 포지션
  const memberBestPosition = new Map<string, string>();
  for (const [memberId, posMap] of memberPosCount.entries()) {
    let bestPos = "";
    let bestCnt = 0;
    for (const [pos, cnt] of posMap.entries()) {
      if (cnt > bestCnt) { bestCnt = cnt; bestPos = pos; }
    }
    if (bestPos) memberBestPosition.set(memberId, bestPos);
  }
  const playerCareerStats: PlayerCareerStat[] = [];
  for (const [memberId, matchSet] of memberMatchSet.entries()) {
    const playerName = nameMap.get(memberId) ?? "선수";
    if (playerName === "선수") continue;

    const bestPos = memberBestPosition.get(memberId) ?? "";

    // 추가 포지션 유연성: mostPlayedPosition 외 2경기 이상 소화한 포지션
    const posMap = memberPosCount.get(memberId);
    const otherPositions: string[] = [];
    if (posMap) {
      for (const [pos, cnt] of posMap.entries()) {
        if (pos !== bestPos && cnt >= 2) otherPositions.push(pos);
      }
    }

    // 승률 — 출전 경기 중 팀이 이긴 비율
    let wins = 0;
    for (const mid of matchSet) {
      if (getResult(mid) === "W") wins++;
    }
    const winRate = matchSet.size > 0 ? Math.round((wins / matchSet.size) * 100) : 0;

    // 수비 지표 — 출전 시 팀 실점
    let totalGoalsAgainst = 0;
    let cleanSheets = 0;
    for (const mid of matchSet) {
      const opp = matchScores.get(mid)?.opp ?? 0;
      totalGoalsAgainst += opp;
      if (opp === 0) cleanSheets++;
    }
    const goalsAgainstPerMatch =
      matchSet.size > 0
        ? Math.round((totalGoalsAgainst / matchSet.size) * 10) / 10
        : 0;

    // 최근 3경기 폼 (출전 경기 기준, matches는 date desc)
    let recentGoals = 0, recentAssists = 0, recentMatchCount = 0;
    for (const m of matches) {
      if (recentMatchCount >= 3) break;
      if (!matchSet.has(m.id)) continue;
      recentGoals += matchMemberGoals.get(m.id)?.get(memberId) ?? 0;
      recentAssists += matchMemberAssists.get(m.id)?.get(memberId) ?? 0;
      recentMatchCount++;
    }

    playerCareerStats.push({
      playerName,
      totalMatches: matchSet.size,
      totalGoals: memberGoals.get(memberId) ?? 0,
      totalAssists: memberAssists.get(memberId) ?? 0,
      mvpCount: memberMvpCount.get(memberId) ?? 0,
      mostPlayedPosition: bestPos,
      otherPositions,
      winRate,
      goalsAgainstPerMatch,
      cleanSheets,
      recentForm: { matches: recentMatchCount, goals: recentGoals, assists: recentAssists },
    });
  }
  playerCareerStats.sort((a, b) => b.totalMatches - a.totalMatches);

  // 최근 3경기 요약 — matches는 match_date desc 정렬 이미 완료
  const recentMatchSummaries: RecentMatchSummary[] = [];
  for (const m of matches.slice(0, 3)) {
    const score = matchScores.get(m.id) ?? { our: 0, opp: 0 };
    const result = getResult(m.id);
    // 이 경기 최다 득점자 (우리팀)
    const scorerCount = new Map<string, number>();
    for (const g of goals ?? []) {
      if (g.match_id !== m.id) continue;
      if (!g.scorer_id || g.scorer_id === "OPPONENT" || g.scorer_id === "UNKNOWN" || g.is_own_goal) continue;
      scorerCount.set(g.scorer_id, (scorerCount.get(g.scorer_id) ?? 0) + 1);
    }
    let topScorer: string | null = null;
    let topScorerGoals = 0;
    if (scorerCount.size > 0) {
      const [topId, cnt] = [...scorerCount.entries()].sort((a, b) => b[1] - a[1])[0];
      topScorer = nameMap.get(topId) ?? null;
      topScorerGoals = cnt;
    }
    recentMatchSummaries.push({
      date: m.match_date ?? "",
      opponent: m.opponent_name ?? null,
      us: score.our,
      opp: score.opp,
      result,
      formation: matchToFormation.get(m.id) ?? null,
      topScorer,
      topScorerGoals,
    });
  }

  return {
    formationStats,
    playerPositionStats: playerPositionStats.slice(0, 30),
    playerCareerStats: playerCareerStats.slice(0, 20),
    opponentHistory,
    quarterStats,
    recentMatchSummaries,
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
