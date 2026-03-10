import { NextRequest, NextResponse } from "next/server";
import {
  getApiContext,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PERMISSIONS, hasMinRole } from "@/lib/permissions";

export async function GET() {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const db = getSupabaseAdmin();
  if (!db) return apiSuccess({ members: [], demo: true });

  const isStaff = hasMinRole(ctx.teamRole, "STAFF");

  // Staff+ see all info, members see limited info
  const select = isStaff
    ? "id, role, status, joined_at, users(id, name, birth_date, phone, preferred_positions, preferred_foot, profile_image_url)"
    : "id, role, status, joined_at, users(id, name, preferred_positions)";

  const { data, error } = await db
    .from("team_members")
    .select(select)
    .eq("team_id", ctx.teamId)
    .eq("status", "ACTIVE");

  if (error) return apiError(error.message);
  return apiSuccess({ members: data, isStaff });
}

export async function PUT(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.MEMBER_ROLE_CHANGE);
  if (roleCheck) return roleCheck;

  const body = await request.json();
  if (!body.memberId || !body.role)
    return apiError("memberId and role required");

  const db = getSupabaseAdmin();
  if (!db) return apiSuccess({ ok: true, demo: true });

  const { error } = await db
    .from("team_members")
    .update({ role: body.role })
    .eq("id", body.memberId)
    .eq("team_id", ctx.teamId);

  if (error) return apiError(error.message);
  return apiSuccess({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.MEMBER_KICK);
  if (roleCheck) return roleCheck;

  const memberId = request.nextUrl.searchParams.get("memberId");
  if (!memberId) return apiError("memberId required");

  const db = getSupabaseAdmin();
  if (!db) return apiSuccess({ ok: true, demo: true });

  const { error } = await db
    .from("team_members")
    .update({ status: "BANNED" })
    .eq("id", memberId)
    .eq("team_id", ctx.teamId);

  if (error) return apiError(error.message);
  return apiSuccess({ ok: true });
}
