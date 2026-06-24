import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  resolveValidMvps as resolveValidMvpsForAi,
  pickStaffDecision as pickStaffDecisionForAi,
  shouldApplyNewMvpPolicy as shouldApplyNewMvpPolicyForAi,
} from "@/lib/mvpThreshold";
import type { Placement } from "@/components/TacticsBoard.types";

/**
 * match_squads.positions(JSONB)에서 (slot, playerId) 추출.
 * 실제 저장 형식은 Placement 객체 — { "gk": { x, y, playerId, secondPlayerId? }, ... }.
 * (이전 코드는 Record<string,string>로 잘못 가정해 전부 skip → 포지션·커리어 통계가 비어 있었음)
 * __ prefix 메타슬롯(주심/부심/촬영) 제외. 반쿼터 secondPlayerId 포함.
 * playerId 는 users.id / team_members.id / 게스트 id 가 섞여 있어 호출부에서 정규화 필요.
 */
function parsePositionPlayers(positions: unknown): Array<{ slot: string; playerId: string }> {
  if (!positions || typeof positions !== "object") return [];
  const out: Array<{ slot: string; playerId: string }> = [];
  for (const [slot, raw] of Object.entries(positions as Record<string, unknown>)) {
    if (slot.startsWith("__")) continue;
    if (!raw || typeof raw !== "object") continue;
    const p = raw as Placement;
    if (p.playerId) out.push({ slot, playerId: p.playerId });
    if (p.secondPlayerId) out.push({ slot, playerId: p.secondPlayerId });
  }
  return out;
}

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

/** 강제 무효화 (경기 완료 시 호출 가능). 호출처는 거의 fire-and-forget으로 .catch(()=>{})만 묶기 때문에
 *  여기서 실패 로그를 남기지 않으면 stale 캐시 + 운영 가시성 0이 된다. */
export async function invalidateTeamStats(teamId: string): Promise<void> {
  const db = getSupabaseAdmin();
  if (!db) return;
  const { error } = await db.from("ai_team_stats_cache").delete().eq("team_id", teamId);
  if (error) {
    console.error("[invalidateTeamStats] cache delete failed", { teamId, error: error.message });
  }
}

