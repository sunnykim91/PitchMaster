import { NextRequest, NextResponse } from "next/server";
import { getApiContext, requireRole, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PERMISSIONS } from "@/lib/permissions";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** GET: 월별 납부 상태 조회 (?month=2026-03) */
export async function GET(req: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const month = req.nextUrl.searchParams.get("month");
  if (!month) return apiError("month parameter required", 400);

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { data, error } = await db
    .from("dues_payment_status")
    .select("*")
    .eq("team_id", ctx.teamId)
    .eq("month", month);

  if (error) return apiError(error.message);
  return apiSuccess(data ?? []);
}

/** POST: 납부 상태 설정 (upsert) */
export async function POST(req: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const body = await req.json();
  const { memberId, month, status, paidAmount, note, selfReport } = body;

  // 회원 자기 신고: 본인의 납부 상태만 변경 가능
  if (selfReport && memberId === ctx.userId) {
    // selfReport는 PAID만 허용 (자기가 자기를 면제/미납 처리하는 건 불가)
    if (status !== "PAID") {
      return apiError("Self-report only allows PAID status", 400);
    }
  } else {
    const roleCheck = requireRole(ctx, PERMISSIONS.DUES_RECORD_ADD);
    if (roleCheck) return roleCheck;
  }

  if (!memberId || !month || !status) {
    return apiError("memberId, month, status required", 400);
  }
  if (!["PAID", "UNPAID", "EXEMPT"].includes(status)) {
    return apiError("status must be PAID, UNPAID, or EXEMPT", 400);
  }

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { data, error } = await db
    .from("dues_payment_status")
    .upsert({
      team_id: ctx.teamId,
      member_id: memberId,
      month,
      status,
      paid_amount: paidAmount ?? 0,
      note: note ?? null,
      updated_by: ctx.userId,
      updated_at: new Date().toISOString(),
    }, { onConflict: "team_id,member_id,month" })
    .select()
    .single();

  if (error) return apiError(error.message);
  return apiSuccess(data);
}

/** PUT: 일괄 자동 매칭 — 입금 내역 기반으로 해당 월 납부 상태 자동 설정 */
export async function PUT(req: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const body = await req.json();
  const { month, matches } = body as { month: string; matches: { memberId: string; amount: number; status?: string }[] };

  if (!month || !matches) return apiError("month, matches required", 400);

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  let updated = 0;
  for (const m of matches) {
    const { error } = await db
      .from("dues_payment_status")
      .upsert({
        team_id: ctx.teamId,
        member_id: m.memberId,
        month,
        status: m.status || "PAID",
        paid_amount: m.amount,
        updated_by: ctx.userId,
        updated_at: new Date().toISOString(),
      }, { onConflict: "team_id,member_id,month" });
    if (!error) updated++;
  }

  return apiSuccess({ updated });
}
