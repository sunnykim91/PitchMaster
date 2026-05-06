import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess, demoGuard } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isStaffOrAbove } from "@/lib/permissions";
import { validateSafeName } from "@/lib/validators/safeText";
import type { TeamTacticalAnimation, UpdateAnimationPayload } from "@/lib/formationMotions/dbTypes";

/**
 * GET — 단일 애니메이션 조회 (현재 팀 소속만)
 * PUT — 수정 (운영진만)
 * DELETE — 삭제 (운영진만)
 */

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;
  const sb = getSupabaseAdmin();
  if (!sb) return apiError("DB unavailable", 503);

  const { data, error } = await sb
    .from("team_tactical_animations")
    .select("id, team_id, formation_id, name, description, animation_data, is_default, created_by, created_at, updated_at")
    .eq("id", id)
    .eq("team_id", ctx.teamId)
    .maybeSingle();

  if (error) return apiError(error.message, 500);
  if (!data) return apiError("not found", 404);

  return apiSuccess({ animation: data as TeamTacticalAnimation });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const guard = demoGuard(ctx);
  if (guard) return guard;

  if (!isStaffOrAbove(ctx.teamRole)) {
    return apiError("운영진만 수정할 수 있습니다", 403);
  }

  const { id } = await params;
  let body: UpdateAnimationPayload;
  try {
    body = await request.json();
  } catch {
    return apiError("invalid JSON body");
  }

  const sb = getSupabaseAdmin();
  if (!sb) return apiError("DB unavailable", 503);

  // 같은 팀 소속 검증
  const { data: existing } = await sb
    .from("team_tactical_animations")
    .select("id, team_id, formation_id")
    .eq("id", id)
    .eq("team_id", ctx.teamId)
    .maybeSingle();
  if (!existing) return apiError("not found", 404);

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.name !== undefined) {
    const nameCheck = validateSafeName(body.name, { fieldLabel: "이름", maxLength: 60, requireMeaningful: true });
    if (!nameCheck.ok) return apiError(nameCheck.reason, 400);
    update.name = nameCheck.value;
  }
  if (body.description !== undefined) update.description = body.description;
  if (body.animation_data !== undefined) {
    if (
      !body.animation_data ||
      !Array.isArray(body.animation_data.attack) ||
      !Array.isArray(body.animation_data.defense)
    ) {
      return apiError("animation_data.attack/defense must be arrays");
    }
    update.animation_data = body.animation_data;
  }
  if (body.is_default !== undefined) {
    update.is_default = !!body.is_default;
    // default ON 으로 바꾸면 같은 (team_id, formation_id) 다른 default 들 OFF
    if (body.is_default === true) {
      await sb
        .from("team_tactical_animations")
        .update({ is_default: false })
        .eq("team_id", ctx.teamId)
        .eq("formation_id", existing.formation_id)
        .eq("is_default", true)
        .neq("id", id);
    }
  }

  const { data, error } = await sb
    .from("team_tactical_animations")
    .update(update)
    .eq("id", id)
    .eq("team_id", ctx.teamId)
    .select()
    .single();

  if (error) return apiError(error.message, 500);
  return apiSuccess({ animation: data as TeamTacticalAnimation });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const guard = demoGuard(ctx);
  if (guard) return guard;

  if (!isStaffOrAbove(ctx.teamRole)) {
    return apiError("운영진만 삭제할 수 있습니다", 403);
  }

  const { id } = await params;
  const sb = getSupabaseAdmin();
  if (!sb) return apiError("DB unavailable", 503);

  const { error } = await sb
    .from("team_tactical_animations")
    .delete()
    .eq("id", id)
    .eq("team_id", ctx.teamId);

  if (error) return apiError(error.message, 500);
  return apiSuccess({ deleted: true });
}
