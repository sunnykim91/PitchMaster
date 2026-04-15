import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getWeatherData } from "@/lib/server/getWeather";
import { getOrGenerateMatchSummary } from "@/lib/server/aiMatchSummaryCache";
import type { MatchSummaryInput } from "@/lib/server/aiMatchSummary";

export async function getMatchDetailData(matchId: string, teamId: string, enableAi: boolean = false) {
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
  if (match && match.status === "COMPLETED") {
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
      location: match.location ?? null,
      weather: match.weather ?? null,
      date: match.date ?? "",
    };

    aiSummary = await getOrGenerateMatchSummary({
      matchId: match.id,
      cachedSummary: match.ai_summary ?? null,
      enableGenerate: enableAi,
      input: summaryInput,
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
  };
}
