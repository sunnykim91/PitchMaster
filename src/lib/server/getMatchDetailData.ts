import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getWeatherData } from "@/lib/server/getWeather";
import { getOrGenerateMatchSummary } from "@/lib/server/aiMatchSummaryCache";
import type { MatchSummaryInput } from "@/lib/server/aiMatchSummary";
import { getOrComputeTeamStats, findOpponentHistory } from "@/lib/server/aiTeamStats";

export async function getMatchDetailData(matchId: string, teamId: string, enableAi: boolean = false, userId: string | null = null) {
  const db = getSupabaseAdmin();
  if (!db) return null;

  const [matchRes, goalsRes, mvpRes, attendanceCheckRes, guestsRes, internalTeamsRes, diaryRes, membersRes, teamRes, voteRes, commentsRes] = await Promise.all([
    db.from("matches").select("*").eq("id", matchId).eq("team_id", teamId).single(),
    db.from("match_goals").select("*").eq("match_id", matchId).order("display_order", { ascending: true, nullsFirst: false }).order("created_at", { ascending: true }),
    db.from("match_mvp_votes").select("*").eq("match_id", matchId),
    db.from("match_attendance").select("user_id, member_id, actually_attended, attendance_status").eq("match_id", matchId),
    db.from("match_guests").select("*").eq("match_id", matchId),
    db.from("match_internal_teams").select("player_id, side").eq("match_id", matchId),
    db.from("match_diaries").select("*").eq("match_id", matchId).maybeSingle(),
    db.from("team_members").select("id, role, user_id, status, pre_name, coach_positions, jersey_number, team_role, dormant_type, dormant_until, dormant_reason, users(id, name, preferred_positions)").eq("team_id", teamId).in("status", ["ACTIVE", "DORMANT"]),
    db.from("teams").select("sport_type, uniform_primary, uniform_secondary, uniform_pattern, uniforms, default_formation_id, stats_recording_staff_only").eq("id", teamId).single(),
    db.from("match_attendance").select("id, match_id, user_id, member_id, vote, voted_at, users(id, name, preferred_positions), member:team_members(id, pre_name, user_id, coach_positions, users(id, name, preferred_positions))").eq("match_id", matchId),
    db.from("match_comments").select("id, user_id, content, created_at, users(name)").eq("match_id", matchId).order("created_at", { ascending: true }),
  ]);

  // 날씨 prefetch — 미래 경기(≤5일)만 실제 호출, 아니면 null
  // COMPLETED 경기는 호출 생략
  const match = matchRes.data;
  let weather: Awaited<ReturnType<typeof getWeatherData>> = null;
  if (match && match.status !== "COMPLETED" && match.date) {
    weather = await getWeatherData(match.date, match.location ?? "");
  }

  // AI 경기 후기 — COMPLETED 경기만, 캐시 있으면 재사용, 김선휘면 새 생성
  let aiSummary: string | null = null;
  // AI 경기 후기는 REGULAR(상대전)만 생성. 자체전(INTERNAL)·팀일정(EVENT)은 제외.
  if (match && match.status === "COMPLETED" && (match.match_type ?? "REGULAR") === "REGULAR") {
    const goalsData = goalsRes.data ?? [];
    const members = membersRes.data ?? [];
    // scorer_id / assist_id → 이름 매핑
    const nameByIdOrMemberId = (id: string | null): string | null => {
      if (!id) return null;
      if (id === "OPPONENT") return null;
      const m = members.find((mm) => mm.user_id === id || mm.id === id);
      if (!m) return null;
      // @ts-expect-error — supabase join 타입 이슈
      return m.users?.name ?? m.pre_name ?? null;
    };
    const our = goalsData.filter((g) => g.scorer_id !== "OPPONENT" && !g.is_own_goal).length;
    const opp = goalsData.filter((g) => g.scorer_id === "OPPONENT" || g.is_own_goal).length;
    const resultKey: "W" | "D" | "L" = our > opp ? "W" : our < opp ? "L" : "D";

    // MVP 집계 (가장 많은 득표)
    const mvpCounts: Record<string, number> = {};
    (mvpRes.data ?? []).forEach((v) => {
      if (v.candidate_id) mvpCounts[v.candidate_id] = (mvpCounts[v.candidate_id] ?? 0) + 1;
    });
    const momId = Object.entries(mvpCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;

    const goalsForInput = goalsData
      .filter((g) => g.scorer_id !== "OPPONENT" && !g.is_own_goal)
      .map((g) => ({
        scorerName: nameByIdOrMemberId(g.scorer_id) ?? "동료",
        quarter: g.quarter ?? null,
        isOwnGoal: false,
      }));
    const assistsForInput = goalsData
      .map((g) => nameByIdOrMemberId(g.assist_id))
      .filter((n): n is string => !!n);
    const topScorerMap: Record<string, number> = {};
    goalsForInput.forEach((g) => { topScorerMap[g.scorerName] = (topScorerMap[g.scorerName] ?? 0) + 1; });
    const topScorerName = Object.entries(topScorerMap).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;

    const attendanceCount = (attendanceCheckRes.data ?? []).filter(
      (a) => a.attendance_status === "PRESENT" || a.attendance_status === "LATE"
    ).length;

    // 추가 컨텍스트 (상대전적·시즌 스탯) — 캐시 miss + 생성 권한 있을 때만 조회
    let opponentHistory: MatchSummaryInput["opponentHistory"] = null;
    let scorerSeasonGoals: MatchSummaryInput["scorerSeasonGoals"] = undefined;
    let momSeasonCount: MatchSummaryInput["momSeasonCount"] = null;
    const hasCachedSummary = Boolean(match.ai_summary) || Boolean(match.ai_summary_generated_at);
    if (!hasCachedSummary && enableAi) {
      try {
        const teamStats = await getOrComputeTeamStats(teamId);
        if (match.opponent_name) {
          const oppEntry = findOpponentHistory(teamStats, match.opponent_name);
          if (oppEntry && oppEntry.played > 0) {
            const last = oppEntry.recentScores[0];
            opponentHistory = {
              played: oppEntry.played,
              won: oppEntry.won,
              drawn: oppEntry.drawn,
              lost: oppEntry.lost,
              lastScore: last ? { us: last.us, opp: last.opp, date: last.date } : undefined,
            };
          }
        }
        const careerByName = new Map(teamStats.playerCareerStats.map((p) => [p.playerName, p]));
        scorerSeasonGoals = {};
        for (const g of goalsForInput) {
          const stat = careerByName.get(g.scorerName);
          if (stat) scorerSeasonGoals[g.scorerName] = stat.totalGoals;
        }
        const momName = nameByIdOrMemberId(momId);
        if (momName) momSeasonCount = careerByName.get(momName)?.mvpCount ?? null;
      } catch (err) {
        console.warn("[getMatchDetailData] aiTeamStats 조회 실패 (무시):", err);
      }
    }

    const summaryInput: MatchSummaryInput = {
      matchType: (match.match_type as "REGULAR" | "INTERNAL" | "EVENT") ?? "REGULAR",
      score: match.match_type === "EVENT" ? null : { us: our, opp },
      result: match.match_type === "EVENT" ? null : resultKey,
      opponent: match.opponent_name ?? null,
      goals: goalsForInput,
      assists: assistsForInput,
      mom: nameByIdOrMemberId(momId),
      topScorerName,
      attendanceCount,
      playerCount: match.player_count ?? 11, // 없으면 축구 기본 11
      location: match.location ?? null,
      weather: match.weather ?? null,
      date: match.date ?? "",
      opponentHistory,
      scorerSeasonGoals,
      momSeasonCount,
    };

    aiSummary = await getOrGenerateMatchSummary({
      matchId: match.id,
      cachedSummary: match.ai_summary ?? null,
      cachedGeneratedAt: match.ai_summary_generated_at ?? null,
      enableGenerate: enableAi,
      input: summaryInput,
      userId,
      teamId,
    });
  }

  return {
    matches: matchRes.data ? { matches: [matchRes.data] } : { matches: [] },
    goals: { goals: goalsRes.data ?? [] },
    mvp: { votes: mvpRes.data ?? [] },
    attendanceCheck: { attendance: attendanceCheckRes.data ?? [] },
    guests: { guests: guestsRes.data ?? [] },
    internalTeams: { teams: internalTeamsRes.data ?? [] },
    diary: { diary: diaryRes.data ?? null },
    members: { members: membersRes.data ?? [] },
    team: { team: teamRes.data ?? {} },
    vote: { attendance: voteRes.data ?? [] },
    comments: { comments: commentsRes.data ?? [] },
    weather,
    aiSummary,
    aiSummaryRegenerateCount: (match as Record<string, unknown>)?.ai_summary_regenerate_count as number ?? 0,
  };
}
