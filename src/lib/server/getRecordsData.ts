import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveValidMvp, pickStaffDecision, shouldApplyNewMvpPolicy } from "@/lib/mvpThreshold";

type SeasonRow = { id: string; is_active: boolean; start_date: string; end_date: string; [key: string]: unknown };
type MemberRow = {
  id: string;
  user_id: string | null;
  pre_name: string | null;
  jersey_number?: number | null;
  team_role?: string | null;
  users: { id: string; name: string; preferred_positions: string[] } | { id: string; name: string; preferred_positions: string[] }[] | null;
};

/**
 * 기록 페이지 SSR 데이터 fetch — 2단계 병렬화 (2026-05-05).
 *
 * 변경:
 *   - match_goals 중복 fetch 제거 (이전 scorer_id only + match_id+scorer_id+is_own_goal 두 번 → 한 번)
 *   - matches/members/teamSettings 병렬 (이전 직렬 3단)
 *   - 시즌 정보 의존 쿼리만 시즌 fetch 후 분리
 */
export async function getRecordsData(teamId: string) {
  const db = getSupabaseAdmin();
  if (!db) return { seasons: [], activeSeasonId: null, records: [] };

  // ── Stage 1: 시즌 + 팀 설정 병렬 ──
  const [seasonsRes, teamSettingsRes] = await Promise.all([
    db.from("seasons")
      .select("*")
      .eq("team_id", teamId)
      .order("start_date", { ascending: false }),
    db.from("teams")
      .select("mvp_vote_staff_only")
      .eq("id", teamId)
      .maybeSingle(),
  ]);

  const seasonList = (seasonsRes.data ?? []) as SeasonRow[];
  const activeSeason = seasonList.find((s) => s.is_active) ?? seasonList[0];
  const activeSeasonId: string | null = activeSeason?.id ?? null;
  const mvpVoteStaffOnly = teamSettingsRes.data?.mvp_vote_staff_only ?? false;

  if (!activeSeasonId) return { seasons: seasonList, activeSeasonId: null, records: [] };

  // ── Stage 2: matches + members 병렬 ──
  let matchQuery = db
    .from("matches")
    .select("id, match_date")
    .eq("team_id", teamId)
    .eq("status", "COMPLETED")
    .neq("stats_included", false);
  if (activeSeason?.start_date && activeSeason?.end_date) {
    matchQuery = matchQuery.gte("match_date", activeSeason.start_date).lte("match_date", activeSeason.end_date);
  }
  matchQuery = matchQuery.order("match_date", { ascending: false });

  const [matchesRes, membersRes] = await Promise.all([
    matchQuery,
    db.from("team_members")
      .select("id, user_id, pre_name, jersey_number, team_role, role, users(id, name, preferred_positions)")
      .eq("team_id", teamId)
      .in("status", ["ACTIVE", "DORMANT"]),
  ]);

  const matches = matchesRes.data ?? [];
  const matchIds = matches.map((m) => m.id);
  const members = membersRes.data;

  if (!members) return { seasons: seasonList, activeSeasonId, records: [] };
  const typedMembers = members as MemberRow[];

  // STAFF voter 셋 — members 한 번 fetch 한 결과에서 추출 (이전: 별도 staffMembersRes 쿼리)
  const staffVoterIds = new Set<string>(
    (members as Array<{ user_id: string | null; role: string }>)
      .filter((m) => m.role === "STAFF" || m.role === "PRESIDENT")
      .map((m) => m.user_id)
      .filter((id): id is string => !!id)
  );

  if (matchIds.length === 0) {
    // 레거시 통계 확인
    const legacyYear = activeSeason?.start_date ? parseInt(activeSeason.start_date.slice(0, 4)) : null;
    if (legacyYear) {
      const { data: legacy } = await db
        .from("legacy_player_stats")
        .select("*")
        .eq("team_id", teamId)
        .eq("year", legacyYear);

      if (legacy && legacy.length > 0) {
        const first = legacy[0] as Record<string, unknown>;
        return {
          seasons: seasonList,
          activeSeasonId,
          records: legacy.map((l: Record<string, unknown>) => ({
            memberId: (l.member_id as string) ?? (l.member_name as string),
            name: l.member_name as string,
            goals: l.goals as number,
            assists: l.assists as number,
            mvp: 0,
            attendanceRate: (l.games as number) > 0 ? (l.attendance as number) / (l.games as number) : 0,
            preferredPositions: [],
          })),
          teamRecord: {
            wins: (first.wins as number) ?? 0,
            draws: (first.draws as number) ?? 0,
            losses: (first.losses as number) ?? 0,
            goalsFor: 0, goalsAgainst: 0,
            recent5: [] as ("W" | "D" | "L")[],
          },
        };
      }
    }

    return {
      seasons: seasonList,
      activeSeasonId,
      records: typedMembers.map((m) => {
        const user = Array.isArray(m.users) ? m.users[0] : m.users;
        return {
          memberId: m.user_id ?? m.id, name: user?.name ?? m.pre_name ?? "",
          goals: 0, assists: 0, mvp: 0, attendanceRate: 0, preferredPositions: user?.preferred_positions ?? [],
          jerseyNumber: m.jersey_number ?? null, teamRole: m.team_role ?? null,
        };
      }),
    };
  }

  // ── Stage 3: 통계 raw 데이터 일괄 (이전 6개 + allGoals 별도 → 5개로 통합) ──
  // match_goals 한 번에 가져와 goalMap·matchScores 양쪽 사용 (이전 중복 fetch 제거)
  const [goalsRes, assistsRes, mvpRes, attendanceRes, actualAttendRes] = await Promise.all([
    db.from("match_goals").select("match_id, scorer_id, is_own_goal").in("match_id", matchIds),
    db.from("match_goals").select("assist_id").in("match_id", matchIds).not("assist_id", "is", null),
    db.from("match_mvp_votes").select("match_id, voter_id, candidate_id, is_staff_decision").in("match_id", matchIds),
    db.from("match_attendance").select("user_id, member_id").in("match_id", matchIds).eq("vote", "ATTEND"),
    db.from("match_attendance").select("match_id").in("match_id", matchIds).in("attendance_status", ["PRESENT", "LATE"]),
  ]);

  type GoalRow = { match_id: string; scorer_id: string; is_own_goal: boolean };
  const goalRows = (goalsRes.data ?? []) as GoalRow[];

  const goalMap = new Map<string, number>();
  for (const row of goalRows) {
    if (row.scorer_id && row.scorer_id !== "OPPONENT" && !row.is_own_goal) {
      goalMap.set(row.scorer_id, (goalMap.get(row.scorer_id) ?? 0) + 1);
    }
  }
  const assistMap = new Map<string, number>();
  for (const row of assistsRes.data ?? []) {
    if (row.assist_id) assistMap.set(row.assist_id, (assistMap.get(row.assist_id) ?? 0) + 1);
  }
  const attendByUser = new Map<string, number>();
  const attendByMember = new Map<string, number>();
  for (const row of attendanceRes.data ?? []) {
    if (row.user_id) attendByUser.set(row.user_id, (attendByUser.get(row.user_id) ?? 0) + 1);
    if (row.member_id) attendByMember.set(row.member_id, (attendByMember.get(row.member_id) ?? 0) + 1);
  }

  // 경기별 MVP winner
  const attendedPerMatch = new Map<string, number>();
  for (const a of actualAttendRes.data ?? []) {
    attendedPerMatch.set(a.match_id, (attendedPerMatch.get(a.match_id) ?? 0) + 1);
  }
  const votesByMatch = new Map<string, { votes: string[]; rows: Array<{ voter_id: string; candidate_id: string; is_staff_decision: boolean | null }> }>();
  for (const row of mvpRes.data ?? []) {
    if (!row.candidate_id) continue;
    const agg = votesByMatch.get(row.match_id) ?? { votes: [], rows: [] };
    agg.votes.push(row.candidate_id);
    agg.rows.push({ voter_id: row.voter_id, candidate_id: row.candidate_id, is_staff_decision: row.is_staff_decision });
    votesByMatch.set(row.match_id, agg);
  }
  const matchDateById = new Map<string, string>();
  for (const m of matches) matchDateById.set(m.id, m.match_date);

  const mvpMap = new Map<string, number>();
  for (const [mid, agg] of votesByMatch) {
    const newPolicy = shouldApplyNewMvpPolicy(matchDateById.get(mid), mvpVoteStaffOnly);
    const staffDecision = pickStaffDecision(agg.rows, staffVoterIds, {
      applyBackfillHealing: !newPolicy,
    });
    const winner = resolveValidMvp(agg.votes, attendedPerMatch.get(mid) ?? 0, staffDecision);
    if (winner) mvpMap.set(winner, (mvpMap.get(winner) ?? 0) + 1);
  }

  const records = typedMembers.map((m) => {
    const userId = m.user_id;
    const memberId = m.id;
    const user = Array.isArray(m.users) ? m.users[0] : m.users;
    const ids = userId ? [userId, memberId] : [memberId];
    const attended = Math.max(
      userId ? (attendByUser.get(userId) ?? 0) : 0,
      attendByMember.get(memberId) ?? 0
    );
    return {
      memberId: userId ?? memberId,
      name: user?.name ?? m.pre_name ?? "",
      goals: ids.reduce((s, id) => s + (goalMap.get(id) ?? 0), 0),
      assists: ids.reduce((s, id) => s + (assistMap.get(id) ?? 0), 0),
      mvp: ids.reduce((s, id) => s + (mvpMap.get(id) ?? 0), 0),
      attendanceRate: matchIds.length > 0 ? attended / matchIds.length : 0,
      preferredPositions: user?.preferred_positions ?? [],
      jerseyNumber: m.jersey_number ?? null,
      teamRole: m.team_role ?? null,
    };
  });

  // 팀 전적 — 위에서 받은 goalRows 재활용 (이전: allGoals 별도 fetch)
  let wins = 0, draws = 0, losses = 0, gf = 0, ga = 0;
  const recent5: ("W" | "D" | "L")[] = [];
  const matchScores = new Map<string, { our: number; opp: number }>();
  for (const g of goalRows) {
    if (!matchScores.has(g.match_id)) matchScores.set(g.match_id, { our: 0, opp: 0 });
    const s = matchScores.get(g.match_id)!;
    if (g.scorer_id === "OPPONENT" || g.is_own_goal) s.opp++;
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
