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

  const { data: team, error } = await db
    .from("teams")
    .select("id, name, logo_url, invite_code, invite_expires_at, join_mode, uniform_primary, uniform_secondary, uniform_pattern")
    .eq("id", ctx.teamId)
    .single();

  if (error || !team) return apiError("Team not found", 404);
  return apiSuccess({ team });
}

export async function PUT(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.TEAM_SETTINGS);
  if (roleCheck) return roleCheck;

  const body = await request.json();
  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const updates: Record<string, unknown> = {};
  if (body.name) updates.name = body.name;
  if (body.logoUrl !== undefined) updates.logo_url = body.logoUrl;
  if (body.inviteExpiresAt !== undefined)
    updates.invite_expires_at = body.inviteExpiresAt;
  if (body.joinMode) updates.join_mode = body.joinMode;
  if (body.uniformPrimary !== undefined) updates.uniform_primary = body.uniformPrimary;
  if (body.uniformSecondary !== undefined) updates.uniform_secondary = body.uniformSecondary;
  if (body.uniformPattern !== undefined) updates.uniform_pattern = body.uniformPattern;

  const { error } = await db.from("teams").update(updates).eq("id", ctx.teamId);
  if (error) return apiError(error.message);
  return apiSuccess({ ok: true });
}

export async function DELETE() {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.TEAM_DELETE);
  if (roleCheck) return roleCheck;

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { error } = await db.from("teams").delete().eq("id", ctx.teamId);
  if (error) return apiError(error.message);
  return apiSuccess({ ok: true });
}
