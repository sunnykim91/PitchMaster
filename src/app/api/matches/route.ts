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

  // 완료된 경기의 스코어 계산
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const completedIds = (data ?? []).filter((m: any) => m.status === "COMPLETED").map((m: any) => m.id);
  let scoreMap: Record<string, { our: number; opp: number }> = {};
  if (completedIds.length > 0) {
    const { data: goals } = await db.from("match_goals").select("match_id, scorer_id, is_own_goal").in("match_id", completedIds);
    const map: Record<string, { our: number; opp: number }> = {};
    for (const g of goals ?? []) {
      if (!map[g.match_id]) map[g.match_id] = { our: 0, opp: 0 };
      if (g.scorer_id === "OPPONENT" || g.is_own_goal) map[g.match_id].opp++;
      else map[g.match_id].our++;
    }
    scoreMap = map;
  }

  const matches = (data ?? []).map((m: any) => ({
    ...m,
    score: scoreMap[m.id] ? `${scoreMap[m.id].our} : ${scoreMap[m.id].opp}` : null,
  }));

  return apiSuccess({ matches });
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

export async function PUT(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.MATCH_EDIT);
  if (roleCheck) return roleCheck;

  const body = await request.json();
  if (!body.id) return apiError("id required");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const updates: Record<string, unknown> = {};
  if (body.date !== undefined) updates.match_date = body.date;
  if (body.time !== undefined) updates.match_time = body.time || null;
  if (body.location !== undefined) updates.location = body.location || null;
  if (body.opponent !== undefined) updates.opponent_name = body.opponent || null;
  if (body.quarterCount !== undefined) updates.quarter_count = body.quarterCount;
  if (body.quarterDuration !== undefined) updates.quarter_duration = body.quarterDuration;
  if (body.breakDuration !== undefined) updates.break_duration = body.breakDuration;
  if (body.playerCount !== undefined) updates.player_count = body.playerCount;
  if (body.status !== undefined) updates.status = body.status;
  if (body.voteDeadline !== undefined) updates.vote_deadline = body.voteDeadline || null;

  const { data, error } = await db
    .from("matches")
    .update(updates)
    .eq("id", body.id)
    .eq("team_id", ctx.teamId)
    .select()
    .single();

  if (error) return apiError(error.message);
  return apiSuccess(data);
}

export async function DELETE(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.MATCH_DELETE);
  if (roleCheck) return roleCheck;

  const body = await request.json();
  if (!body.id) return apiError("id required");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // Cascade delete related data before deleting the match
  const tables = ["match_goals", "match_mvp_votes", "match_attendance", "match_squad", "match_diary"];
  for (const table of tables) {
    const { error } = await db.from(table).delete().eq("match_id", body.id);
    if (error) return apiError(`Failed to delete ${table}: ${error.message}`);
  }

  const { error } = await db
    .from("matches")
    .delete()
    .eq("id", body.id)
    .eq("team_id", ctx.teamId);

  if (error) return apiError(error.message);
  return apiSuccess({ ok: true });
}
