import { NextRequest, NextResponse } from "next/server";
import {
  getApiContext,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const matchId = request.nextUrl.searchParams.get("matchId");
  if (!matchId) return apiError("matchId required");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { data: matchCheck } = await db
    .from("matches")
    .select("id")
    .eq("id", matchId)
    .eq("team_id", ctx.teamId)
    .single();
  if (!matchCheck) return apiError("Match not found", 404);

  const side = request.nextUrl.searchParams.get("side");

  let query = db
    .from("match_squads")
    .select("*")
    .eq("match_id", matchId);

  if (side) {
    query = query.eq("side", side);
  } else {
    query = query.is("side", null);
  }

  const { data, error } = await query.order("quarter_number");

  if (error) return apiError(error.message);
  return apiSuccess({ squads: data });
}

export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.SQUAD_EDIT);
  if (roleCheck) return roleCheck;

  const body = await request.json();
  if (!body.matchId) return apiError("matchId required");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { data: matchCheck } = await db
    .from("matches")
    .select("id")
    .eq("id", body.matchId)
    .eq("team_id", ctx.teamId)
    .single();
  if (!matchCheck) return apiError("Match not found", 404);

  const side = body.side ?? null;

  // partial unique index 사용으로 upsert 대신 delete+insert
  let deleteQuery = db
    .from("match_squads")
    .delete()
    .eq("match_id", body.matchId)
    .eq("quarter_number", body.quarterNumber);

  if (side) {
    deleteQuery = deleteQuery.eq("side", side);
  } else {
    deleteQuery = deleteQuery.is("side", null);
  }
  await deleteQuery;

  const { data, error } = await db
    .from("match_squads")
    .insert({
      match_id: body.matchId,
      quarter_number: body.quarterNumber,
      formation: body.formation,
      positions: body.positions,
      side,
    })
    .select()
    .single();

  if (error) return apiError(error.message);
  return apiSuccess(data);
}
