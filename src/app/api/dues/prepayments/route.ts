import { NextRequest, NextResponse } from "next/server";
import {
  getApiContext,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PERMISSIONS } from "@/lib/permissions";
import { computeEndMonth } from "@/lib/duesPrepayment";

/**
 * GET /api/dues/prepayments?status=active|all
 *   - 팀의 선납 목록. status 미지정 시 active만.
 */
export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const status = request.nextUrl.searchParams.get("status") ?? "active";

  let query = db
    .from("dues_prepayments")
    .select("*")
    .eq("team_id", ctx.teamId)
    .order("recorded_at", { ascending: false });

  if (status === "active") {
    query = query.eq("status", "active");
  }

  const { data, error } = await query;
  if (error) return apiError(error.message);
  return apiSuccess({ prepayments: data ?? [] });
}

/**
 * POST /api/dues/prepayments
 *   - 선납 등록 + dues_records(INCOME) 자동 생성
 *   body: { memberId, userId?, memberName?, amount, periodMonths, startMonth, notes?, recordTransaction? }
 *     · memberId: team_members.id (필수, 회원 식별)
 *     · userId:   users.id (선택, member에 연동된 유저)
 *     · memberName: 스냅샷 (선택, 회원 삭제 후에도 보존)
 *     · amount:   총 합계 금액 (period_months × 월회비 권장)
 *     · periodMonths: 3 | 6 | 12
 *     · startMonth: "YYYY-MM-01" (기본 다음 달 1일)
 *     · recordTransaction: false → dues_records 자동 생성 안 함 (default: true)
 */
export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.DUES_RECORD_ADD);
  if (roleCheck) return roleCheck;

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const body = await request.json();
  const {
    memberId,
    userId,
    memberName,
    amount,
    periodMonths,
    startMonth,
    notes,
    recordTransaction = true,
  } = body;

  if (!memberId) return apiError("memberId required", 400);
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return apiError("금액은 0보다 큰 숫자여야 합니다");
  }
  if (![3, 6, 12].includes(periodMonths)) {
    return apiError("periodMonths는 3, 6, 12 중 하나여야 합니다");
  }
  if (!startMonth || !/^\d{4}-\d{2}-01$/.test(startMonth)) {
    return apiError("startMonth는 YYYY-MM-01 형식이어야 합니다");
  }

  const endMonth = computeEndMonth(startMonth, periodMonths);

  // 자동 거래 기록 생성 (회비 매칭 위해 먼저 생성하고 ID 받아 prepayment에 연결)
  const resolvedUserId = userId && !String(userId).startsWith("unlinked_") ? userId : null;
  let linkedDuesRecordId: string | null = null;

  if (recordTransaction) {
    const description = `${memberName ?? "회원"} ${periodMonths}개월 선납 (${startMonth.slice(0, 7)} ~ ${endMonth.slice(0, 7)})`;
    const { data: duesRecord, error: duesErr } = await db
      .from("dues_records")
      .insert({
        team_id: ctx.teamId,
        user_id: resolvedUserId,
        type: "INCOME",
        amount,
        description,
        recorded_by: ctx.userId,
        recorded_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (duesErr) return apiError(`거래 기록 생성 실패: ${duesErr.message}`);
    linkedDuesRecordId = duesRecord?.id ?? null;
  }

  const { data: prepayment, error } = await db
    .from("dues_prepayments")
    .insert({
      team_id: ctx.teamId,
      user_id: resolvedUserId,
      member_id: memberId,
      member_name: memberName ?? null,
      amount,
      period_months: periodMonths,
      start_month: startMonth,
      end_month: endMonth,
      status: "active",
      linked_dues_record_id: linkedDuesRecordId,
      notes: notes ?? null,
      recorded_by: ctx.userId,
    })
    .select()
    .single();

  if (error) {
    // 롤백: prepayment insert 실패 시 거래 기록도 삭제
    if (linkedDuesRecordId) {
      await db.from("dues_records").delete().eq("id", linkedDuesRecordId);
    }
    return apiError(error.message);
  }

  return apiSuccess({ prepayment }, 201);
}

/**
 * PATCH /api/dues/prepayments
 *   - 선납 취소 (status='cancelled'). linked dues_record 도 함께 삭제.
 *   body: { id }
 */
export async function PATCH(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.DUES_RECORD_ADD);
  if (roleCheck) return roleCheck;

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const body = await request.json();
  const { id } = body;
  if (!id) return apiError("id required", 400);

  // 1. 기존 선납 조회 (linked_dues_record_id 확보)
  const { data: existing, error: fetchErr } = await db
    .from("dues_prepayments")
    .select("id, team_id, status, linked_dues_record_id")
    .eq("id", id)
    .eq("team_id", ctx.teamId)
    .single();

  if (fetchErr) return apiError(fetchErr.message, 404);
  if (!existing) return apiError("선납을 찾을 수 없습니다", 404);
  if (existing.status === "cancelled") {
    return apiError("이미 취소된 선납입니다");
  }

  // 2. 취소 처리
  const { data: updated, error } = await db
    .from("dues_prepayments")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_by: ctx.userId,
    })
    .eq("id", id)
    .eq("team_id", ctx.teamId)
    .select()
    .single();

  if (error) return apiError(error.message);

  // 3. 자동 생성된 거래 기록 삭제 (있다면)
  if (existing.linked_dues_record_id) {
    await db
      .from("dues_records")
      .delete()
      .eq("id", existing.linked_dues_record_id)
      .eq("team_id", ctx.teamId);
  }

  return apiSuccess({ prepayment: updated });
}
