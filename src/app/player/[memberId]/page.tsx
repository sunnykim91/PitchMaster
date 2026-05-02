import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { auth } from "@/lib/auth";
import type { Metadata } from "next";
import {
  classifyPosition,
  generateSignature,
  computeRankLabel,
  computeStreak,
  findBestMoments,
  calculateOVR,
  getRarity,
  getHeroStatKey,
  type MatchPerformance,
  type BestMoment,
} from "@/lib/playerCardUtils";
import { getOrGenerateSignature } from "@/lib/server/aiSignatureCache";
import { PlayerProfilePage, PlayerProfileEmpty } from "@/components/pitchmaster/PlayerProfilePage";
import type { PlayerProfile, PlayerStats } from "@/components/pitchmaster/PlayerProfilePage";
import type { PlayerCardProps, StatWithContext } from "@/components/pitchmaster/PlayerCard";
import { firstOf, type JoinedRow } from "@/lib/supabaseJoins";
import { resolveValidMvp, pickStaffDecision } from "@/lib/mvpThreshold";

type Props = {
  params: Promise<{ memberId: string }>;
  searchParams: Promise<{ team?: string }>;
};

type MemberRow = {
  id: string;
  user_id: string | null;
  pre_name: string | null;
  jersey_number: number | null;
  team_role: string | null;
  team_id: string;
  ai_signature: string | null;
  ai_signature_generated_at: string | null;
  users: JoinedRow<{ name: string; preferred_positions: string[]; preferred_foot: "RIGHT" | "LEFT" | "BOTH" | null; profile_image_url: string | null }>;
  teams: JoinedRow<{ name: string; sport_type: string; uniform_primary: string | null; logo_url: string | null }>;
};

