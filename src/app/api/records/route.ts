import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const seasonId = request.nextUrl.searchParams.get("seasonId");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // Get team members (연동 + 미연동)
  const { data: members } = await db
    .from("team_members")
    .select("id, user_id, pre_name, users(id, name, preferred_positions)")
    .eq("team_id", ctx.teamId)
    .eq("status", "ACTIVE");

  if (!members) return apiSuccess({ records: [] });

  // Get matches: 시즌 날짜 범위로 필터 (season_id FK 의존 안 함)
  let matchQuery = db.from("matches").select("id").eq("team_id", ctx.teamId).eq("status", "COMPLETED");
  if (seasonId) {
    const { data: season } = await db.from("seasons").select("start_date, end_date").eq("id", seasonId).single();
    if (season) {
      matchQuery = matchQuery.gte("match_date", season.start_date).lte("match_date", season.end_date);
    }
  }
  const { data: matches } = await matchQuery;
  const matchIds = matches?.map((m: any) => m.id) ?? [];

  if (matchIds.length === 0) {
    return apiSuccess({
      records: members.map((m: any) => {
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
  const stats = members.map((m: any) => {
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
