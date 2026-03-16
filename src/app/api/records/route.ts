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

  // Get matches for the season (시즌 없으면 전체)
  let matchQuery = db.from("matches").select("id").eq("team_id", ctx.teamId).eq("status", "COMPLETED");
  if (seasonId) matchQuery = matchQuery.eq("season_id", seasonId);
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

  // Get goals, assists, mvp for each member (연동 + 미연동)
  const stats = await Promise.all(
    members.map(async (m: any) => {
      const userId = m.user_id;
      const memberId = m.id; // team_members.id
      const user = Array.isArray(m.users) ? m.users[0] : m.users;
      const name = user?.name ?? m.pre_name ?? "";

      // scorer_id는 user_id 또는 team_members.id일 수 있음
      const lookupIds = userId ? [userId, memberId] : [memberId];

      const { count: goals } = await db
        .from("match_goals")
        .select("*", { count: "exact", head: true })
        .in("match_id", matchIds)
        .in("scorer_id", lookupIds)
        .eq("is_own_goal", false);

      const { count: assists } = await db
        .from("match_goals")
        .select("*", { count: "exact", head: true })
        .in("match_id", matchIds)
        .in("assist_id", lookupIds);

      const { count: mvp } = await db
        .from("match_mvp_votes")
        .select("*", { count: "exact", head: true })
        .in("match_id", matchIds)
        .in("candidate_id", lookupIds);

      // 참석: user_id 또는 member_id로 조회
      let attended = 0;
      if (userId) {
        const { count } = await db.from("match_attendance").select("*", { count: "exact", head: true })
          .in("match_id", matchIds).eq("user_id", userId).eq("vote", "ATTEND");
        attended = count ?? 0;
      }
      if (attended === 0) {
        const { count } = await db.from("match_attendance").select("*", { count: "exact", head: true })
          .in("match_id", matchIds).eq("member_id", memberId).eq("vote", "ATTEND");
        attended = count ?? 0;
      }

      return {
        memberId: userId ?? memberId,
        name,
        goals: goals ?? 0,
        assists: assists ?? 0,
        mvp: mvp ?? 0,
        attendanceRate: matchIds.length > 0 ? attended / matchIds.length : 0,
        preferredPositions: user?.preferred_positions ?? [],
      };
    })
  );

  return apiSuccess({ records: stats });
}
