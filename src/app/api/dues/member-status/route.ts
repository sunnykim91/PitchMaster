import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess, requireRole } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PERMISSIONS } from "@/lib/permissions";

/** GET: 활성 면제/휴회/부상 목록 조회 */
export async function GET() {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { data, error } = await db
    .from("member_dues_exemptions")
    .select("*")
    .eq("team_id", ctx.teamId)
    .order("created_at", { ascending: false });

  if (error) return apiError(error.message);
  return apiSuccess({ exemptions: data ?? [] });
}

/** POST: 면제/휴회/부상 등록 */
export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.MATCH_CREATE);
  if (roleCheck) return roleCheck;

  const body = await request.json();
  const { memberId, exemptionType, reason, startDate, endDate } = body;

  if (!memberId || !exemptionType || !startDate) {
    return apiError("memberId, exemptionType, startDate are required", 400);
  }

  if (!["EXEMPT", "LEAVE", "INJURED"].includes(exemptionType)) {
    return apiError("exemptionType must be EXEMPT, LEAVE, or INJURED", 400);
  }

  if (endDate && startDate && endDate < startDate) {
    return apiError("종료일은 시작일 이후여야 합니다.", 400);
  }

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { data, error } = await db
    .from("member_dues_exemptions")
    .insert({
      team_id: ctx.teamId,
      member_id: memberId,
      exemption_type: exemptionType,
      reason: reason || null,
      start_date: startDate,
      end_date: endDate || null,
      created_by: ctx.userId,
    })
    .select()
    .single();

  if (error) return apiError(error.message);
  return apiSuccess(data, 201);
}

/** PUT: 면제 종료 (is_active = false) */
export async function PUT(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.MATCH_CREATE);
  if (roleCheck) return roleCheck;

  const body = await request.json();
  const { id } = body;
  if (!id) return apiError("id required", 400);

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { error } = await db
    .from("member_dues_exemptions")
    .update({
      is_active: false,
      ended_at: new Date().toISOString(),
      ended_by: ctx.userId,
    })
    .eq("id", id)
    .eq("team_id", ctx.teamId);

  if (error) return apiError(error.message);
  return apiSuccess({ ended: true });
}
