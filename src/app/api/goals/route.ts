import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isStaffOrAbove } from "@/lib/permissions";
import type { SupabaseClient } from "@supabase/supabase-js";

// 팀 설정에서 stats_recording_staff_only 가 true 면 STAFF 이상만 골 기록 가능
async function checkStatsRecordingPermission(
  db: SupabaseClient,
  teamId: string,
  teamRole: string
): Promise<NextResponse | null> {
  const { data: team } = await db
    .from("teams")
    .select("stats_recording_staff_only")
    .eq("id", teamId)
    .single();
  if (team?.stats_recording_staff_only && !isStaffOrAbove(teamRole as "PRESIDENT" | "STAFF" | "MEMBER")) {
    return apiError("운영진만 경기 기록을 입력할 수 있습니다", 403);
  }
  return null;
}

export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const matchId = request.nextUrl.searchParams.get("matchId");
  if (!matchId) return apiError("matchId required");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // Verify match belongs to team
  const { data: matchCheck } = await db.from("matches").select("id").eq("id", matchId).eq("team_id", ctx.teamId).single();
  if (!matchCheck) return apiError("Match not found", 404);

  const { data, error } = await db
    .from("match_goals")
    .select("id, match_id, quarter_number, minute, scorer_id, assist_id, is_own_goal, goal_type, recorded_by, side")
    .eq("match_id", matchId)
    .order("quarter_number")
    .order("minute");

  if (error) return apiError(error.message);
  return apiSuccess({ goals: data });
}

export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // 팀 설정 기반 권한 체크
  const permErr = await checkStatsRecordingPermission(db, ctx.teamId, ctx.teamRole);
  if (permErr) return permErr;

  // Verify match belongs to team
  const { data: matchCheck } = await db.from("matches").select("id").eq("id", body.matchId).eq("team_id", ctx.teamId).single();
  if (!matchCheck) return apiError("Match not found", 404);

  const goalType = body.goalType ?? "NORMAL";
  const isOwnGoal = goalType === "OWN_GOAL" || (body.isOwnGoal ?? false);

  const { data, error } = await db
    .from("match_goals")
    .insert({
      match_id: body.matchId,
      quarter_number: body.quarter,
      minute: body.minute ?? null,
      scorer_id: body.scorerId,
      assist_id: body.assistId || null,
      is_own_goal: isOwnGoal,
      goal_type: goalType,
      side: body.side ?? null,
      recorded_by: ctx.userId,
    })
    .select()
    .single();

  if (error) return apiError(error.message);
  return apiSuccess(data, 201);
}

export async function PUT(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  if (!body.id) return apiError("id required");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // 팀 설정 기반 권한 체크
  const permErr = await checkStatsRecordingPermission(db, ctx.teamId, ctx.teamRole);
  if (permErr) return permErr;

  // Verify goal belongs to a match that belongs to this team
  const { data: goalCheck } = await db
    .from("match_goals")
    .select("id, matches!inner(team_id)")
    .eq("id", body.id)
    .eq("matches.team_id", ctx.teamId)
    .single();
  if (!goalCheck) return apiError("Match not found", 404);

  const updGoalType = body.goalType ?? "NORMAL";
  const updIsOwnGoal = updGoalType === "OWN_GOAL" || (body.isOwnGoal ?? false);

  const { data, error } = await db
    .from("match_goals")
    .update({
      quarter_number: body.quarter,
      minute: body.minute ?? null,
      scorer_id: body.scorerId,
      assist_id: body.assistId || null,
      is_own_goal: updIsOwnGoal,
      goal_type: updGoalType,
      side: body.side ?? null,
    })
    .eq("id", body.id)
    .select()
    .single();

  if (error) return apiError(error.message);
  return apiSuccess(data);
}

export async function DELETE(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return apiError("id required");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // 팀 설정 기반 권한 체크
  const permErr = await checkStatsRecordingPermission(db, ctx.teamId, ctx.teamRole);
  if (permErr) return permErr;

  // Verify goal belongs to a match that belongs to this team
  const { data: goalCheck } = await db
    .from("match_goals")
    .select("id, matches!inner(team_id)")
    .eq("id", id)
    .eq("matches.team_id", ctx.teamId)
    .single();
  if (!goalCheck) return apiError("Match not found", 404);

  const { error } = await db.from("match_goals").delete().eq("id", id);
  if (error) return apiError(error.message);
  return apiSuccess({ ok: true });
}
