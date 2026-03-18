import { NextRequest, NextResponse } from "next/server";
import { getApiContext, requireRole, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET() {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { data, error } = await db
    .from("matches")
    .select("*")
    .eq("team_id", ctx.teamId)
    .order("match_date", { ascending: false });

  if (error) return apiError(error.message);
  return apiSuccess({ matches: data });
}

export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.MATCH_CREATE);
  if (roleCheck) return roleCheck;

  const body = await request.json();
  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { data, error } = await db
    .from("matches")
    .insert({
      team_id: ctx.teamId,
      season_id: body.seasonId || null,
      opponent_name: body.opponent || null,
      match_date: body.date,
      match_time: body.time || null,
      location: body.location || null,
      quarter_count: body.quarterCount ?? 4,
      quarter_duration: body.quarterDuration ?? 25,
      break_duration: body.breakDuration ?? 5,
      player_count: body.playerCount ?? 11,
      status: "SCHEDULED",
      vote_deadline: body.voteDeadline || null,
      created_by: ctx.userId,
    })
    .select()
    .single();

  if (error) return apiError(error.message);
  return apiSuccess(data, 201);
}
