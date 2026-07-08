import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isTeamRecordMatch } from "@/lib/types";
import { aggregateGkCleanSheets, buildGkAttendeesByMatch, isGkPreferred, type GkSquadRow, type GkGoalRow, type GkRosterMember } from "@/lib/server/getGoalkeeperStats";
import { aggregateDefenderPoints, mergeDefenderStats, type DefenderSquadRow, type DefenderGoalRow } from "@/lib/server/getDefenderStats";
import { computeAttendanceRateWithHistory } from "@/lib/attendanceEligibility";

type MemberRow = {
  id: string;
  user_id: string | null;
  pre_name: string | null;
  jersey_number?: number | null;
  team_role?: string | null;
  joined_at?: string | null;
  users: { id: string; name: string; preferred_positions: string[] } | { id: string; name: string; preferred_positions: string[] }[] | null;
};

export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const seasonId = request.nextUrl.searchParams.get("seasonId");
  const startDate = request.nextUrl.searchParams.get("startDate");
  const endDate = request.nextUrl.searchParams.get("endDate");
  const mode = request.nextUrl.searchParams.get("mode"); // "all" = 전체 통합

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // 전체 통합 모드: 실제 경기 + 레거시 데이터 합산
  if (mode === "all") {
    // 멤버 전체 조회 (ACTIVE + DORMANT — ID→이름 매핑용)
    const { data: allMembers } = await db
      .from("team_members")
      .select("id, user_id, pre_name, jersey_number, team_role, users(id, name, preferred_positions)")
      .eq("team_id", ctx.teamId)
      .in("status", ["ACTIVE", "DORMANT"]);

    const idToName = new Map<string, string>();
    const nameToMemberId = new Map<string, string>();
    for (const m of (allMembers ?? []) as MemberRow[]) {
      const user = Array.isArray(m.users) ? m.users[0] : m.users;
      const name = user?.name ?? m.pre_name ?? "";
      const odeMemberId = m.user_id ?? m.id;
      if (name) {
        if (m.user_id) idToName.set(m.user_id, name);
        idToName.set(m.id, name);
        nameToMemberId.set(name, odeMemberId);
      }
    }

    // 1. 레거시 통계 전체 합산 (이름 기준)
    const { data: legacy } = await db
      .from("legacy_player_stats")
      .select("member_name, goals, assists, attendance, games")
      .eq("team_id", ctx.teamId);

    const nameMap = new Map<string, { goals: number; assists: number; attendance: number; games: number }>();
    for (const l of legacy ?? []) {
      const name = l.member_name as string;
      const cur = nameMap.get(name) ?? { goals: 0, assists: 0, attendance: 0, games: 0 };
      cur.goals += (l.goals as number) ?? 0;
      cur.assists += (l.assists as number) ?? 0;
      cur.attendance += (l.attendance as number) ?? 0;
      cur.games += (l.games as number) ?? 0;
      nameMap.set(name, cur);
    }

    // 2. 실제 경기 통계 (stats_included=false 제외)
    const { data: allMatches } = await db.from("matches").select("id").eq("team_id", ctx.teamId).eq("status", "COMPLETED").neq("stats_included", false);
    const allMatchIds = (allMatches ?? []).map((m) => m.id);

    if (allMatchIds.length > 0) {
      const [goalsRes, assistsRes, attendRes] = await Promise.all([
        db.from("match_goals").select("scorer_id").in("match_id", allMatchIds).eq("is_own_goal", false).neq("scorer_id", "OPPONENT").neq("scorer_id", "UNKNOWN"),
        db.from("match_goals").select("assist_id").in("match_id", allMatchIds).not("assist_id", "is", null),
        db.from("match_attendance").select("user_id, member_id").in("match_id", allMatchIds).eq("vote", "ATTEND"),
      ]);

      for (const row of goalsRes.data ?? []) {
        const name = idToName.get(row.scorer_id);
        if (!name) continue;
        const cur = nameMap.get(name) ?? { goals: 0, assists: 0, attendance: 0, games: 0 };
        cur.goals++;
        nameMap.set(name, cur);
      }
      for (const row of assistsRes.data ?? []) {
        if (!row.assist_id) continue;
        const name = idToName.get(row.assist_id);
        if (!name) continue;
        const cur = nameMap.get(name) ?? { goals: 0, assists: 0, attendance: 0, games: 0 };
        cur.assists++;
        nameMap.set(name, cur);
      }
      // 실제 경기 출석도 합산
      for (const row of attendRes.data ?? []) {
        const id = row.user_id ?? row.member_id;
        if (!id) continue;
        const name = idToName.get(id);
        if (!name) continue;
        const cur = nameMap.get(name) ?? { goals: 0, assists: 0, attendance: 0, games: 0 };
        cur.attendance++;
        nameMap.set(name, cur);
      }
    }

    // 3. 결과 반환 (이름 + 실제 memberId 매핑)
    const totalGames = allMatchIds.length;
    const records = [...nameMap.entries()]
      .filter(([name]) => name !== "UNKNOWN" && name !== "OPPONENT")
      .map(([name, s]) => ({
        memberId: nameToMemberId.get(name) ?? name,
        name,
        goals: s.goals,
        assists: s.assists,
        mvp: 0,
        attendanceRate: (s.games + totalGames) > 0 ? s.attendance / (s.games + totalGames) : 0,
        preferredPositions: [],
      }));

    return apiSuccess({ records, allTime: true });
  }

  // Get team members (연동 + 미연동) — 휴면 회원도 시즌 중 뛰었으면 기록에 포함.
  // SSR(getRecordsData)과 동일 기준으로 유지. BANNED만 제외.
  const { data: members } = await db
    .from("team_members")
    .select("id, user_id, pre_name, jersey_number, team_role, joined_at, users(id, name, preferred_positions)")
    .eq("team_id", ctx.teamId)
    .in("status", ["ACTIVE", "DORMANT"]);

  if (!members) return apiSuccess({ records: [] });

  // Get matches: 시즌 날짜 범위 또는 직접 날짜로 필터 (stats_included=false 제외)
  let matchQuery = db.from("matches").select("id, match_date, quarter_count, match_type").eq("team_id", ctx.teamId).eq("status", "COMPLETED").neq("stats_included", false);
  if (startDate && endDate) {
    // 직접 날짜 범위 지정 (기간 필터)
    matchQuery = matchQuery.gte("match_date", startDate).lte("match_date", endDate);
  } else if (seasonId) {
    const { data: season } = await db.from("seasons").select("start_date, end_date").eq("id", seasonId).single();
    if (season) {
      matchQuery = matchQuery.gte("match_date", season.start_date).lte("match_date", season.end_date);
    }
  }
  const { data: matches } = await matchQuery;
  const matchIds = matches?.map((m) => m.id) ?? [];
  const typedMembers = members as MemberRow[];

  if (matchIds.length === 0) {
    // 실제 경기 없으면 레거시 통계 확인
    let legacyYear: number | null = null;
    if (startDate && endDate) {
      const sy = parseInt(startDate.slice(0, 4));
      const ey = parseInt(endDate.slice(0, 4));
      if (sy === ey) legacyYear = sy;
    } else if (seasonId) {
      const { data: season } = await db.from("seasons").select("start_date").eq("id", seasonId).single();
      if (season) legacyYear = parseInt(season.start_date.slice(0, 4));
    }

    if (legacyYear) {
      const { data: legacy } = await db
        .from("legacy_player_stats")
        .select("*")
        .eq("team_id", ctx.teamId)
        .eq("year", legacyYear);

      if (legacy && legacy.length > 0) {
        return apiSuccess({
          records: legacy.map((l: Record<string, unknown>) => ({
            memberId: (l.member_id as string) ?? (l.member_name as string),
            name: l.member_name as string,
            goals: l.goals as number,
            assists: l.assists as number,
            mvp: 0,
            attendanceRate: (l.games as number) > 0 ? (l.attendance as number) / (l.games as number) : 0,
            preferredPositions: [],
          })),
          legacy: true,
          teamRecord: legacy.length > 0 ? {
            wins: (legacy[0] as Record<string, number>).wins ?? 0,
            draws: (legacy[0] as Record<string, number>).draws ?? 0,
            losses: (legacy[0] as Record<string, number>).losses ?? 0,
          } : undefined,
        });
      }
    }

    return apiSuccess({
      records: typedMembers.map((m) => {
        const user = Array.isArray(m.users) ? m.users[0] : m.users;
        return {
          memberId: m.user_id ?? m.id,
          name: user?.name ?? m.pre_name ?? "",
          goals: 0, assists: 0, mvp: 0, attendanceRate: 0,
          preferredPositions: user?.preferred_positions ?? [],
          jerseyNumber: m.jersey_number ?? null,
          teamRole: m.team_role ?? null,
        };
      }),
    });
  }

  // Bulk 쿼리 — 전체 데이터 한번에 조회
  const [goalsRes, assistsRes, mvpRes, attendanceRes, actualAttendRes, staffMembersRes, gkSquadsRes, concededGoalsRes, teamSettingsForMvpRes] = await Promise.all([
    db.from("match_goals").select("scorer_id").in("match_id", matchIds).eq("is_own_goal", false),
    db.from("match_goals").select("assist_id").in("match_id", matchIds).not("assist_id", "is", null),
    db.from("match_mvp_votes").select("match_id, voter_id, candidate_id, is_staff_decision, created_at").in("match_id", matchIds),
    db.from("match_attendance").select("match_id, user_id, member_id").in("match_id", matchIds).eq("vote", "ATTEND"),
    db.from("match_attendance").select("match_id").in("match_id", matchIds).in("attendance_status", ["PRESENT", "LATE"]),
    // is_staff_decision 백필 누락 치유 — 현재 STAFF+ voter의 과거 투표를 동적으로 확정 취급
    db.from("team_members").select("user_id").eq("team_id", ctx.teamId).in("role", ["STAFF", "PRESIDENT"]).not("user_id", "is", null),
    // 키퍼 클린시트용 — 전술판(쿼터별 GK 배정) + 실점 골(is_own_goal 필터 없이 전부)
    db.from("match_squads").select("match_id, quarter_number, positions, side").in("match_id", matchIds),
    db.from("match_goals").select("match_id, quarter_number, scorer_id, is_own_goal, side").in("match_id", matchIds),
    // 팀 설정(MVP 정책·평점 토글) — matchIds 비의존이라 위 묶음에 합류(순차 await 1회 제거)
    db.from("teams").select("mvp_vote_staff_only, player_rating_enabled").eq("id", ctx.teamId).maybeSingle(),
  ]);

  // 골키퍼 무실점 쿼터 — ① 전술판 쿼터별 ② 전술판 없으면 GK선호 참석자 경기→쿼터 환산 (SSR getRecordsData 와 동일 로직)
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
  // 폴백 출석 기준 = vote=ATTEND (기록 페이지 '출전' 정의와 동일)
  const gkAttendeesByMatch = buildGkAttendeesByMatch(gkMembers, attendanceRes.data ?? []);
  // 클린시트는 상대전(REGULAR)만 — 자체전(INTERNAL)·행사(EVENT) 무실점 오판 방지 (SSR getRecordsData 와 동일)
  const regularSet = new Set(
    ((matches ?? []) as Array<{ id: string; match_type?: string | null }>)
      .filter((m) => isTeamRecordMatch(m.match_type))
      .map((m) => m.id)
  );
  const matchQuarterCounts = new Map<string, number>(
    ((matches ?? []) as Array<{ id: string; quarter_count?: number | null }>)
      .filter((m) => regularSet.has(m.id))
      .map((m) => [m.id, m.quarter_count ?? 4])
  );
  const gkMap = aggregateGkCleanSheets(
    ((gkSquadsRes.data ?? []) as GkSquadRow[]).filter((s) => regularSet.has(s.match_id)),
    (concededGoalsRes.data ?? []) as GkGoalRow[],
    { fallback: { matchQuarterCounts, gkAttendeesByMatch } }
  );

  // 수비 포인트(센터백·풀백·윙백) — 전술판 있는 상대전만. 폴백 없음. (노진우/FC.LIBRE B 요청)
  const defMap = aggregateDefenderPoints(
    ((gkSquadsRes.data ?? []) as DefenderSquadRow[]).filter((s) => regularSet.has(s.match_id)),
    (concededGoalsRes.data ?? []) as DefenderGoalRow[]
  );

  // 카운트 맵 빌드 — OPPONENT/UNKNOWN/MERCENARY 는 실 선수 ID 아닌 sentinel 이라 제외 (유령 키 방지)
  const GOAL_SENTINELS = new Set(["OPPONENT", "UNKNOWN", "MERCENARY"]);
  const goalMap = new Map<string, number>();
  for (const row of goalsRes.data ?? []) {
    if (row.scorer_id && !GOAL_SENTINELS.has(row.scorer_id)) {
      goalMap.set(row.scorer_id, (goalMap.get(row.scorer_id) ?? 0) + 1);
    }
  }

  const assistMap = new Map<string, number>();
  for (const row of assistsRes.data ?? []) {
    if (row.assist_id) assistMap.set(row.assist_id, (assistMap.get(row.assist_id) ?? 0) + 1);
  }

  // 경기별 MVP winner만 집계 — SSR·API·match-summary 공통 헬퍼 (aggregateMvpsByMatch).
  // 참석자 70% 이상 투표 통과 시 최다득표자, 또는 운영진 직접 지정. 공동 1등이면 전원 인정.
  const { aggregateMvpsByMatch } = await import("@/lib/mvpThreshold");
  // 새 MVP 정책 (mvp_vote_staff_only=OFF + match_date >= 2026-05-04) + 평점 토글
  const teamSettingsForMvp = teamSettingsForMvpRes.data;
  const mvpVoteStaffOnlyForMvp = (teamSettingsForMvp as { mvp_vote_staff_only?: boolean } | null)?.mvp_vote_staff_only ?? false;
  const playerRatingEnabledForRecords = (teamSettingsForMvp as { player_rating_enabled?: boolean } | null)?.player_rating_enabled ?? false;
  const matchDateById = new Map<string, string>();
  for (const m of (matches ?? []) as Array<{ id: string; match_date: string }>) matchDateById.set(m.id, m.match_date);
  const attendedPerMatch = new Map<string, number>();
  for (const a of actualAttendRes.data ?? []) {
    attendedPerMatch.set(a.match_id, (attendedPerMatch.get(a.match_id) ?? 0) + 1);
  }
  const staffVoterIds = new Set<string>(
    (staffMembersRes.data ?? []).map((m) => m.user_id).filter((id): id is string => !!id)
  );
  const mvpMap = aggregateMvpsByMatch(
    (mvpRes.data ?? []) as Parameters<typeof aggregateMvpsByMatch>[0],
    attendedPerMatch,
    matchDateById,
    staffVoterIds,
    mvpVoteStaffOnlyForMvp
  );

  const attendByUserId = new Map<string, number>();
  const attendByMemberId = new Map<string, number>();
  // 회원별 출석 경기일 — 가입 전 출석(과거 데이터 이관) 판별용 (computeAttendanceRateWithHistory)
  const attendDatesByUser = new Map<string, string[]>();
  const attendDatesByMember = new Map<string, string[]>();
  for (const row of attendanceRes.data ?? []) {
    if (row.user_id) attendByUserId.set(row.user_id, (attendByUserId.get(row.user_id) ?? 0) + 1);
    if (row.member_id) attendByMemberId.set(row.member_id, (attendByMemberId.get(row.member_id) ?? 0) + 1);
    const d = matchDateById.get(row.match_id);
    if (d) {
      if (row.user_id) (attendDatesByUser.get(row.user_id) ?? attendDatesByUser.set(row.user_id, []).get(row.user_id)!).push(d);
      if (row.member_id) (attendDatesByMember.get(row.member_id) ?? attendDatesByMember.set(row.member_id, []).get(row.member_id)!).push(d);
    }
  }

  // 평점 시즌 집계 — 토글 ON 팀에만 옵셔널 필드. 잠정 도입 (FCO2 팀 요청, 2026-05-12)
  const ratingSumByUser = new Map<string, { sum: number; count: number }>();
  if (playerRatingEnabledForRecords && matchIds.length > 0) {
    const { data: ratingsForSeason } = await db
      .from("player_ratings")
      .select("ratee_id, score")
      .eq("team_id", ctx.teamId)
      .in("match_id", matchIds);
    for (const r of (ratingsForSeason ?? []) as Array<{ ratee_id: string; score: number }>) {
      const cur = ratingSumByUser.get(r.ratee_id) ?? { sum: 0, count: 0 };
      cur.sum += Number(r.score);
      cur.count += 1;
      ratingSumByUser.set(r.ratee_id, cur);
    }
  }

  // 출석률 분모용 — 시즌 전체 경기일 (회원별 가입일 이후만 카운트)
  const allMatchDates = (matches ?? []).map((mm) => (mm as { match_date: string }).match_date);

  // 멤버별 집계 (동기, O(1) 맵 조회)
  const stats = typedMembers.map((m) => {
    const userId = m.user_id;
    const memberId = m.id;
    const user = Array.isArray(m.users) ? m.users[0] : m.users;
    const name = user?.name ?? m.pre_name ?? "";
    const lookupIds = userId ? [userId, memberId] : [memberId];

    const goals = lookupIds.reduce((sum, id) => sum + (goalMap.get(id) ?? 0), 0);
    const assists = lookupIds.reduce((sum, id) => sum + (assistMap.get(id) ?? 0), 0);
    const mvp = lookupIds.reduce((sum, id) => sum + (mvpMap.get(id) ?? 0), 0);
    const attended = Math.max(
      userId ? (attendByUserId.get(userId) ?? 0) : 0,
      attendByMemberId.get(memberId) ?? 0
    );

    // 토글 ON 팀에만 옵셔널 평점 필드 — OFF 팀은 응답에서 필드 자체 미포함
    const ratingAgg = userId ? ratingSumByUser.get(userId) : undefined;
    const avgRating =
      playerRatingEnabledForRecords && ratingAgg && ratingAgg.count > 0
        ? Math.round((ratingAgg.sum / ratingAgg.count) * 10) / 10
        : undefined;
    const ratingCount =
      playerRatingEnabledForRecords && ratingAgg ? ratingAgg.count : undefined;

    // 키퍼 클린시트 — gkMap 키는 users.id 라 lookupIds(userId 포함)로 합산
    const gk = lookupIds.reduce(
      (acc, id) => {
        const v = gkMap.get(id);
        if (v) { acc.cleanSheets += v.cleanSheets; acc.quarters += v.quarters; }
        return acc;
      },
      { cleanSheets: 0, quarters: 0 }
    );

    // 수비 포인트 — defMap 키도 playerId 혼재라 lookupIds 양쪽으로 합산 (경기 union으로 이중계산 방지)
    const def = mergeDefenderStats(defMap, lookupIds);
    const defenderPoints = def.points;

    return {
      memberId: userId ?? memberId,
      name,
      goals,
      assists,
      mvp,
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
      ...(gk.quarters > 0 && { gkCleanSheets: gk.cleanSheets, gkQuarters: gk.quarters }),
      ...(defenderPoints > 0 && { defenderPoints, defenderCleanQuarters: def.cleanQuarters, defenderCleanMatches: def.cleanMatches }),
    };
  });

  return apiSuccess({ records: stats, totalSeasonMatches: matchIds.length });
}
