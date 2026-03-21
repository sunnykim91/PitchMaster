import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type MemberRow = {
  id: string;
  user_id: string | null;
  pre_name: string | null;
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
      .select("id, user_id, pre_name, users(id, name, preferred_positions)")
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

    // 2. 실제 경기 통계
    const { data: allMatches } = await db.from("matches").select("id").eq("team_id", ctx.teamId).eq("status", "COMPLETED");
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
        cur.games = Math.max(cur.games, 1); // 최소 1
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
        attendanceRate: totalGames > 0 && s.attendance > 0 ? s.attendance / Math.max(s.games, totalGames) : (s.games > 0 ? s.attendance / s.games : 0),
        preferredPositions: [],
      }));

    return apiSuccess({ records, allTime: true });
  }

  // Get team members (연동 + 미연동)
  const { data: members } = await db
    .from("team_members")
    .select("id, user_id, pre_name, users(id, name, preferred_positions)")
    .eq("team_id", ctx.teamId)
    .eq("status", "ACTIVE");

  if (!members) return apiSuccess({ records: [] });

  // Get matches: 시즌 날짜 범위 또는 직접 날짜로 필터
  let matchQuery = db.from("matches").select("id").eq("team_id", ctx.teamId).eq("status", "COMPLETED");
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
        };
      }),
    });
  }

  // Bulk 쿼리 4개로 전체 데이터 한번에 조회 (N+1 → 6회 고정)
  const [goalsRes, assistsRes, mvpRes, attendanceRes] = await Promise.all([
    db.from("match_goals").select("scorer_id").in("match_id", matchIds).eq("is_own_goal", false),
    db.from("match_goals").select("assist_id").in("match_id", matchIds).not("assist_id", "is", null),
    db.from("match_mvp_votes").select("candidate_id").in("match_id", matchIds),
    db.from("match_attendance").select("user_id, member_id").in("match_id", matchIds).eq("vote", "ATTEND"),
  ]);

  // 카운트 맵 빌드
  const goalMap = new Map<string, number>();
  for (const row of goalsRes.data ?? []) {
    if (row.scorer_id) goalMap.set(row.scorer_id, (goalMap.get(row.scorer_id) ?? 0) + 1);
  }

  const assistMap = new Map<string, number>();
  for (const row of assistsRes.data ?? []) {
    if (row.assist_id) assistMap.set(row.assist_id, (assistMap.get(row.assist_id) ?? 0) + 1);
  }

  const mvpMap = new Map<string, number>();
  for (const row of mvpRes.data ?? []) {
    if (row.candidate_id) mvpMap.set(row.candidate_id, (mvpMap.get(row.candidate_id) ?? 0) + 1);
  }

  const attendByUserId = new Map<string, number>();
  const attendByMemberId = new Map<string, number>();
  for (const row of attendanceRes.data ?? []) {
    if (row.user_id) attendByUserId.set(row.user_id, (attendByUserId.get(row.user_id) ?? 0) + 1);
    if (row.member_id) attendByMemberId.set(row.member_id, (attendByMemberId.get(row.member_id) ?? 0) + 1);
  }

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
    const attended = userId
      ? (attendByUserId.get(userId) ?? 0) || (attendByMemberId.get(memberId) ?? 0)
      : (attendByMemberId.get(memberId) ?? 0);

    return {
      memberId: userId ?? memberId,
      name,
      goals,
      assists,
      mvp,
      attendanceRate: matchIds.length > 0 ? attended / matchIds.length : 0,
      preferredPositions: user?.preferred_positions ?? [],
    };
  });

  return apiSuccess({ records: stats });
}
