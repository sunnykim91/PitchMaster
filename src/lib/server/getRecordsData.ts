import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { aggregateMvpsByMatch, type MvpVoteRow } from "@/lib/mvpThreshold";
import { isTeamRecordMatch, type Role } from "@/lib/types";
import { isStaffOrAbove } from "@/lib/permissions";
import { aggregateGkCleanSheets, buildGkAttendeesByMatch, isGkPreferred, type GkSquadRow, type GkGoalRow, type GkRosterMember } from "@/lib/server/getGoalkeeperStats";
import { aggregateDefenderPoints, mergeDefenderStats, type DefenderSquadRow, type DefenderGoalRow } from "@/lib/server/getDefenderStats";
import { computeAttendanceRateWithHistory } from "@/lib/attendanceEligibility";

type SeasonRow = { id: string; is_active: boolean; start_date: string; end_date: string; [key: string]: unknown };
type MemberRow = {
  id: string;
  user_id: string | null;
  pre_name: string | null;
  jersey_number?: number | null;
  team_role?: string | null;
  joined_at?: string | null;
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
      .select("mvp_vote_staff_only, player_rating_enabled")
      .eq("id", teamId)
      .maybeSingle(),
  ]);

  const seasonList = (seasonsRes.data ?? []) as SeasonRow[];
  const activeSeason = seasonList.find((s) => s.is_active) ?? seasonList[0];
  const activeSeasonId: string | null = activeSeason?.id ?? null;
  const mvpVoteStaffOnly = teamSettingsRes.data?.mvp_vote_staff_only ?? false;
  const playerRatingEnabled = teamSettingsRes.data?.player_rating_enabled ?? false;

  if (!activeSeasonId) return { seasons: seasonList, activeSeasonId: null, records: [] };

  // ── Stage 2: matches + members 병렬 ──
  let matchQuery = db
    .from("matches")
    .select("id, match_date, match_type, quarter_count")
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
      .select("id, user_id, pre_name, jersey_number, team_role, role, joined_at, users(id, name, preferred_positions)")
      .eq("team_id", teamId)
      .in("status", ["ACTIVE", "DORMANT"]),
  ]);

  const matches = matchesRes.data ?? [];
  const matchIds = matches.map((m) => m.id);
  // 팀 전적(W/D/L) 전용 — 상대전(REGULAR)만 (자체전·행사 제외). 선수 통계는 matchIds(전체) 유지.
  const recordMatchIds = matches
    .filter((m) => isTeamRecordMatch((m as { match_type?: string | null }).match_type))
    .map((m) => m.id);
  const members = membersRes.data;

  if (!members) return { seasons: seasonList, activeSeasonId, records: [] };
  const typedMembers = members as MemberRow[];

  // STAFF voter 셋 — members 한 번 fetch 한 결과에서 추출 (이전: 별도 staffMembersRes 쿼리)
  const staffVoterIds = new Set<string>(
    (members as Array<{ user_id: string | null; role: string }>)
      .filter((m) => isStaffOrAbove(m.role as Role))
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
  // 평점은 토글 ON 팀에만 추가 쿼리 (FCO2 팀 잠정 도입, 2026-05-12)
  const [goalsRes, assistsRes, mvpRes, attendanceRes, actualAttendRes, ratingsRes, squadsRes] = await Promise.all([
    db.from("match_goals").select("match_id, scorer_id, is_own_goal, quarter_number, side").in("match_id", matchIds),
    db.from("match_goals").select("assist_id").in("match_id", matchIds).not("assist_id", "is", null),
    db.from("match_mvp_votes").select("match_id, voter_id, candidate_id, is_staff_decision, created_at").in("match_id", matchIds),
    db.from("match_attendance").select("match_id, user_id, member_id").in("match_id", matchIds).eq("vote", "ATTEND"),
    db.from("match_attendance").select("match_id").in("match_id", matchIds).in("attendance_status", ["PRESENT", "LATE"]),
    playerRatingEnabled
      ? db.from("player_ratings").select("ratee_id, score").eq("team_id", teamId).in("match_id", matchIds)
      : Promise.resolve({ data: null }),
    db.from("match_squads").select("match_id, quarter_number, positions, side").in("match_id", matchIds),
  ]);

  type GoalRow = { match_id: string; scorer_id: string; is_own_goal: boolean; quarter_number: number | null; side: string | null };
  const goalRows = (goalsRes.data ?? []) as GoalRow[];

  // 골키퍼 무실점 쿼터 집계 — ① 전술판 있으면 쿼터별 정밀, ② 없으면 GK선호 참석자에 경기→쿼터 환산(폴백)
  const gkMembers: GkRosterMember[] = typedMembers
    .map((m) => {
      const user = Array.isArray(m.users) ? m.users[0] : m.users;
      return {
        canonicalId: m.user_id ?? m.id,
        ids: m.user_id ? [m.user_id, m.id] : [m.id],
        isGk: isGkPreferred(user?.preferred_positions),
      };
    })
    .filter((m) => m.isGk);
  // 폴백 출석 기준 = vote=ATTEND (기록 페이지 '출전' 정의와 동일. attendance_status 실제참석은 11%만 기록됨)
  const gkAttendeesByMatch = buildGkAttendeesByMatch(gkMembers, attendanceRes.data ?? []);
  // 클린시트는 상대전(REGULAR)만 — 자체전(INTERNAL, 골 side A/B)·행사(EVENT, 골 0)는 무실점 오판 방지.
  const regularSet = new Set(recordMatchIds);
  const matchQuarterCounts = new Map<string, number>(
    matches
      .filter((m) => regularSet.has(m.id))
      .map((m) => [m.id, (m as { quarter_count?: number | null }).quarter_count ?? 4])
  );
  const gkMap = aggregateGkCleanSheets(
    ((squadsRes.data ?? []) as GkSquadRow[]).filter((s) => regularSet.has(s.match_id)),
    goalRows as GkGoalRow[],
    { fallback: { matchQuarterCounts, gkAttendeesByMatch } }
  );

  // 수비 포인트(센터백·풀백·윙백) — 전술판 있는 상대전만. 폴백 없음. (노진우/FC.LIBRE B 요청)
  const defMap = aggregateDefenderPoints(
    ((squadsRes.data ?? []) as DefenderSquadRow[]).filter((s) => regularSet.has(s.match_id)),
    goalRows as DefenderGoalRow[]
  );

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

  // 경기별 MVP winner (공동 MVP 지원) — SSR·API·match-summary 공통 헬퍼 (aggregateMvpsByMatch)
  const attendedPerMatch = new Map<string, number>();
  for (const a of actualAttendRes.data ?? []) {
    attendedPerMatch.set(a.match_id, (attendedPerMatch.get(a.match_id) ?? 0) + 1);
  }
  const matchDateById = new Map<string, string>();
  for (const m of matches) matchDateById.set(m.id, m.match_date);
  // 회원별 출석 경기일 — 가입 전 출석(과거 데이터 이관) 판별용 (computeAttendanceRateWithHistory)
  const attendDatesByUser = new Map<string, string[]>();
  const attendDatesByMember = new Map<string, string[]>();
  for (const row of attendanceRes.data ?? []) {
    const d = matchDateById.get(row.match_id);
    if (!d) continue;
    if (row.user_id) (attendDatesByUser.get(row.user_id) ?? attendDatesByUser.set(row.user_id, []).get(row.user_id)!).push(d);
    if (row.member_id) (attendDatesByMember.get(row.member_id) ?? attendDatesByMember.set(row.member_id, []).get(row.member_id)!).push(d);
  }
  const mvpMap = aggregateMvpsByMatch(
    (mvpRes.data ?? []) as MvpVoteRow[],
    attendedPerMatch,
    matchDateById,
    staffVoterIds,
    mvpVoteStaffOnly
  );

  // 평점 시즌 집계 (토글 ON 팀만)
  const ratingSumByUser = new Map<string, { sum: number; count: number }>();
  if (playerRatingEnabled && ratingsRes.data) {
    for (const r of ratingsRes.data as Array<{ ratee_id: string; score: number }>) {
      const cur = ratingSumByUser.get(r.ratee_id) ?? { sum: 0, count: 0 };
      cur.sum += Number(r.score);
      cur.count += 1;
      ratingSumByUser.set(r.ratee_id, cur);
    }
  }

  // 출석률 분모용 — 시즌 전체 경기일 (회원별 가입일 이후만 카운트)
  const allMatchDates = matches.map((mm) => mm.match_date as string);

  const records = typedMembers.map((m) => {
    const userId = m.user_id;
    const memberId = m.id;
    const user = Array.isArray(m.users) ? m.users[0] : m.users;
    const ids = userId ? [userId, memberId] : [memberId];
    const attended = Math.max(
      userId ? (attendByUser.get(userId) ?? 0) : 0,
      attendByMember.get(memberId) ?? 0
    );

    // 평점 — 토글 ON 팀만 옵셔널 필드. OFF는 undefined → 응답 미포함
    const ratingAgg = userId ? ratingSumByUser.get(userId) : undefined;
    const avgRating =
      playerRatingEnabled && ratingAgg && ratingAgg.count > 0
        ? Math.round((ratingAgg.sum / ratingAgg.count) * 10) / 10
        : undefined;
    const ratingCount =
      playerRatingEnabled && ratingAgg ? ratingAgg.count : undefined;

    // 통합 수비 포인트 — 키퍼 무실점쿼터×2 + 필드수비 무실점쿼터×1 (서경카페 피드백 2026-07-12)
    // gkMap 키는 users.id, defMap 키는 playerId 혼재 — 둘 다 ids 양쪽으로 합산
    const defenseGkQuarters = ids.reduce((sum, id) => sum + (gkMap.get(id)?.cleanSheets ?? 0), 0);
    const defenseFieldQuarters = mergeDefenderStats(defMap, ids).cleanQuarters;
    const defensePoints = defenseGkQuarters * 2 + defenseFieldQuarters;

    return {
      memberId: userId ?? memberId,
      name: user?.name ?? m.pre_name ?? "",
      goals: ids.reduce((s, id) => s + (goalMap.get(id) ?? 0), 0),
      assists: ids.reduce((s, id) => s + (assistMap.get(id) ?? 0), 0),
      mvp: ids.reduce((s, id) => s + (mvpMap.get(id) ?? 0), 0),
      matches: attended,
      attendanceRate: computeAttendanceRateWithHistory(attended, allMatchDates, m.joined_at, [
        ...(userId ? attendDatesByUser.get(userId) ?? [] : []),
        ...(attendDatesByMember.get(memberId) ?? []),
      ]),
      preferredPositions: user?.preferred_positions ?? [],
      jerseyNumber: m.jersey_number ?? null,
      teamRole: m.team_role ?? null,
      ...(avgRating !== undefined && { avgRating }),
      ...(ratingCount !== undefined && { ratingCount }),
      ...(defensePoints > 0 && { defensePoints, defenseGkQuarters, defenseFieldQuarters }),
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
  // 팀 전적은 recordMatchIds(상대전 REGULAR)만 집계 — 자체전(A vs B, OPPONENT 골 없어 무조건 승 처리되던 버그)·행사 제외
  for (const mid of recordMatchIds) {
    const s = matchScores.get(mid) ?? { our: 0, opp: 0 };
    gf += s.our;
    ga += s.opp;
    if (s.our > s.opp) { wins++; recent5.push("W"); }
    else if (s.our === s.opp) { draws++; recent5.push("D"); }
    else { losses++; recent5.push("L"); }
  }

  const teamRecord = { wins, draws, losses, goalsFor: gf, goalsAgainst: ga, recent5: recent5.slice(0, 5) };

  return {
    seasons: seasonList,
    activeSeasonId,
    records,
    teamRecord,
    totalSeasonMatches: matchIds.length,
  };
}