async function computeTeamStats(teamId: string): Promise<TeamStats> {
  const db = getSupabaseAdmin();
  if (!db) return EMPTY;

  // 완료 경기 (REGULAR — 자체전·이벤트 제외) 최근 30경기.
  // REGULAR 경기도 stats_included=false로 수동 제외된 경우가 있어 방어적으로 함께 필터링.
  // opponent_name이 null/"미정"/"미상"이면 외부 상대 경기로 볼 수 없으므로 stats에서 제외 (AI 가상 전적 hallucination 방지).
  const { data: matches } = await db
    .from("matches")
    .select("id, match_date, opponent_name, match_type")
    .eq("team_id", teamId)
    .eq("status", "COMPLETED")
    .eq("match_type", "REGULAR")
    .neq("stats_included", false)
    .not("opponent_name", "is", null)
    .not("opponent_name", "in", '("미정","미상","내부")')
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
  // voter_id / is_staff_decision 포함: 70% threshold + 운영진 지정 확정 로직용
  const { data: mvpVotes } = await db
    .from("match_mvp_votes")
    .select("match_id, voter_id, candidate_id, is_staff_decision")
    .in("match_id", matchIds);

  // MVP 70% threshold용 실제 참석자 + 현재 STAFF+ voter 목록
  // (is_staff_decision 컬럼 도입 전에 저장된 과거 staff 투표는 false로 남아있어 동적 판정 필요)
  const [actualAttendRes, staffMembersRes] = await Promise.all([
    db.from("match_attendance").select("match_id").in("match_id", matchIds).in("attendance_status", ["PRESENT", "LATE"]),
    db.from("team_members").select("user_id").eq("team_id", teamId).in("role", ["STAFF", "PRESIDENT"]).not("user_id", "is", null),
  ]);
  const attendedPerMatch = new Map<string, number>();
  for (const a of actualAttendRes.data ?? []) {
    attendedPerMatch.set(a.match_id, (attendedPerMatch.get(a.match_id) ?? 0) + 1);
  }
  const staffVoterIds = new Set<string>(
    (staffMembersRes.data ?? []).map((m) => m.user_id).filter((id): id is string => !!id)
  );

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

  // 팀 로스터 정규화 맵 — positions.playerId(users.id / team_members.id / 게스트 id 혼재)를
  // team_members.id 로 통일한다. 골 scorer_id·MVP 브릿지·nameMap 이 모두 team_members.id 기준이라
  // 포지션·커리어 통계도 같은 키로 맞춰야 골/어시/MVP 가 올바르게 병합된다.
  const nameMap = new Map<string, string>();          // team_members.id → 이름
  const memberIdByUserId = new Map<string, string>(); // users.id → team_members.id (MVP 브릿지)
  const resolveTmId = new Map<string, string>();      // users.id 또는 team_members.id → team_members.id
  {
    const { data: roster } = await db
      .from("team_members")
      .select("id, pre_name, users(id, name)")
      .eq("team_id", teamId);
    for (const mb of (roster ?? []) as Array<{ id: string; pre_name: string | null; users: { id: string; name: string } | { id: string; name: string }[] | null }>) {
      const u = Array.isArray(mb.users) ? mb.users[0] : mb.users;
      nameMap.set(mb.id, u?.name ?? mb.pre_name ?? "선수");
      resolveTmId.set(mb.id, mb.id);
      if (u?.id) {
        memberIdByUserId.set(u.id, mb.id);
        resolveTmId.set(u.id, mb.id);
      }
    }
  }

  // 선수 포지션별 통계 — squad.positions(Placement 객체)에서 (slot, playerId) 추출 후 team_members.id 정규화.
  // 로스터에 없는 id(게스트 등)는 제외.
  const memberPosCount = new Map<string, Map<string, number>>(); // team_members.id → position → count
  for (const sq of squads ?? []) {
    for (const { slot, playerId } of parsePositionPlayers(sq.positions)) {
      const memberId = resolveTmId.get(playerId);
      if (!memberId) continue;
      // slot 라벨 정규화 (lw1 → LW)
      const cleanSlot = slot.replace(/[0-9]/g, "").toUpperCase();
      let posMap = memberPosCount.get(memberId);
      if (!posMap) {
        posMap = new Map();
        memberPosCount.set(memberId, posMap);
      }
      posMap.set(cleanSlot, (posMap.get(cleanSlot) ?? 0) + 1);
    }
  }

  // 선수별 골/어시 (총계 + 경기별 — 최근 폼 계산용)
  // scorer_id/assist_id 는 users.id / team_members.id / 게스트 id 가 혼재(실측 96:34:24)하므로
  // 포지션·커리어 통계(team_members.id 키)와 병합되도록 resolveTmId 로 정규화. 로스터 밖(게스트)은 raw 유지.
  const memberGoals = new Map<string, number>();
  const memberAssists = new Map<string, number>();
  const matchMemberGoals = new Map<string, Map<string, number>>(); // matchId → team_members.id → goals
  const matchMemberAssists = new Map<string, Map<string, number>>();
  for (const g of goals ?? []) {
    if (g.scorer_id && g.scorer_id !== "OPPONENT" && !g.is_own_goal) {
      const sid = resolveTmId.get(g.scorer_id) ?? g.scorer_id;
      memberGoals.set(sid, (memberGoals.get(sid) ?? 0) + 1);
      if (!matchMemberGoals.has(g.match_id)) matchMemberGoals.set(g.match_id, new Map());
      const mm = matchMemberGoals.get(g.match_id)!;
      mm.set(sid, (mm.get(sid) ?? 0) + 1);
    }
    if (g.assist_id) {
      const aid = resolveTmId.get(g.assist_id) ?? g.assist_id;
      memberAssists.set(aid, (memberAssists.get(aid) ?? 0) + 1);
      if (!matchMemberAssists.has(g.match_id)) matchMemberAssists.set(g.match_id, new Map());
      const mm = matchMemberAssists.get(g.match_id)!;
      mm.set(aid, (mm.get(aid) ?? 0) + 1);
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

  // 선수별 커리어 통계 — 출전 경기 Set (Placement 파싱 + team_members.id 정규화, 경기별 1회만 카운트)
  const memberMatchSet = new Map<string, Set<string>>(); // team_members.id → 출전 경기 Set
  for (const sq of squads ?? []) {
    for (const { playerId } of parsePositionPlayers(sq.positions)) {
      const memberId = resolveTmId.get(playerId);
      if (!memberId) continue;
      if (!memberMatchSet.has(memberId)) memberMatchSet.set(memberId, new Set());
      memberMatchSet.get(memberId)!.add(sq.match_id);
    }
  }
  // MVP 수상 횟수 집계 — 기록 페이지와 동일 정책으로 통일:
  //   1) 운영진 지정(is_staff_decision 또는 현재 STAFF+ voter) → 즉시 확정
  //   2) 그 외엔 참석자 70% 이상 투표 통과 + 최다득표자
  // (mvpThreshold 는 상단에서 정적 import — 매 호출 dynamic import 제거)
  type MvpRow = { match_id: string; voter_id: string; candidate_id: string; is_staff_decision: boolean | null };
  const mvpAggByMatch = new Map<string, { votes: string[]; rows: MvpRow[] }>();
  for (const v of (mvpVotes ?? []) as MvpRow[]) {
    if (!v.candidate_id) continue;
    const agg = mvpAggByMatch.get(v.match_id) ?? { votes: [], rows: [] };
    agg.votes.push(v.candidate_id);
    agg.rows.push(v);
    mvpAggByMatch.set(v.match_id, agg);
  }
  // 새 MVP 정책 적용 — match_date 매핑 + 팀 토글 조회
  const matchDateById = new Map<string, string>();
  for (const m of matches) matchDateById.set(m.id, m.match_date);
  const { data: teamSettings } = await db.from("teams").select("mvp_vote_staff_only").eq("id", teamId).maybeSingle();
  const mvpVoteStaffOnly = (teamSettings as { mvp_vote_staff_only?: boolean } | null)?.mvp_vote_staff_only ?? false;

  const memberMvpCount = new Map<string, number>();
  for (const [mid, agg] of mvpAggByMatch) {
    const newPolicy = shouldApplyNewMvpPolicyForAi(matchDateById.get(mid), mvpVoteStaffOnly);
    const staffDecision = pickStaffDecisionForAi(agg.rows, staffVoterIds, {
      applyBackfillHealing: !newPolicy,
    });
    // 공동 1등이면 전원 +1 (공동 MVP)
    const winnerUserIds = resolveValidMvpsForAi(agg.votes, attendedPerMatch.get(mid) ?? 0, staffDecision);
    for (const winnerUserId of winnerUserIds) {
      const memberId = memberIdByUserId.get(winnerUserId);
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
      const sid = resolveTmId.get(g.scorer_id) ?? g.scorer_id; // team_members.id 정규화 (nameMap 키와 일치)
      scorerCount.set(sid, (scorerCount.get(sid) ?? 0) + 1);
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
