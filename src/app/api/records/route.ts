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

  // Get team members
  const { data: members } = await db
    .from("team_members")
    .select("user_id, users(id, name, preferred_positions)")
    .eq("team_id", ctx.teamId)
    .eq("status", "ACTIVE");

  if (!members) return apiSuccess({ records: [] });

  // Get matches for the season
  let matchQuery = db.from("matches").select("id").eq("team_id", ctx.teamId);
  if (seasonId) matchQuery = matchQuery.eq("season_id", seasonId);
  const { data: matches } = await matchQuery;
  const matchIds = matches?.map((m: any) => m.id) ?? [];

  if (matchIds.length === 0) {
    return apiSuccess({
      records: members.map((m: any) => {
        const user = Array.isArray(m.users) ? m.users[0] : m.users;
        return {
          memberId: m.user_id,
          name: user?.name ?? "",
          goals: 0,
          assists: 0,
          mvp: 0,
          attendanceRate: 0,
          preferredPositions: user?.preferred_positions ?? [],
        };
      }),
    });
  }

  // Get goals, assists, mvp for each member
  const stats = await Promise.all(
    members.map(async (m: any) => {
      const userId = m.user_id;
      const user = Array.isArray(m.users) ? m.users[0] : m.users;

      const { count: goals } = await db
        .from("match_goals")
        .select("*", { count: "exact", head: true })
        .in("match_id", matchIds)
        .eq("scorer_id", userId)
        .eq("is_own_goal", false);

      const { count: assists } = await db
        .from("match_goals")
        .select("*", { count: "exact", head: true })
        .in("match_id", matchIds)
        .eq("assist_id", userId);

      const { count: mvp } = await db
        .from("match_mvp_votes")
        .select("*", { count: "exact", head: true })
        .in("match_id", matchIds)
        .eq("candidate_id", userId);

      const { count: attended } = await db
        .from("match_attendance")
        .select("*", { count: "exact", head: true })
        .in("match_id", matchIds)
        .eq("user_id", userId)
        .eq("vote", "ATTEND");

      return {
        memberId: userId,
        name: user?.name ?? "",
        goals: goals ?? 0,
        assists: assists ?? 0,
        mvp: mvp ?? 0,
        attendanceRate: matchIds.length > 0 ? (attended ?? 0) / matchIds.length : 0,
        preferredPositions: user?.preferred_positions ?? [],
      };
    })
  );

  return apiSuccess({ records: stats });
}
