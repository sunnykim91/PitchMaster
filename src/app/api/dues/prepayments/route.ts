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
 * 선납 = 운영진이 "회원 N개월치 회비 선납 받았다"는 사실 기록 + 그 N개월을 PAID로 일괄 표시.
 *
 * 의도적 단순화 (2026-04-30):
 *   - dues_records(INCOME) 자동 생성 X — 입출금 거래는 운영진이 별도로 등록
 *   - dues_prepayments는 audit/추적용 (활성 선납 목록 표시·취소용)
 *   - 핵심 효과는 dues_payment_status에 N개월치 PAID 일괄 기록으로 발생
 */

/** YYYY-MM-01 형식의 시작월에서 N개월간의 month 문자열(YYYY-MM) 배열 생성 */
function generateMonths(startMonth: string, periodMonths: number): string[] {
  const [yStr, mStr] = startMonth.slice(0, 7).split("-");
  const y0 = parseInt(yStr, 10);
  const m0 = parseInt(mStr, 10);
  const months: string[] = [];
  for (let i = 0; i < periodMonths; i++) {
    const total = (m0 - 1) + i;
    const yy = y0 + Math.floor(total / 12);
    const mm = (total % 12) + 1;
    months.push(`${yy}-${String(mm).padStart(2, "0")}`);
  }
  return months;
}

/** GET /api/dues/prepayments?status=active|all */
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
 *   1) dues_prepayments insert (audit/추적용)
 *   2) N개월치 dues_payment_status를 PAID로 일괄 upsert (note에 "N개월 선납" 표기)
 *      - 기존 EXEMPT 상태인 월은 건드리지 않음 (면제 우선 정책)
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
  const resolvedUserId = userId && !String(userId).startsWith("unlinked_") ? userId : null;
  const resolvedMemberId = String(memberId).startsWith("unlinked_")
    ? String(memberId).replace("unlinked_", "")
    : memberId;

  // 1. 선납 row 생성 (audit/추적용)
  const { data: prepayment, error } = await db
    .from("dues_prepayments")
    .insert({
      team_id: ctx.teamId,
      user_id: resolvedUserId,
      member_id: resolvedMemberId,
      member_name: memberName ?? null,
      amount,
      period_months: periodMonths,
      start_month: startMonth,
      end_month: endMonth,
      status: "active",
      notes: notes ?? null,
      recorded_by: ctx.userId,
    })
    .select()
    .single();

  if (error) return apiError(error.message);

  // 2. N개월치 payment_status 일괄 PAID upsert (EXEMPT는 건드리지 않음)
  const months = generateMonths(startMonth, periodMonths);
  const startYM = startMonth.slice(0, 7);
  const endYM = endMonth.slice(0, 7);
  const note = `${periodMonths}개월 선납 (${startYM}~${endYM})`;
  const monthlyAmount = Math.round(amount / periodMonths);

  // 기존 EXEMPT 월 식별
  const { data: existingRows } = await db
    .from("dues_payment_status")
    .select("month, status")
    .eq("team_id", ctx.teamId)
    .eq("member_id", resolvedMemberId)
    .in("month", months);

  const exemptMonths = new Set(
    (existingRows ?? []).filter((r) => r.status === "EXEMPT").map((r) => r.month),
  );

  let upsertedCount = 0;
  for (const month of months) {
    if (exemptMonths.has(month)) continue;
    const { error: upsertErr } = await db
      .from("dues_payment_status")
      .upsert(
        {
          team_id: ctx.teamId,
          member_id: resolvedMemberId,
          month,
          status: "PAID",
          paid_amount: monthlyAmount,
          note,
          updated_by: ctx.userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "team_id,member_id,month" },
      );
    if (!upsertErr) upsertedCount++;
  }

  return apiSuccess({ prepayment, monthsMarkedPaid: upsertedCount, exemptMonthsSkipped: exemptMonths.size }, 201);
}

/**
 * PATCH /api/dues/prepayments
 *   1) dues_prepayments status='cancelled'
 *   2) N개월치 payment_status 중 이 선납이 만든 row만 UNPAID로 reset
 *      - note가 정확히 일치하는 row만 되돌림 (다른 출처로 PAID 된 row는 보존)
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

  // 1. 선납 조회
  const { data: existing, error: fetchErr } = await db
    .from("dues_prepayments")
    .select("id, team_id, status, member_id, start_month, end_month, period_months")
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

  // 3. payment_status 되돌리기 — 정확히 이 선납이 만든 note만 매칭
  const months = generateMonths(existing.start_month, existing.period_months);
  const startYM = existing.start_month.slice(0, 7);
  const endYM = existing.end_month.slice(0, 7);
  const expectedNote = `${existing.period_months}개월 선납 (${startYM}~${endYM})`;

  let revertedCount = 0;
  for (const month of months) {
    const { data: rev, error: revErr } = await db
      .from("dues_payment_status")
      .update({
        status: "UNPAID",
        paid_amount: 0,
        note: null,
        updated_by: ctx.userId,
        updated_at: new Date().toISOString(),
      })
      .eq("team_id", ctx.teamId)
      .eq("member_id", existing.member_id)
      .eq("month", month)
      .eq("note", expectedNote)
      .select("id");
    if (!revErr && rev && rev.length > 0) revertedCount++;
  }

  return apiSuccess({ prepayment: updated, monthsReverted: revertedCount });
}