async function getPlayerData(memberId: string, teamId?: string, enableAi: boolean = false, callerUserId: string | null = null, callerTeamId: string | null = null): Promise<PlayerProfile | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;

  // 여러 팀 소속일 때 team 쿼리로 지정 가능. 없으면 첫 번째 팀 fallback.
  // ACTIVE + DORMANT 모두 허용 (휴면 회원도 프로필 열람 가능, BANNED만 제외)
  let query = db
    .from("team_members")
    .select("id, user_id, pre_name, jersey_number, team_role, team_id, ai_signature, ai_signature_generated_at, users(name, preferred_positions, preferred_foot, profile_image_url), teams(name, sport_type, uniform_primary, logo_url)")
    .or(`user_id.eq.${memberId},id.eq.${memberId}`)
    .in("status", ["ACTIVE", "DORMANT"]);
  if (teamId) query = query.eq("team_id", teamId);
  const { data: member } = await query.limit(1).single<MemberRow>();

  if (!member) return null;
  const m = member;
  const user = firstOf(m.users);
  const team = firstOf(m.teams);
  const name = user?.name ?? m.pre_name ?? "";
  const teamName = team?.name ?? "";
  const teamPrimaryColor = team?.uniform_primary ?? "#e8613a";
  const teamLogoUrl = team?.logo_url ?? undefined;
  const positions = user?.preferred_positions ?? [];
  const preferredFoot = user?.preferred_foot ?? null;
  const photoUrl = user?.profile_image_url ?? undefined;
  const lookupIds = m.user_id ? [m.user_id, m.id] : [m.id];
  const cat = classifyPosition(positions);
  const posLabel = positions[0] ?? "MF";

  // 활성 시즌
  const { data: season } = await db
    .from("seasons")
    .select("id, name, start_date, end_date")
    .eq("team_id", m.team_id)
    .eq("is_active", true)
    .limit(1)
    .single();

  // 시즌 없거나 경기 없으면 빈 프로필
  const emptyCardProps: PlayerCardProps = {
    ovr: 45, rarity: "COMMON", positionLabel: posLabel, positionCategory: cat,
    playerName: name, jerseyNumber: m.jersey_number, teamName, teamPrimaryColor,
    seasonName: season?.name ?? "", photoUrl, stats: [],
  };

  if (!season) {
    return {
      name, teamName, teamPrimaryColor, positions, preferredFoot, jerseyNumber: m.jersey_number,
      teamRole: (m.team_role === "CAPTAIN" || m.team_role === "VICE_CAPTAIN" ? m.team_role : null) as PlayerProfile["teamRole"],
      seasonName: "", signature: "", playerCardProps: emptyCardProps,
      stats: null, bestMoments: [], recentMatches: [], attendanceHistory: [],
    };
  }

  // 시즌 내 COMPLETED 경기 — 자체전 중 전적 반영 안 함은 제외
  const { data: matches } = await db
    .from("matches")
    .select("id, match_date, opponent_name, match_type")
    .eq("team_id", m.team_id)
    .eq("status", "COMPLETED")
    .neq("stats_included", false)
    .gte("match_date", season.start_date)
    .lte("match_date", season.end_date)
    .order("match_date", { ascending: false });

  const matchIds = (matches ?? []).map((mm) => mm.id);
  if (matchIds.length === 0) {
    return {
      name, teamName, teamPrimaryColor, positions, preferredFoot, jerseyNumber: m.jersey_number,
      teamRole: (m.team_role === "CAPTAIN" || m.team_role === "VICE_CAPTAIN" ? m.team_role : null) as PlayerProfile["teamRole"],
      seasonName: season.name, signature: "", playerCardProps: { ...emptyCardProps, seasonName: season.name },
      stats: null, bestMoments: [], recentMatches: [], attendanceHistory: [],
    };
  }

  // 출석 + 팀 멤버 전체 (랭킹 산출용)
  const [attendanceRes, allMembersRes, actualAttendRes, staffMembersRes] = await Promise.all([
    db.from("match_attendance").select("match_id, user_id, member_id").in("match_id", matchIds).eq("vote", "ATTEND"),
    db.from("team_members").select("id, user_id").eq("team_id", m.team_id).in("status", ["ACTIVE", "DORMANT"]),
    // MVP 투표율 70% 검증용 실제 체크인 (용병 제외)
    db.from("match_attendance").select("match_id").in("match_id", matchIds).in("attendance_status", ["PRESENT", "LATE"]),
    // is_staff_decision 백필 누락 치유 — 현재 STAFF+ voter의 과거 투표를 확정 취급
    db.from("team_members").select("user_id").eq("team_id", m.team_id).in("role", ["STAFF", "PRESIDENT"]).not("user_id", "is", null),
  ]);
  const attendance = attendanceRes.data ?? [];
  const allTeamMembers = (allMembersRes.data ?? []) as Array<{ id: string; user_id: string | null }>;

  const attendedMatchIds = new Set<string>();
  for (const a of attendance) {
    if (lookupIds.includes(a.user_id) || lookupIds.includes(a.member_id)) {
      attendedMatchIds.add(a.match_id);
    }
  }

  // 골/어시/MVP — 팀 전체로 로드
  const [allGoalsByScorerRes, allAssistsRes, allMvpRes, allGoalsRes] = await Promise.all([
    db.from("match_goals").select("match_id, scorer_id").in("match_id", matchIds).eq("is_own_goal", false),
    db.from("match_goals").select("match_id, assist_id").in("match_id", matchIds).not("assist_id", "is", null),
    db.from("match_mvp_votes").select("match_id, voter_id, candidate_id, is_staff_decision").in("match_id", matchIds),
    db.from("match_goals").select("match_id, scorer_id, is_own_goal").in("match_id", matchIds),
  ]);

  // 경기별 MVP winner 집계 — 참석자 70% 투표율 통과 시 최다득표자, 또는 운영진 직접 지정.
  const attendedPerMatch = new Map<string, number>();
  for (const a of actualAttendRes.data ?? []) {
    attendedPerMatch.set(a.match_id, (attendedPerMatch.get(a.match_id) ?? 0) + 1);
  }
  const staffVoterIds = new Set<string>(
    (staffMembersRes.data ?? []).map((x) => (x as { user_id: string | null }).user_id).filter((id): id is string => !!id)
  );
  type MvpRow = { match_id: string; voter_id: string; candidate_id: string; is_staff_decision: boolean | null };
  const mvpVotesByMatch = new Map<string, { votes: string[]; rows: MvpRow[] }>();
  for (const v of (allMvpRes.data ?? []) as MvpRow[]) {
    if (!v.candidate_id) continue;
    const agg = mvpVotesByMatch.get(v.match_id) ?? { votes: [], rows: [] };
    agg.votes.push(v.candidate_id);
    agg.rows.push(v);
    mvpVotesByMatch.set(v.match_id, agg);
  }
  const mvpWinnerByMatch = new Map<string, string>();
  for (const [mid, agg] of mvpVotesByMatch) {
    const staffDecision = pickStaffDecision(agg.rows, staffVoterIds);
    const winner = resolveValidMvp(agg.votes, attendedPerMatch.get(mid) ?? 0, staffDecision);
    if (winner) mvpWinnerByMatch.set(mid, winner);
  }

  const myGoals = (allGoalsByScorerRes.data ?? []).filter((g) => lookupIds.includes(g.scorer_id));
  const myAssists = (allAssistsRes.data ?? []).filter((a) => lookupIds.includes(a.assist_id));
  const myMvpMatches = [...mvpWinnerByMatch.entries()].filter(([, winner]) => lookupIds.includes(winner));

  const totalGoals = myGoals.length;
  const totalAssists = myAssists.length;
  const totalMvp = myMvpMatches.length;

  const goalsByMatch = new Map<string, number>();
  for (const g of myGoals) goalsByMatch.set(g.match_id, (goalsByMatch.get(g.match_id) ?? 0) + 1);
  const assistsByMatch = new Map<string, number>();
  for (const a of myAssists) assistsByMatch.set(a.match_id, (assistsByMatch.get(a.match_id) ?? 0) + 1);
  const mvpByMatch = new Set<string>();
  for (const [mid] of myMvpMatches) mvpByMatch.add(mid);

  const scoreMap = new Map<string, { our: number; opp: number }>();
  for (const g of allGoalsRes.data ?? []) {
    const s = scoreMap.get(g.match_id) ?? { our: 0, opp: 0 };
    if (g.scorer_id === "OPPONENT" || g.is_own_goal) s.opp++;
    else s.our++;
    scoreMap.set(g.match_id, s);
  }

  let cleanSheets = 0;
  let wins = 0;
  for (const mid of attendedMatchIds) {
    const s = scoreMap.get(mid) ?? { our: 0, opp: 0 };
    if (s.opp === 0) cleanSheets++;
    if (s.our > s.opp) wins++;
  }

  const attended = attendedMatchIds.size;
  const winRate = attended > 0 ? wins / attended : 0;
  const attendanceRate = matchIds.length > 0 ? attended / matchIds.length : 0;

  // 팀 내 랭킹
  type MemberAgg = { ids: string[]; goals: number; assists: number; mvp: number };
  const memberAggs: MemberAgg[] = allTeamMembers.map((tm) => ({
    ids: tm.user_id ? [tm.user_id, tm.id] : [tm.id],
    goals: 0, assists: 0, mvp: 0,
  }));
  for (const g of allGoalsByScorerRes.data ?? []) {
    const agg = memberAggs.find((mm) => mm.ids.includes(g.scorer_id));
    if (agg) agg.goals++;
  }
  for (const a of allAssistsRes.data ?? []) {
    const agg = memberAggs.find((mm) => mm.ids.includes(a.assist_id));
    if (agg) agg.assists++;
  }
  for (const winner of mvpWinnerByMatch.values()) {
    const agg = memberAggs.find((mm) => mm.ids.includes(winner));
    if (agg) agg.mvp++;
  }

  const goalsRank = computeRankLabel(totalGoals, memberAggs.map((x) => x.goals));
  const assistsRank = computeRankLabel(totalAssists, memberAggs.map((x) => x.assists));
  const mvpRank = computeRankLabel(totalMvp, memberAggs.map((x) => x.mvp));
  const isTopScorer = totalGoals > 0 && goalsRank === "🏆 팀 1위";
  const isTopAssist = totalAssists > 0 && assistsRank === "🏆 팀 1위";
  const isTopMvp = totalMvp > 0 && mvpRank === "🏆 팀 1위";

  // 연속 기록
  const matchesAsc = [...(matches ?? [])].sort((a, b) => a.match_date < b.match_date ? -1 : 1);
  const attendFlagsAsc = matchesAsc.map((mm) => attendedMatchIds.has(mm.id));
  const attendanceStreak = computeStreak(attendFlagsAsc);
  const goalFlagsAsc = matchesAsc
    .filter((mm) => attendedMatchIds.has(mm.id))
    .map((mm) => (goalsByMatch.get(mm.id) ?? 0) > 0);
  const goalStreak = computeStreak(goalFlagsAsc);

  // 베스트 모먼트
  const performanceHistory: MatchPerformance[] = matchesAsc.map((mm) => {
    const s = scoreMap.get(mm.id) ?? { our: 0, opp: 0 };
    return {
      matchId: mm.id, date: mm.match_date,
      opponent: mm.opponent_name ?? (mm.match_type === "INTERNAL" ? "자체전" : ""),
      ourScore: s.our, oppScore: s.opp,
      attended: attendedMatchIds.has(mm.id),
      goals: goalsByMatch.get(mm.id) ?? 0,
      assists: assistsByMatch.get(mm.id) ?? 0,
      mvp: mvpByMatch.has(mm.id),
    };
  });
  const bestMoments: BestMoment[] = findBestMoments(performanceHistory);

  // 시그니처 — DB 캐시(7일 TTL) 우선. 캐시 miss/stale + 김선휘(enableAi)면 Claude 호출 + DB 저장.
  // 비-김선휘 사용자는 기존 DB 캐시만 사용 (새 호출은 안 함).

  /** 랭킹 라벨("🏆 팀 1위" 등)에서 숫자 순위만 추출 — 4위 이하는 null */
  function extractRankNum(label: string | undefined): number | null {
    if (!label) return null;
    if (label.includes("1위")) return 1;
    if (label.includes("2위")) return 2;
    if (label.includes("3위")) return 3;
    return null;
  }

  const signatureInput = {
    cat, goals: totalGoals, assists: totalAssists, mvp: totalMvp,
    cleanSheets, matchCount: attended, attendanceRate, winRate,
    isTopScorer, isTopAssist, isTopMvp,
    playerKey: name,
    // 팀 비교 데이터 — 레거시 AI 입력 필드. 룰 기반에서는 사용 안 함.
    teamScorerRank: extractRankNum(goalsRank),
    teamAssistRank: extractRankNum(assistsRank),
    teamMvpRank: extractRankNum(mvpRank),
    teamMemberCount: memberAggs.length,
    teamTotalMatches: matchIds.length,
    goalsPerGame: attended > 0 ? Math.round((totalGoals / attended) * 100) / 100 : null,
    mvpRate: attended > 0 ? Math.round((totalMvp / attended) * 100) / 100 : null,
    goalStreak: goalStreak >= 3 ? goalStreak : null,
    attendanceStreak: attendanceStreak >= 5 ? attendanceStreak : null,
  };
  const signature = await getOrGenerateSignature({
    teamMemberId: m.id,
    cachedSignature: m.ai_signature,
    cachedGeneratedAt: m.ai_signature_generated_at,
    enableGenerate: enableAi,
    input: { ...signatureInput, playerName: name },
    userId: callerUserId,
    teamId: callerTeamId,
  });

  // === OVR + PlayerCardProps 산출 ===
  const concededPerGame = attended > 0
    ? [...attendedMatchIds].reduce((sum, mid) => sum + (scoreMap.get(mid)?.opp ?? 0), 0) / attended
    : 0;
  const ovr = calculateOVR(
    cat,
    attended > 0 ? totalGoals / attended : 0,
    attended > 0 ? totalAssists / attended : 0,
    attendanceRate,
    attended > 0 ? totalMvp / attended : 0,
    winRate,
    attended > 0 ? cleanSheets / attended : 0,
    concededPerGame,
    attended,
  );
  const rarity = getRarity(ovr);

  // 카드 스탯 배열 (포지션별 hero stat + rank/streak)
  const heroKey = getHeroStatKey(cat);
  const cardStats: StatWithContext[] = [
    {
      label: "골", value: String(totalGoals),
      rank: goalsRank, isHero: heroKey === "goals",
      streak: goalStreak >= 3 ? `🔥 ${goalStreak}경기 연속` : undefined,
    },
    {
      label: "어시", value: String(totalAssists),
      rank: assistsRank, isHero: heroKey === "assists",
    },
    {
      label: "MOM", value: String(totalMvp),
      rank: mvpRank, isHero: heroKey === "mvp",
    },
    {
      label: "출석률", value: `${Math.round(attendanceRate * 100)}%`,
      isHero: false,
      streak: attendanceStreak >= 5 ? `🔥 ${attendanceStreak}경기 연속` : undefined,
    },
    {
      label: "승률", value: `${Math.round(winRate * 100)}%`,
      isHero: false,
    },
    {
      label: "경기", value: String(attended),
      isHero: false,
    },
  ];
  // DEF/GK는 골 대신 클린시트를 hero로
  if (heroKey === "cleanSheet") {
    cardStats[0] = {
      label: "클린시트", value: String(cleanSheets),
      isHero: true,
    };
  }

  const playerCardProps: PlayerCardProps = {
    ovr, rarity, positionLabel: posLabel, positionCategory: cat,
    playerName: name, jerseyNumber: m.jersey_number, teamName,
    teamPrimaryColor, teamLogoUrl, seasonName: season.name, photoUrl,
    signature, stats: cardStats,
  };

  // 최근 경기
  const recentMatches = (matches ?? [])
    .filter((mm) => attendedMatchIds.has(mm.id))
    .slice(0, 10)
    .map((mm) => {
      const s = scoreMap.get(mm.id) ?? { our: 0, opp: 0 };
      const result: "W" | "D" | "L" = s.our > s.opp ? "W" : s.our < s.opp ? "L" : "D";
      return {
        date: mm.match_date,
        opponent: mm.opponent_name ?? (mm.match_type === "INTERNAL" ? "자체전" : ""),
        score: `${s.our}:${s.opp}`,
        result,
        goals: goalsByMatch.get(mm.id) ?? 0,
        assists: assistsByMatch.get(mm.id) ?? 0,
        mvp: mvpByMatch.has(mm.id),
        isHighlight: (goalsByMatch.get(mm.id) ?? 0) >= 2 || mvpByMatch.has(mm.id),
      };
    });

  // 출석 히트맵 — 최근 15경기 (출석/결석 + 결과). 오래된 경기 → 최신 순서
  const attendanceHistory = (matches ?? [])
    .slice(0, 15)
    .reverse()
    .map((mm) => {
      const attended = attendedMatchIds.has(mm.id);
      const s = scoreMap.get(mm.id) ?? { our: 0, opp: 0 };
      const result: "W" | "D" | "L" | null = !attended
        ? null
        : s.our > s.opp ? "W" : s.our < s.opp ? "L" : "D";
      return { date: mm.match_date, attended, result };
    });

  const stats: PlayerStats = {
    goals: totalGoals, assists: totalAssists, mvp: totalMvp,
    attended, totalMatches: matchIds.length,
    attendanceRate, winRate, cleanSheets,
    attackPoints: totalGoals + totalAssists,
    goalsRank, assistsRank,
    attendanceStreak: attendanceStreak >= 5 ? attendanceStreak : undefined,
    goalStreak: goalStreak >= 3 ? goalStreak : undefined,
  };

  return {
    name, teamName, teamPrimaryColor, positions, preferredFoot,
    jerseyNumber: m.jersey_number,
    teamRole: (m.team_role === "CAPTAIN" || m.team_role === "VICE_CAPTAIN" ? m.team_role : null) as PlayerProfile["teamRole"],
    seasonName: season.name, signature: signature ?? "",
    playerCardProps, stats, bestMoments, recentMatches, attendanceHistory,
    userId: m.user_id ?? undefined,
  };
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { memberId } = await params;
  const { team } = await searchParams;
  const data = await getPlayerData(memberId, team);
  if (!data) return { title: "선수 프로필 | PitchMaster" };
  return {
    title: `${data.name} — ${data.teamName} | PitchMaster`,
    description: data.stats
      ? `${data.stats.goals}골 ${data.stats.assists}어시 · 출석률 ${Math.round(data.stats.attendanceRate * 100)}% · ${data.seasonName} 시즌`
      : `${data.teamName} 소속 선수`,
  };
}

