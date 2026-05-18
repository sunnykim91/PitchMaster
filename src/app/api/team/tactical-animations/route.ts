import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess, demoGuard } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isStaffOrAbove } from "@/lib/permissions";
import { validateSafeName } from "@/lib/validators/safeText";
import type { CreateAnimationPayload, TeamTacticalAnimation } from "@/lib/formationMotions/dbTypes";

/**
 * GET — 현재 팀의 전술 애니메이션 목록 조회 (운영진/일반 모두 가능)
 * POST — 신규 애니메이션 생성 (운영진만)
 */

export async function GET() {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const sb = getSupabaseAdmin();
  if (!sb) return apiError("DB unavailable", 503);

  const { data, error } = await sb
    .from("team_tactical_animations")
    .select("id, team_id, formation_id, name, description, animation_data, is_default, created_by, created_at, updated_at")
    .eq("team_id", ctx.teamId)
    .order("formation_id", { ascending: true })
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) return apiError(error.message, 500);

  return apiSuccess({ animations: (data ?? []) as TeamTacticalAnimation[] });
}

export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const guard = demoGuard(ctx);
  if (guard) return guard;

  if (!isStaffOrAbove(ctx.teamRole)) {
    return apiError("운영진만 전술 애니메이션을 만들 수 있습니다", 403);
  }

  let body: CreateAnimationPayload;
  try {
    body = await request.json();
  } catch {
    return apiError("invalid JSON body");
  }

  const { formation_id, name, description, animation_data, is_default } = body;

  if (!formation_id || typeof formation_id !== "string") return apiError("formation_id required");
  if (!name || typeof name !== "string") return apiError("name required");

  const nameCheck = validateSafeName(name, { fieldLabel: "이름", maxLength: 60, requireMeaningful: true });
  if (!nameCheck.ok) return apiError(nameCheck.reason, 400);

  if (!animation_data || typeof animation_data !== "object") return apiError("animation_data required");
  if (!Array.isArray(animation_data.attack) || !Array.isArray(animation_data.defense)) {
    return apiError("animation_data.attack/defense must be arrays");
  }

  const sb = getSupabaseAdmin();
  if (!sb) return apiError("DB unavailable", 503);

  // 강제 OFF 블록 제거 (마이그 00073: unique 제약 DROP — 카테고리·포메이션별 N개 default 허용).
  // 클라이언트가 같은 (team, category, [공/수 시 formation_id]) 그룹에 default 0개일 때만
  // is_default=true 보내므로 서버 추가 OFF 불필요. 기존 강제 OFF는 다른 카테고리의 대표까지
  // 잘못 풀어버리는 회귀 발생.
  const { data, error } = await sb
    .from("team_tactical_animations")
    .insert({
      team_id: ctx.teamId,
      formation_id,
      name: nameCheck.value,
      description: description ?? null,
      animation_data,
      is_default: !!is_default,
      created_by: ctx.userId,
    })
    .select()
    .single();

  if (error) return apiError(error.message, 500);

  return apiSuccess({ animation: data as TeamTacticalAnimation }, 201);
}
