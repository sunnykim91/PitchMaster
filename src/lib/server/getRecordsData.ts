import { getSupabaseAdmin } from "@/lib/supabase/admin";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function getRecordsData(teamId: string) {
  const db = getSupabaseAdmin();
  if (!db) return { seasons: [], activeSeasonId: null, records: [] };

  const { data: seasons } = await db
    .from("seasons")
    .select("*")
    .eq("team_id", teamId)
    .order("start_date", { ascending: false });

  const seasonList = seasons ?? [];
  const activeSeason = seasonList.find((s: any) => s.is_active) ?? seasonList[0];
  const activeSeasonId: string | null = activeSeason?.id ?? null;

  // Records도 SSR에서 한번에 가져옴
  if (!activeSeasonId) return { seasons: seasonList, activeSeasonId: null, records: [] };

  let matchQuery = db.from("matches").select("id").eq("team_id", teamId).eq("status", "COMPLETED");
  matchQuery = matchQuery.eq("season_id", activeSeasonId);
  const { data: matches } = await matchQuery;
  const matchIds = (matches ?? []).map((m: any) => m.id);

  const { data: members } = await db
    .from("team_members")
    .select("id, user_id, pre_name, users(id, name, preferred_positions)")
    .eq("team_id", teamId)
    .eq("status", "ACTIVE");

  if (!members) return { seasons: seasonList, activeSeasonId, records: [] };

  if (matchIds.length === 0) {
    return {
      seasons: seasonList,
      activeSeasonId,
      records: members.map((m: any) => {
        const user = Array.isArray(m.users) ? m.users[0] : m.users;
        return {
          memberId: m.user_id ?? m.id, name: user?.name ?? m.pre_name ?? "",
          goals: 0, assists: 0, mvp: 0, attendanceRate: 0, preferredPositions: user?.preferred_positions ?? [],
        };
      }),
    };
  }

  const [goalsRes, assistsRes, mvpRes, attendanceRes] = await Promise.all([
    db.from("match_goals").select("scorer_id").in("match_id", matchIds).eq("is_own_goal", false),
    db.from("match_goals").select("assist_id").in("match_id", matchIds).not("assist_id", "is", null),
    db.from("match_mvp_votes").select("candidate_id").in("match_id", matchIds),
    db.from("match_attendance").select("user_id, member_id").in("match_id", matchIds).eq("vote", "ATTEND"),
  ]);

  const goalMap = new Map<string, number>();
  for (const row of goalsRes.data ?? []) { if (row.scorer_id) goalMap.set(row.scorer_id, (goalMap.get(row.scorer_id) ?? 0) + 1); }
  const assistMap = new Map<string, number>();
  for (const row of assistsRes.data ?? []) { if (row.assist_id) assistMap.set(row.assist_id, (assistMap.get(row.assist_id) ?? 0) + 1); }
  const mvpMap = new Map<string, number>();
  for (const row of mvpRes.data ?? []) { if (row.candidate_id) mvpMap.set(row.candidate_id, (mvpMap.get(row.candidate_id) ?? 0) + 1); }
  const attendByUser = new Map<string, number>();
  const attendByMember = new Map<string, number>();
  for (const row of attendanceRes.data ?? []) {
    if (row.user_id) attendByUser.set(row.user_id, (attendByUser.get(row.user_id) ?? 0) + 1);
    if (row.member_id) attendByMember.set(row.member_id, (attendByMember.get(row.member_id) ?? 0) + 1);
  }

  const records = members.map((m: any) => {
    const userId = m.user_id;
    const memberId = m.id;
    const user = Array.isArray(m.users) ? m.users[0] : m.users;
    const ids = userId ? [userId, memberId] : [memberId];
    const attended = userId
      ? (attendByUser.get(userId) ?? 0) || (attendByMember.get(memberId) ?? 0)
      : (attendByMember.get(memberId) ?? 0);
    return {
      memberId: userId ?? memberId,
      name: user?.name ?? m.pre_name ?? "",
      goals: ids.reduce((s, id) => s + (goalMap.get(id) ?? 0), 0),
      assists: ids.reduce((s, id) => s + (assistMap.get(id) ?? 0), 0),
      mvp: ids.reduce((s, id) => s + (mvpMap.get(id) ?? 0), 0),
      attendanceRate: matchIds.length > 0 ? attended / matchIds.length : 0,
      preferredPositions: user?.preferred_positions ?? [],
    };
  });

  return { seasons: seasonList, activeSeasonId, records };
}
