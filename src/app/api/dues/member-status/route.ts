import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess, requireRole } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PERMISSIONS } from "@/lib/permissions";
import { findPrepaymentMatch, listPrepaymentCandidates } from "@/lib/server/findPrepaymentMatch";

/**
 * GET: 활성 면제/휴회/부상 목록 조회
 * GET ?candidates=<exemptionId> : 수동 매칭 모달용 후보 거래 목록
 */
export async function GET(request: NextRequest) {
  // 수동 매칭 후보 조회 분기
  if (request.nextUrl.searchParams.get("candidates")) {
    return getCandidates(request);
  }

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

/** POST: 면제/선납/휴회/부상 등록 */
export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.MATCH_CREATE);
  if (roleCheck) return roleCheck;

  const body = await request.json();
  const {
    memberId,
    exemptionType,
    reason,
    startDate,
    endDate,
    monthlyAmount,
    periodMonths,
    actualPaidAmount,
  } = body;

  if (!memberId || !exemptionType || !startDate) {
    return apiError("memberId, exemptionType, startDate are required", 400);
  }

  if (!["EXEMPT", "PREPAID", "LEAVE", "INJURED"].includes(exemptionType)) {
    return apiError("exemptionType must be EXEMPT, PREPAID, LEAVE, or INJURED", 400);
  }

  if (endDate && startDate && endDate < startDate) {
    return apiError("종료일은 시작일 이후여야 합니다.", 400);
  }

  // PREPAID 전용 검증
  let prepaidFields: { monthly_amount?: number; period_months?: number; actual_paid_amount?: number } = {};
  if (exemptionType === "PREPAID") {
    if (!endDate) return apiError("선납은 종료일이 필요합니다.", 400);
    if (typeof monthlyAmount !== "number" || monthlyAmount <= 0) {
      return apiError("선납 월 회비는 0보다 커야 합니다.", 400);
    }
    if (typeof periodMonths !== "number" || periodMonths <= 0) {
      return apiError("선납 기간은 1개월 이상이어야 합니다.", 400);
    }
    if (typeof actualPaidAmount !== "number" || actualPaidAmount <= 0) {
      return apiError("받은 금액은 0보다 커야 합니다.", 400);
    }
    prepaidFields = {
      monthly_amount: monthlyAmount,
      period_months: periodMonths,
      actual_paid_amount: actualPaidAmount,
    };
  }

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // PREPAID 자동 매칭 — 회비 기록(dues_records)에서 일치하는 입금 거래 1건 찾기
  let linkedDuesRecordId: string | null = null;
  if (exemptionType === "PREPAID") {
    // memberId(team_members.id) → user_id + name lookup
    const { data: tm } = await db
      .from("team_members")
      .select("user_id, users(name)")
      .eq("id", memberId)
      .single();
    const targetUserId = (tm?.user_id as string | null) ?? null;
    const targetName = (tm?.users as { name?: string } | null)?.name ?? "";

    const match = await findPrepaymentMatch({
      teamId: ctx.teamId,
      userId: targetUserId,
      memberName: targetName,
      amount: actualPaidAmount,
      startMonth: startDate,
    });
    if (match.matched) linkedDuesRecordId = match.recordId;
  }

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
      linked_dues_record_id: linkedDuesRecordId,
      ...prepaidFields,
    })
    .select()
    .single();

  if (error) return apiError(error.message);
  return apiSuccess({ ...data, autoMatched: linkedDuesRecordId !== null }, 201);
}

/** PATCH: 선납 ↔ 입금 거래 수동 매칭/해제 */
export async function PATCH(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.MATCH_CREATE);
  if (roleCheck) return roleCheck;

  const body = await request.json();
  const { id, linkedDuesRecordId } = body as { id?: string; linkedDuesRecordId?: string | null };
  if (!id) return apiError("id required", 400);

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // 대상 선납 조회 + PREPAID 확인
  const { data: target, error: fetchErr } = await db
    .from("member_dues_exemptions")
    .select("id, team_id, exemption_type")
    .eq("id", id)
    .eq("team_id", ctx.teamId)
    .single();
  if (fetchErr || !target) return apiError("선납을 찾을 수 없습니다", 404);
  if (target.exemption_type !== "PREPAID") {
    return apiError("선납(PREPAID)에만 입금 연결이 가능합니다", 400);
  }

  // linkedDuesRecordId === null → 연결 해제
  if (linkedDuesRecordId == null) {
    const { error } = await db
      .from("member_dues_exemptions")
      .update({ linked_dues_record_id: null })
      .eq("id", id)
      .eq("team_id", ctx.teamId);
    if (error) return apiError(error.message);
    return apiSuccess({ unlinked: true });
  }

  // 연결 시도 — 입금 거래가 같은 팀 + INCOME 인지 확인
  const { data: rec } = await db
    .from("dues_records")
    .select("id, type, team_id")
    .eq("id", linkedDuesRecordId)
    .eq("team_id", ctx.teamId)
    .single();
  if (!rec) return apiError("입금 거래를 찾을 수 없습니다", 404);
  if (rec.type !== "INCOME") return apiError("INCOME 거래만 연결할 수 있습니다", 400);

  // 다른 선납에 이미 연결된 거래는 거부 (중복 방지)
  const { data: existing } = await db
    .from("member_dues_exemptions")
    .select("id")
    .eq("linked_dues_record_id", linkedDuesRecordId)
    .neq("id", id)
    .maybeSingle();
  if (existing) return apiError("이 입금은 이미 다른 선납에 연결되어 있습니다", 409);

  const { error } = await db
    .from("member_dues_exemptions")
    .update({ linked_dues_record_id: linkedDuesRecordId })
    .eq("id", id)
    .eq("team_id", ctx.teamId);
  if (error) return apiError(error.message);
  return apiSuccess({ linked: true, recordId: linkedDuesRecordId });
}

/** GET ?candidates=<exemptionId> — 수동 매칭 모달용 후보 거래 목록 */
async function getCandidates(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const exemptionId = request.nextUrl.searchParams.get("candidates");
  if (!exemptionId) return apiError("candidates(exemptionId) 파라미터 필요", 400);

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { data: ex } = await db
    .from("member_dues_exemptions")
    .select("id, team_id, member_id, exemption_type, actual_paid_amount, start_date")
    .eq("id", exemptionId)
    .eq("team_id", ctx.teamId)
    .single();
  if (!ex) return apiError("선납을 찾을 수 없습니다", 404);
  if (ex.exemption_type !== "PREPAID") return apiError("선납만 후보 조회 가능", 400);

  const { data: tm } = await db
    .from("team_members")
    .select("user_id, users(name)")
    .eq("id", ex.member_id)
    .single();
  const targetUserId = (tm?.user_id as string | null) ?? null;
  const targetName = (tm?.users as { name?: string } | null)?.name ?? "";

  const candidates = await listPrepaymentCandidates({
    teamId: ctx.teamId,
    userId: targetUserId,
    memberName: targetName,
    amount: ex.actual_paid_amount ?? 0,
    startMonth: ex.start_date,
  });
  return apiSuccess({ candidates });
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
