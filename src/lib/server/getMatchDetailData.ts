import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getWeatherData } from "@/lib/server/getWeather";

export async function getMatchDetailData(matchId: string, teamId: string) {
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
  };
}
