import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
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
import { PlayerProfilePage, PlayerProfileEmpty } from "@/components/pitchmaster/PlayerProfilePage";
import type { PlayerProfile, PlayerStats } from "@/components/pitchmaster/PlayerProfilePage";
import type { PlayerCardProps, StatWithContext } from "@/components/pitchmaster/PlayerCard";

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
  users: { name: string; preferred_positions: string[]; profile_image_url: string | null } | null;
  teams: { name: string; sport_type: string; uniform_primary: string | null; logo_url: string | null } | null;
};

async function getPlayerData(memberId: string, teamId?: string): Promise<PlayerProfile | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;

  // 여러 팀 소속일 때 team 쿼리로 지정 가능. 없으면 첫 번째 팀 fallback.
  // ACTIVE + DORMANT 모두 허용 (휴면 회원도 프로필 열람 가능, BANNED만 제외)
  let query = db
    .from("team_members")
    .select("id, user_id, pre_name, jersey_number, team_role, team_id, users(name, preferred_positions, profile_image_url), teams(name, sport_type, uniform_primary, logo_url)")
    .or(`user_id.eq.${memberId},id.eq.${memberId}`)
    .in("status", ["ACTIVE", "DORMANT"]);
  if (teamId) query = query.eq("team_id", teamId);
  const { data: member } = await query.limit(1).single();

  if (!member) return null;
  const m = member as unknown as MemberRow;
  const user = m.users;
  const team = m.teams;
  const name = user?.name ?? m.pre_name ?? "";
  const teamName = team?.name ?? "";
  const teamPrimaryColor = team?.uniform_primary ?? "#e8613a";
  const teamLogoUrl = team?.logo_url ?? undefined;
  const positions = user?.preferred_positions ?? [];
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
      name, teamName, teamPrimaryColor, positions, jerseyNumber: m.jersey_number,
      teamRole: (m.team_role === "CAPTAIN" || m.team_role === "VICE_CAPTAIN" ? m.team_role : null) as PlayerProfile["teamRole"],
      seasonName: "", signature: "", playerCardProps: emptyCardProps,
      stats: null, bestMoments: [], recentMatches: [],
    };
  }

  // 시즌 내 COMPLETED 경기
  const { data: matches } = await db
    .from("matches")
    .select("id, match_date, opponent_name, match_type")
    .eq("team_id", m.team_id)
    .eq("status", "COMPLETED")
    .gte("match_date", season.start_date)
    .lte("match_date", season.end_date)
    .order("match_date", { ascending: false });

  const matchIds = (matches ?? []).map((mm) => mm.id);
  if (matchIds.length === 0) {
    return {
      name, teamName, teamPrimaryColor, positions, jerseyNumber: m.jersey_number,
      teamRole: (m.team_role === "CAPTAIN" || m.team_role === "VICE_CAPTAIN" ? m.team_role : null) as PlayerProfile["teamRole"],
      seasonName: season.name, signature: "", playerCardProps: { ...emptyCardProps, seasonName: season.name },
      stats: null, bestMoments: [], recentMatches: [],
    };
  }

  // 출석 + 팀 멤버 전체 (랭킹 산출용)
  const [attendanceRes, allMembersRes] = await Promise.all([
    db.from("match_attendance").select("match_id, user_id, member_id").in("match_id", matchIds).eq("vote", "ATTEND"),
    db.from("team_members").select("id, user_id").eq("team_id", m.team_id).in("status", ["ACTIVE", "DORMANT"]),
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
    db.from("match_mvp_votes").select("match_id, candidate_id").in("match_id", matchIds),
    db.from("match_goals").select("match_id, scorer_id, is_own_goal").in("match_id", matchIds),
  ]);

  const myGoals = (allGoalsByScorerRes.data ?? []).filter((g) => lookupIds.includes(g.scorer_id));
  const myAssists = (allAssistsRes.data ?? []).filter((a) => lookupIds.includes(a.assist_id));
  const myMvp = (allMvpRes.data ?? []).filter((v) => lookupIds.includes(v.candidate_id));

  const totalGoals = myGoals.length;
  const totalAssists = myAssists.length;
  const totalMvp = myMvp.length;

  const goalsByMatch = new Map<string, number>();
  for (const g of myGoals) goalsByMatch.set(g.match_id, (goalsByMatch.get(g.match_id) ?? 0) + 1);
  const assistsByMatch = new Map<string, number>();
  for (const a of myAssists) assistsByMatch.set(a.match_id, (assistsByMatch.get(a.match_id) ?? 0) + 1);
  const mvpByMatch = new Set<string>();
  for (const v of myMvp) mvpByMatch.add(v.match_id);

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
  for (const v of allMvpRes.data ?? []) {
    const agg = memberAggs.find((mm) => mm.ids.includes(v.candidate_id));
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

  // 시그니처
  const signature = generateSignature({
    cat, goals: totalGoals, assists: totalAssists, mvp: totalMvp,
    cleanSheets, matchCount: attended, attendanceRate, winRate,
    isTopScorer, isTopAssist, isTopMvp,
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
    name, teamName, teamPrimaryColor, positions,
    jerseyNumber: m.jersey_number,
    teamRole: (m.team_role === "CAPTAIN" || m.team_role === "VICE_CAPTAIN" ? m.team_role : null) as PlayerProfile["teamRole"],
    seasonName: season.name, signature: signature ?? "",
    playerCardProps, stats, bestMoments, recentMatches,
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
  const data = await getPlayerData(memberId, team);
  if (!data) return notFound();

  if (!data.stats) {
    return <PlayerProfileEmpty name={data.name} teamName={data.teamName} positions={data.positions} />;
  }

  return <PlayerProfilePage profile={data} />;
}
