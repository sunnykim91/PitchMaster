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

  const { data, error } = await db
    .from("match_squads")
    .select("*")
    .eq("match_id", matchId)
    .order("quarter_number");

  if (error) return apiError(error.message);
  return apiSuccess({ squads: data });
}

export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.SQUAD_EDIT);
  if (roleCheck) return roleCheck;

  const body = await request.json();
  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { data, error } = await db
    .from("match_squads")
    .upsert(
      {
        match_id: body.matchId,
        quarter_number: body.quarterNumber,
        formation: body.formation,
        positions: body.positions,
      },
      { onConflict: "match_id,quarter_number" }
    )
    .select()
    .single();

  if (error) return apiError(error.message);
  return apiSuccess(data);
}