// 공개 페이지 — 30분 ISR
export const revalidate = 1800;

export default async function PlayerProfilePageRoute({ params, searchParams }: Props) {
  const { memberId } = await params;
  const { team } = await searchParams;

  // 시그니처 — 룰 기반 패턴 풀(fe92497) 로 전환돼 LLM 호출 없음. 전체 공개.
  // auth() 호출로 페이지가 dynamic rendering 됨 (ISR revalidate 무력화되지만 의도한 바).
  const session = await auth().catch(() => null);
  const enableAi = true;

  const data = await getPlayerData(memberId, team, enableAi, session?.user?.id ?? null, session?.user?.teamId ?? null);
  if (!data) return notFound();

  // PitchScore™ 점진 출시 — 김선휘만 활성 (검증 단계). CLAUDE.md AI Feature Flag 패턴과 동일.
  // 비로그인 viewer + 일반 로그인 사용자 모두 카드 안 노출. 김선휘가 본인 자가 평가로 흐름 검증.
  // 안정되면 이 조건을 제거(또는 팀 단위 점진 확대)하여 전체 오픈.
  const enablePitchScore = session?.user?.name === "김선휘";
  if (!enablePitchScore) {
    data.userId = undefined;
  }

  if (!data.stats) {
    return <PlayerProfileEmpty name={data.name} teamName={data.teamName} positions={data.positions} />;
  }

  return <PlayerProfilePage profile={data} />;
}
