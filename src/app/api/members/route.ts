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
    ? "id, user_id, role, status, joined_at, pre_name, pre_phone, dues_type, coach_positions, users(id, name, birth_date, phone, preferred_positions, preferred_foot, profile_image_url)"
    : "id, user_id, role, status, joined_at, pre_name, pre_phone, dues_type, coach_positions, users(id, name, preferred_positions)";

  // ACTIVE + DORMANT 멤버 모두 조회
  const { data, error } = await db
    .from("team_members")
    .select(select)
    .eq("team_id", ctx.teamId)
    .in("status", ["ACTIVE", "DORMANT"]);

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

  // 감독 지정 포지션 변경
  if (body.action === "update_coach_positions") {
    const { memberId, coachPositions } = body;
    if (!memberId) return apiError("memberId required");

    const db = getSupabaseAdmin();
    if (!db) return apiError("Database not available", 503);

    const { error } = await db
      .from("team_members")
      .update({ coach_positions: coachPositions ?? null })
      .eq("id", memberId)
      .eq("team_id", ctx.teamId);

    if (error) return apiError(error.message);
    return apiSuccess({ ok: true });
  }

  // 회원 상태 변경 (ACTIVE ↔ DORMANT)
  if (body.action === "update_status") {
    const { memberId, status } = body;
    if (!memberId || !status) return apiError("memberId and status required");
    if (!["ACTIVE", "DORMANT"].includes(status)) return apiError("status must be ACTIVE or DORMANT");

    const db = getSupabaseAdmin();
    if (!db) return apiError("Database not available", 503);

    const { error } = await db
      .from("team_members")
      .update({ status })
      .eq("id", memberId)
      .eq("team_id", ctx.teamId);

    if (error) return apiError(error.message);
    return apiSuccess({ ok: true });
  }

  // 회비 유형 변경
  if (body.action === "update_dues_type") {
    const { memberId, duesType } = body;
    if (!memberId) return apiError("memberId required");

    const db = getSupabaseAdmin();
    if (!db) return apiError("Database not available", 503);

    const { error } = await db
      .from("team_members")
      .update({ dues_type: duesType || null })
      .eq("id", memberId)
      .eq("team_id", ctx.teamId);

    if (error) return apiError(error.message);
    return apiSuccess({ ok: true });
  }

  // 일괄 회비 유형 변경
  if (body.action === "bulk_update_dues_type") {
    const { updates } = body as { updates: { memberId: string; duesType: string | null }[] };
    if (!updates?.length) return apiError("updates required");

    const db = getSupabaseAdmin();
    if (!db) return apiError("Database not available", 503);

    const results = await Promise.all(
      updates.map((u) =>
        db.from("team_members")
          .update({ dues_type: u.duesType || null })
          .eq("id", u.memberId)
          .eq("team_id", ctx.teamId)
      )
    );
    const count = results.filter((r) => !r.error).length;
    return apiSuccess({ updated: count });
  }

  // 기존 역할 변경
  if (!body.memberId || !body.role)
    return apiError("memberId and role required");

  const validRoles = ["PRESIDENT", "STAFF", "MEMBER"];
  if (!validRoles.includes(body.role))
    return apiError("유효하지 않은 역할입니다");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // 자기 자신 역할 변경 차단 (회장이 스스로 강등하면 복구 불가)
  const { data: targetMember } = await db
    .from("team_members")
    .select("user_id")
    .eq("id", body.memberId)
    .eq("team_id", ctx.teamId)
    .single();

  if (targetMember?.user_id === ctx.userId) {
    return apiError("자신의 역할은 변경할 수 없습니다");
  }

  // 회장 이임: 다른 회원을 PRESIDENT로 변경 시 기존 회장을 STAFF로 강등
  if (body.role === "PRESIDENT") {
    const { error: demoteError } = await db
      .from("team_members")
      .update({ role: "STAFF" })
      .eq("team_id", ctx.teamId)
      .eq("user_id", ctx.userId);

    if (demoteError) return apiError(demoteError.message);
  }

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
