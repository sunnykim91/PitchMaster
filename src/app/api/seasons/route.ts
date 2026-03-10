import { NextRequest, NextResponse } from "next/server";
import {
  getApiContext,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET() {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const db = getSupabaseAdmin();
  if (!db) return apiSuccess({ seasons: [], demo: true });

  const { data, error } = await db
    .from("seasons")
    .select("*")
    .eq("team_id", ctx.teamId)
    .order("start_date", { ascending: false });

  if (error) return apiError(error.message);
  return apiSuccess({ seasons: data });
}

export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.SEASON_CREATE);
  if (roleCheck) return roleCheck;

  const body = await request.json();
  const db = getSupabaseAdmin();
  if (!db) return apiSuccess({ id: "demo", demo: true }, 201);

  // If marking as active, deactivate others first
  if (body.isActive) {
    await db
      .from("seasons")
      .update({ is_active: false })
      .eq("team_id", ctx.teamId);
  }

  const { data, error } = await db
    .from("seasons")
    .insert({
      team_id: ctx.teamId,
      name: body.name,
      start_date: body.startDate,
      end_date: body.endDate,
      is_active: body.isActive ?? false,
    })
    .select()
    .single();

  if (error) return apiError(error.message);
  return apiSuccess(data, 201);
}

export async function PUT(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.SEASON_ACTIVATE);
  if (roleCheck) return roleCheck;

  const body = await request.json();
  if (!body.id) return apiError("id required");

  const db = getSupabaseAdmin();
  if (!db) return apiSuccess({ ok: true, demo: true });

  // Deactivate all, then activate the selected one
  await db
    .from("seasons")
    .update({ is_active: false })
    .eq("team_id", ctx.teamId);
  const { error } = await db
    .from("seasons")
    .update({ is_active: true })
    .eq("id", body.id);

  if (error) return apiError(error.message);
  return apiSuccess({ ok: true });
}
