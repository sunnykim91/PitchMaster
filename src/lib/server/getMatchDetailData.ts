import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function getMatchDetailData(matchId: string, teamId: string) {
  const db = getSupabaseAdmin();
  if (!db) return null;

  const [matchRes, goalsRes, mvpRes, attendanceCheckRes, guestsRes, internalTeamsRes, diaryRes, membersRes, teamRes, voteRes] = await Promise.all([
    db.from("matches").select("*").eq("id", matchId).eq("team_id", teamId).single(),
    db.from("match_goals").select("*").eq("match_id", matchId).order("quarter_number").order("minute"),
    db.from("match_mvp_votes").select("*").eq("match_id", matchId),
    db.from("match_attendance").select("user_id, actually_attended").eq("match_id", matchId),
    db.from("match_guests").select("*").eq("match_id", matchId),
    db.from("match_internal_teams").select("player_id, side").eq("match_id", matchId),
    db.from("match_diary").select("*").eq("match_id", matchId).maybeSingle(),
    db.from("team_members").select("id, role, user_id, pre_name, coach_positions, users(id, name, preferred_positions)").eq("team_id", teamId).in("status", ["ACTIVE", "DORMANT"]),
    db.from("teams").select("sport_type, uniform_primary, uniform_secondary, uniform_pattern").eq("id", teamId).single(),
    db.from("match_attendance").select("id, match_id, user_id, member_id, vote, voted_at, users(id, name, preferred_positions), member:team_members(id, pre_name, user_id, coach_positions, users(id, name, preferred_positions))").eq("match_id", matchId),
  ]);

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
  };
}
