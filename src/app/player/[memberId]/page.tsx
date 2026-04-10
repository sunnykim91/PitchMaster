import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Metadata } from "next";
import {
  classifyPosition,
  generateSignature,
  computeRankLabel,
  computeStreak,
  findBestMoments,
  type MatchPerformance,
  type BestMoment,
} from "@/lib/playerCardUtils";

type Props = { params: Promise<{ memberId: string }> };

type MemberRow = {
  id: string;
  user_id: string | null;
  pre_name: string | null;
  jersey_number: number | null;
  team_role: string | null;
  team_id: string;
  users: { name: string; preferred_positions: string[] } | null;
  teams: { name: string; sport_type: string; uniform_primary: string | null } | null;
};

async function getPlayerData(memberId: string) {
  const db = getSupabaseAdmin();
  if (!db) return null;

  // memberId는 user_id 또는 team_members.id
  const { data: member } = await db
    .from("team_members")
    .select("id, user_id, pre_name, jersey_number, team_role, team_id, users(name, preferred_positions), teams(name, sport_type, uniform_primary)")
    .or(`user_id.eq.${memberId},id.eq.${memberId}`)
    .eq("status", "ACTIVE")
    .limit(1)
    .single();

  if (!member) return null;
  const m = member as unknown as MemberRow;
  const user = m.users;
  const team = m.teams;
  const name = user?.name ?? m.pre_name ?? "";
  const teamName = team?.name ?? "";
  const positions = user?.preferred_positions ?? [];
  const lookupIds = m.user_id ? [m.user_id, m.id] : [m.id];

  // 활성 시즌
  const { data: season } = await db
    .from("seasons")
    .select("id, name, start_date, end_date")
    .eq("team_id", m.team_id)
    .eq("is_active", true)
    .limit(1)
    .single();

  if (!season) return { name, teamName, positions, jerseyNumber: m.jersey_number, teamRole: m.team_role, stats: null, recentMatches: [], seasonName: "" };

  // 시즌 내 COMPLETED 경기
  const { data: matches } = await db
    .from("matches")
    .select("id, match_date, opponent_name, match_type")
    .eq("team_id", m.team_id)
    .eq("status", "COMPLETED")
    .gte("match_date", season.start_date)
    .lte("match_date", season.end_date)
    .order("match_date", { ascending: false });

  const matchIds = (matches ?? []).map((m) => m.id);
  if (matchIds.length === 0) return {
    name, teamName, positions, jerseyNumber: m.jersey_number, teamRole: m.team_role,
    stats: null, recentMatches: [], seasonName: season.name,
    signature: undefined, bestMoments: [],
  };

  // 출석 + 팀 멤버 전체 (랭킹 산출용)
  const [attendanceRes, allMembersRes] = await Promise.all([
    db
      .from("match_attendance")
      .select("match_id, user_id, member_id")
      .in("match_id", matchIds)
      .eq("vote", "ATTEND"),
    db
      .from("team_members")
      .select("id, user_id")
      .eq("team_id", m.team_id)
      .in("status", ["ACTIVE", "DORMANT"]),
  ]);
  const attendance = attendanceRes.data ?? [];
  const allTeamMembers = (allMembersRes.data ?? []) as Array<{ id: string; user_id: string | null }>;

  const attendedMatchIds = new Set<string>();
  for (const a of attendance) {
    if (lookupIds.includes(a.user_id) || lookupIds.includes(a.member_id)) {
      attendedMatchIds.add(a.match_id);
    }
  }

  // 골/어시/MVP — 팀 전체로 로드 (랭킹 산출 + 본인 필터)
  const [allGoalsByScorerRes, allAssistsRes, allMvpRes, allGoalsRes] = await Promise.all([
    db.from("match_goals").select("match_id, scorer_id").in("match_id", matchIds).eq("is_own_goal", false),
    db.from("match_goals").select("match_id, assist_id").in("match_id", matchIds).not("assist_id", "is", null),
    db.from("match_mvp_votes").select("match_id, candidate_id").in("match_id", matchIds),
    db.from("match_goals").select("match_id, scorer_id, is_own_goal").in("match_id", matchIds),
  ]);

  // 본인 골/어시/MVP — lookupIds 로 필터
  const myGoals = (allGoalsByScorerRes.data ?? []).filter((g) => lookupIds.includes(g.scorer_id));
  const myAssists = (allAssistsRes.data ?? []).filter((a) => lookupIds.includes(a.assist_id));
  const myMvp = (allMvpRes.data ?? []).filter((v) => lookupIds.includes(v.candidate_id));

  const totalGoals = myGoals.length;
  const totalAssists = myAssists.length;
  const totalMvp = myMvp.length;

  // 경기별 골/어시 (본인)
  const goalsByMatch = new Map<string, number>();
  for (const g of myGoals) {
    goalsByMatch.set(g.match_id, (goalsByMatch.get(g.match_id) ?? 0) + 1);
  }
  const assistsByMatch = new Map<string, number>();
  for (const a of myAssists) {
    assistsByMatch.set(a.match_id, (assistsByMatch.get(a.match_id) ?? 0) + 1);
  }
  const mvpByMatch = new Set<string>();
  for (const v of myMvp) {
    mvpByMatch.add(v.match_id);
  }

  // 경기별 스코어
  const scoreMap = new Map<string, { our: number; opp: number }>();
  for (const g of allGoalsRes.data ?? []) {
    const s = scoreMap.get(g.match_id) ?? { our: 0, opp: 0 };
    if (g.scorer_id === "OPPONENT" || g.is_own_goal) s.opp++;
    else s.our++;
    scoreMap.set(g.match_id, s);
  }

  // 클린시트, 승률
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

  // === 팀 내 랭킹 산출 ===
  type MemberAgg = { ids: string[]; goals: number; assists: number; mvp: number };
  const memberAggs: MemberAgg[] = allTeamMembers.map((tm) => ({
    ids: tm.user_id ? [tm.user_id, tm.id] : [tm.id],
    goals: 0,
    assists: 0,
    mvp: 0,
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

  // === 연속 기록 산출 (날짜 오름차순) ===
  const matchesAsc = [...(matches ?? [])].slice().sort((a, b) =>
    a.match_date < b.match_date ? -1 : 1
  );
  const attendFlagsAsc = matchesAsc.map((mm) => attendedMatchIds.has(mm.id));
  const attendanceStreak = computeStreak(attendFlagsAsc);

  const goalFlagsAsc = matchesAsc
    .filter((mm) => attendedMatchIds.has(mm.id))
    .map((mm) => (goalsByMatch.get(mm.id) ?? 0) > 0);
  const goalStreak = computeStreak(goalFlagsAsc);

  // === 베스트 모먼트 산출 ===
  const performanceHistory: MatchPerformance[] = matchesAsc.map((mm) => {
    const s = scoreMap.get(mm.id) ?? { our: 0, opp: 0 };
    return {
      matchId: mm.id,
      date: mm.match_date,
      opponent: mm.opponent_name ?? (mm.match_type === "INTERNAL" ? "자체전" : ""),
      ourScore: s.our,
      oppScore: s.opp,
      attended: attendedMatchIds.has(mm.id),
      goals: goalsByMatch.get(mm.id) ?? 0,
      assists: assistsByMatch.get(mm.id) ?? 0,
      mvp: mvpByMatch.has(mm.id),
    };
  });
  const bestMoments: BestMoment[] = findBestMoments(performanceHistory);

  // === 시그니처 카피 ===
  const cat = classifyPosition(positions);
  const signature = generateSignature({
    cat,
    goals: totalGoals,
    assists: totalAssists,
    mvp: totalMvp,
    cleanSheets,
    matchCount: attended,
    attendanceRate,
    winRate,
    isTopScorer,
    isTopAssist,
    isTopMvp,
  });

  // 최근 경기 (출전한 경기만, 최대 10개) — isHighlight 플래그 포함
  const recentMatches = (matches ?? [])
    .filter((mm) => attendedMatchIds.has(mm.id))
    .slice(0, 10)
    .map((mm) => {
      const s = scoreMap.get(mm.id) ?? { our: 0, opp: 0 };
      const result = s.our > s.opp ? "W" : s.our < s.opp ? "L" : "D";
      const matchGoals = goalsByMatch.get(mm.id) ?? 0;
      const matchAssists = assistsByMatch.get(mm.id) ?? 0;
      const matchMvp = mvpByMatch.has(mm.id);
      return {
        date: mm.match_date,
        opponent: mm.opponent_name ?? (mm.match_type === "INTERNAL" ? "자체전" : ""),
        score: `${s.our}:${s.opp}`,
        result,
        goals: matchGoals,
        assists: matchAssists,
        mvp: matchMvp,
        isHighlight: matchGoals >= 2 || matchMvp,
      };
    });

  return {
    name,
    teamName,
    positions,
    jerseyNumber: m.jersey_number,
    teamRole: m.team_role,
    seasonName: season.name,
    signature,
    stats: {
      goals: totalGoals,
      assists: totalAssists,
      mvp: totalMvp,
      attended,
      totalMatches: matchIds.length,
      attendanceRate,
      winRate,
      cleanSheets,
      attackPoints: totalGoals + totalAssists,
      goalsRank,
      assistsRank,
      mvpRank,
      attendanceStreak: attendanceStreak >= 5 ? attendanceStreak : undefined,
      goalStreak: goalStreak >= 3 ? goalStreak : undefined,
    },
    recentMatches,
    bestMoments,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { memberId } = await params;
  const data = await getPlayerData(memberId);
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

export default async function PlayerProfilePage({ params }: Props) {
  const { memberId } = await params;
  const data = await getPlayerData(memberId);
  if (!data) return notFound();

  const posLabel = data.positions.length > 0 ? data.positions[0] : "";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-md px-4 py-8">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <p className="text-xs tracking-[0.3em] text-white/40 uppercase">PitchMaster</p>
          <h1 className="mt-4 text-3xl font-bold tracking-wide">
            {data.name.split("").join(" ")}
          </h1>
          <p className="mt-2 text-white/60 text-sm">
            {data.teamName}
            {posLabel && ` · ${posLabel}`}
            {data.jerseyNumber !== null && ` · #${data.jerseyNumber}`}
          </p>
          {data.teamRole && (
            <span className="mt-1 inline-block rounded-full bg-white/10 px-3 py-0.5 text-xs text-white/60">
              {data.teamRole === "CAPTAIN" ? "주장" : data.teamRole === "VICE_CAPTAIN" ? "부주장" : ""}
            </span>
          )}
        </div>

        {/* 시즌 스탯 */}
        {data.stats && (
          <>
            <p className="text-xs text-white/40 uppercase tracking-widest mb-3">
              {data.seasonName} 시즌
            </p>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: "골", value: data.stats.goals },
                { label: "어시", value: data.stats.assists },
                { label: "MOM", value: data.stats.mvp },
                { label: "출석률", value: `${Math.round(data.stats.attendanceRate * 100)}%` },
                { label: "승률", value: `${Math.round(data.stats.winRate * 100)}%` },
                { label: "경기", value: data.stats.attended },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-white/5 p-3 text-center">
                  <p className="text-[10px] text-white/40 uppercase">{item.label}</p>
                  <p className="mt-1 text-xl font-bold">{item.value}</p>
                </div>
              ))}
            </div>

            {/* 추가 지표 */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              <div className="rounded-xl bg-white/5 p-3">
                <p className="text-[10px] text-white/40">클린시트</p>
                <p className="text-lg font-bold">{data.stats.cleanSheets}</p>
              </div>
              <div className="rounded-xl bg-white/5 p-3">
                <p className="text-[10px] text-white/40">공격 포인트</p>
                <p className="text-lg font-bold">{data.stats.attackPoints}</p>
              </div>
            </div>
          </>
        )}

        {/* 최근 경기 */}
        {data.recentMatches.length > 0 && (
          <>
            <p className="text-xs text-white/40 uppercase tracking-widest mb-3">최근 경기</p>
            <div className="space-y-2">
              {data.recentMatches.map((m, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                    m.result === "W" ? "bg-green-500/20 text-green-400"
                    : m.result === "L" ? "bg-red-500/20 text-red-400"
                    : "bg-white/10 text-white/60"
                  }`}>
                    {m.result === "W" ? "승" : m.result === "L" ? "패" : "무"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{m.opponent || "경기"}</span>
                      <span className="text-xs text-white/40">{m.score}</span>
                    </div>
                    <p className="text-xs text-white/30">{m.date}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {m.goals > 0 && <span className="text-xs">{"⚽".repeat(Math.min(m.goals, 3))}{m.goals > 3 ? `×${m.goals}` : ""}</span>}
                    {m.assists > 0 && <span className="text-xs">{"🅰️".repeat(Math.min(m.assists, 3))}{m.assists > 3 ? `×${m.assists}` : ""}</span>}
                    {m.mvp && <span className="text-xs">⭐</span>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 푸터 */}
        <div className="mt-10 text-center">
          <a href="https://www.pitch-master.app" className="text-xs text-white/20 hover:text-white/40 transition-colors">
            pitch-master.app
          </a>
        </div>
      </div>
    </div>
  );
}
