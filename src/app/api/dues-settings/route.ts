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
  if (!db) return apiError("Database not available", 503);

  const { data, error } = await db
    .from("dues_settings")
    .select("*")
    .eq("team_id", ctx.teamId);

  if (error) return apiError(error.message);
  return apiSuccess({ settings: data });
}

export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.DUES_SETTING_EDIT);
  if (roleCheck) return roleCheck;

  const body = await request.json();
  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { data, error } = await db
    .from("dues_settings")
    .insert({
      team_id: ctx.teamId,
      member_type: body.memberType,
      monthly_amount: body.monthlyAmount,
      description: body.description || null,
    })
    .select()
    .single();

  if (error) return apiError(error.message);
  return apiSuccess(data, 201);
}

export async function PUT(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.DUES_SETTING_EDIT);
  if (roleCheck) return roleCheck;

  const body = await request.json();
  if (!body.id) return apiError("id required");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const updates: Record<string, unknown> = {};
  if (body.memberType !== undefined) updates.member_type = body.memberType;
  if (body.monthlyAmount !== undefined) updates.monthly_amount = body.monthlyAmount;
  if (body.description !== undefined) updates.description = body.description || null;

  const { data, error } = await db
    .from("dues_settings")
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

  const roleCheck = requireRole(ctx, PERMISSIONS.DUES_SETTING_EDIT);
  if (roleCheck) return roleCheck;

  const body = await request.json();
  if (!body.id) return apiError("id required");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { error } = await db
    .from("dues_settings")
    .delete()
    .eq("id", body.id)
    .eq("team_id", ctx.teamId);

  if (error) return apiError(error.message);
  return apiSuccess({ ok: true });
}
