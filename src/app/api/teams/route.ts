import { NextRequest, NextResponse } from "next/server";
import {
  getApiContext,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PERMISSIONS } from "@/lib/permissions";

export async function PUT(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.TEAM_SETTINGS);
  if (roleCheck) return roleCheck;

  const body = await request.json();
  const db = getSupabaseAdmin();
  if (!db) return apiSuccess({ ok: true, demo: true });

  const updates: Record<string, unknown> = {};
  if (body.name) updates.name = body.name;
  if (body.logoUrl !== undefined) updates.logo_url = body.logoUrl;
  if (body.inviteExpiresAt !== undefined)
    updates.invite_expires_at = body.inviteExpiresAt;
  if (body.joinMode) updates.join_mode = body.joinMode;

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
  if (!db) return apiSuccess({ ok: true, demo: true });

  const { error } = await db.from("teams").delete().eq("id", ctx.teamId);
  if (error) return apiError(error.message);
  return apiSuccess({ ok: true });
}
