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

  // 시즌 날짜 범위로 경기 필터 (season_id FK 의존 안 함)
  let matchQuery = db.from("matches").select("id").eq("team_id", teamId).eq("status", "COMPLETED");
  if (activeSeason?.start_date && activeSeason?.end_date) {
    matchQuery = matchQuery.gte("match_date", activeSeason.start_date).lte("match_date", activeSeason.end_date);
  }
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

  // 팀 전적 계산 (시즌 기간 내 경기)
  let wins = 0, draws = 0, losses = 0, gf = 0, ga = 0;
  const recent5: ("W" | "D" | "L")[] = [];
  // matchIds는 이미 시즌 기간 내 완료 경기
  const { data: allGoals } = await db.from("match_goals").select("match_id, scorer_id").in("match_id", matchIds);
  const matchScores = new Map<string, { our: number; opp: number }>();
  for (const g of allGoals ?? []) {
    if (!matchScores.has(g.match_id)) matchScores.set(g.match_id, { our: 0, opp: 0 });
    const s = matchScores.get(g.match_id)!;
    if (g.scorer_id === "OPPONENT") s.opp++;
    else s.our++;
  }
  for (const mid of matchIds) {
    const s = matchScores.get(mid) ?? { our: 0, opp: 0 };
    gf += s.our;
    ga += s.opp;
    if (s.our > s.opp) { wins++; recent5.push("W"); }
    else if (s.our === s.opp) { draws++; recent5.push("D"); }
    else { losses++; recent5.push("L"); }
  }

  const teamRecord = { wins, draws, losses, goalsFor: gf, goalsAgainst: ga, recent5: recent5.slice(0, 5) };

  return { seasons: seasonList, activeSeasonId, records, teamRecord };
}
