import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const matchId = request.nextUrl.searchParams.get("matchId");
  if (!matchId) return apiError("matchId required");

  const db = getSupabaseAdmin();
  if (!db) return apiSuccess({ goals: [], demo: true });

  const { data, error } = await db
    .from("match_goals")
    .select("*")
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
  if (!db) return apiSuccess({ id: "demo", demo: true }, 201);

  const { data, error } = await db
    .from("match_goals")
    .insert({
      match_id: body.matchId,
      quarter_number: body.quarter,
      minute: body.minute ?? null,
      scorer_id: body.scorerId,
      assist_id: body.assistId || null,
      is_own_goal: body.isOwnGoal ?? false,
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
  if (!db) return apiSuccess({ ok: true, demo: true });

  const { data, error } = await db
    .from("match_goals")
    .update({
      quarter_number: body.quarter,
      minute: body.minute ?? null,
      scorer_id: body.scorerId,
      assist_id: body.assistId || null,
      is_own_goal: body.isOwnGoal ?? false,
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
  if (!db) return apiSuccess({ ok: true, demo: true });

  const { error } = await db.from("match_goals").delete().eq("id", id);
  if (error) return apiError(error.message);
  return apiSuccess({ ok: true });
}
