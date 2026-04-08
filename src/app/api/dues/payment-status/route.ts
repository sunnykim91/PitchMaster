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

  const [statusRes, exemptionRes] = await Promise.all([
    db.from("dues_payment_status").select("*").eq("team_id", ctx.teamId).eq("month", month),
    db.from("member_dues_exemptions").select("*").eq("team_id", ctx.teamId).eq("is_active", true),
  ]);

  if (statusRes.error) return apiError(statusRes.error.message);
  const data = statusRes.data ?? [];

  // 활성 면제 상태 중 해당 월과 겹치는 회원 → 자동 EXEMPT 적용
  const [y, m] = month.split("-").map(Number);
  const monthStart = `${month}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const monthEnd = `${month}-${String(lastDay).padStart(2, "0")}`;

  const TYPE_LABELS: Record<string, string> = { EXEMPT: "면제", LEAVE: "휴회", INJURED: "부상" };

  // member_dues_exemptions.member_id = team_members.id
  // dues_payment_status.member_id = users.id (또는 team_members.id)
  // → team_members로 매핑 테이블 구축
  const exemptions = exemptionRes.data ?? [];
  if (exemptions.length > 0) {
    const exemptMemberIds = [...new Set(exemptions.map((e: any) => e.member_id))];
    const { data: tmRows } = await db
      .from("team_members")
      .select("id, user_id")
      .eq("team_id", ctx.teamId)
      .in("id", exemptMemberIds);

    // team_members.id → users.id 매핑
    const tmToUser = new Map<string, string>();
    for (const tm of tmRows ?? []) {
      if (tm.user_id) tmToUser.set(tm.id, tm.user_id);
    }

    for (const ex of exemptions) {
      const overlaps = ex.start_date <= monthEnd && (ex.end_date === null || ex.end_date >= monthStart);
      if (!overlaps) continue;

      // exemption의 member_id(team_members.id)를 users.id로 변환
      const userId = tmToUser.get(ex.member_id) ?? ex.member_id;

      // payment_status에서 team_members.id 또는 users.id 어느 쪽이든 매칭
      const existing = data.find((d: any) => d.member_id === userId || d.member_id === ex.member_id);
      if (existing?.status === "PAID") continue;

      const note = `${TYPE_LABELS[ex.exemption_type] ?? ex.exemption_type}${ex.reason ? `: ${ex.reason}` : ""}`;
      const matchId = existing?.member_id ?? userId; // DB에 저장된 ID 형식 유지

      if (existing) {
        if (existing.status !== "EXEMPT" || existing.note !== note) {
          await db.from("dues_payment_status").update({ status: "EXEMPT", paid_amount: 0, note, updated_at: new Date().toISOString() })
            .eq("team_id", ctx.teamId).eq("member_id", matchId).eq("month", month);
          existing.status = "EXEMPT";
          existing.note = note;
          existing.paid_amount = 0;
        }
      } else {
        await db.from("dues_payment_status").insert({
          team_id: ctx.teamId, member_id: userId, month, status: "EXEMPT",
          paid_amount: 0, note, updated_at: new Date().toISOString(),
        });
        data.push({ team_id: ctx.teamId, member_id: userId, month, status: "EXEMPT", paid_amount: 0, note });
      }
    }
  }

  return apiSuccess(data);
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
  // unlinked_ 접두사 제거 (미연동 멤버 ID 보정)
  const resolvedMemberId = memberId.startsWith("unlinked_") ? memberId.replace("unlinked_", "") : memberId;
  if (!["PAID", "UNPAID", "EXEMPT"].includes(status)) {
    return apiError("status must be PAID, UNPAID, or EXEMPT", 400);
  }

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { data, error } = await db
    .from("dues_payment_status")
    .upsert({
      team_id: ctx.teamId,
      member_id: resolvedMemberId,
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
    const mid = m.memberId.startsWith("unlinked_") ? m.memberId.replace("unlinked_", "") : m.memberId;
    const { error } = await db
      .from("dues_payment_status")
      .upsert({
        team_id: ctx.teamId,
        member_id: mid,
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
