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
  if (!db) return apiError("Database not available", 503);

  const isStaff = hasMinRole(ctx.teamRole, "STAFF");

  // Staff+ see all info, members see limited info
  const select = isStaff
    ? "id, user_id, role, status, joined_at, pre_name, pre_phone, users(id, name, birth_date, phone, preferred_positions, preferred_foot, profile_image_url)"
    : "id, user_id, role, status, joined_at, pre_name, pre_phone, users(id, name, preferred_positions)";

  const { data, error } = await db
    .from("team_members")
    .select(select)
    .eq("team_id", ctx.teamId)
    .eq("status", "ACTIVE");

  if (error) return apiError(error.message);
  return apiSuccess({ members: data, isStaff });
}

export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.MEMBER_ROLE_CHANGE);
  if (roleCheck) return roleCheck;

  const body = await request.json();

  // 사전 등록 (user_id 없이)
  if (body.action === "pre_register") {
    const name = String(body.name || "").trim();
    if (!name) return apiError("이름은 필수입니다");
    const phone = String(body.phone || "").replace(/\D/g, "") || null;

    const db = getSupabaseAdmin();
    if (!db) return apiError("Database not available", 503);

    const { data, error } = await db
      .from("team_members")
      .insert({
        team_id: ctx.teamId,
        user_id: null,
        role: "MEMBER",
        status: "ACTIVE",
        pre_name: name,
        pre_phone: phone,
      })
      .select()
      .single();

    if (error) return apiError(error.message);
    return apiSuccess(data, 201);
  }

  // 수동 연동 (미연동 멤버에 실제 user_id 연결)
  if (body.action === "link") {
    const memberId = String(body.memberId || "");
    const userId = String(body.userId || "");
    if (!memberId || !userId) return apiError("memberId and userId required");

    const db = getSupabaseAdmin();
    if (!db) return apiError("Database not available", 503);

    // 해당 유저가 이미 이 팀에 별도 row로 가입되어 있으면 그 row 삭제
    await db
      .from("team_members")
      .delete()
      .eq("team_id", ctx.teamId)
      .eq("user_id", userId)
      .neq("id", memberId);

    const { error } = await db
      .from("team_members")
      .update({ user_id: userId, pre_name: null, pre_phone: null })
      .eq("id", memberId)
      .eq("team_id", ctx.teamId);

    if (error) return apiError(error.message);
    return apiSuccess({ ok: true });
  }

  return apiError("Unknown action", 400);
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
  if (!db) return apiError("Database not available", 503);

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
  if (!db) return apiError("Database not available", 503);

  const { error } = await db
    .from("team_members")
    .update({ status: "BANNED" })
    .eq("id", memberId)
    .eq("team_id", ctx.teamId);

  if (error) return apiError(error.message);
  return apiSuccess({ ok: true });
}
