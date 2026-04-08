import { NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess, requireRole } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PERMISSIONS } from "@/lib/permissions";

/** 벌금 납부 자동 확인: 입금 내역과 미납 벌금 매칭 */
export async function POST() {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.DUES_RECORD_ADD);
  if (roleCheck) return roleCheck;

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // 1. 미납 벌금 조회
  const { data: unpaidPenalties } = await db
    .from("penalty_records")
    .select("id, member_id, amount")
    .eq("team_id", ctx.teamId)
    .eq("status", "UNPAID")
    .order("date", { ascending: true });

  if (!unpaidPenalties || unpaidPenalties.length === 0) {
    return apiSuccess({ matched: 0, message: "미납 벌금이 없습니다" });
  }

  // 미납 멤버 ID 목록
  const memberIds = [...new Set(unpaidPenalties.map((p) => p.member_id))];

  // 2. 해당 멤버들의 입금 내역 조회 (매칭 안 된 것만)
  const { data: incomeRecords } = await db
    .from("dues_records")
    .select("id, user_id, amount")
    .eq("team_id", ctx.teamId)
    .eq("type", "INCOME")
    .in("user_id", memberIds);

  if (!incomeRecords || incomeRecords.length === 0) {
    return apiSuccess({ matched: 0, message: "매칭 가능한 입금 내역이 없습니다" });
  }

  // 3. 이미 매칭된 dues_record_id 조회
  const { data: alreadyMatched } = await db
    .from("penalty_records")
    .select("dues_record_id")
    .eq("team_id", ctx.teamId)
    .not("dues_record_id", "is", null);

  const matchedRecordIds = new Set((alreadyMatched ?? []).map((r) => r.dues_record_id));

  // 미사용 입금 내역만 필터
  const availableIncome = incomeRecords.filter((r) => !matchedRecordIds.has(r.id));

  // 4. 멤버별 매칭
  let totalMatched = 0;

  for (const memberId of memberIds) {
    const memberPenalties = unpaidPenalties.filter((p) => p.member_id === memberId);
    const memberIncome = availableIncome.filter((r) => r.user_id === memberId);

    if (memberIncome.length === 0) continue;

    // 총 입금액
    let remainingIncome = memberIncome.reduce((sum, r) => sum + r.amount, 0);
    const incomeToUse = [...memberIncome];

    for (const penalty of memberPenalties) {
      if (remainingIncome < penalty.amount) break;

      // 매칭할 입금 내역 찾기
      const duesRecord = incomeToUse.find((r) => r.amount >= penalty.amount) ?? incomeToUse[0];

      const { error } = await db
        .from("penalty_records")
        .update({ status: "PAID", is_paid: true, dues_record_id: duesRecord?.id ?? null })
        .eq("id", penalty.id);

      if (!error) {
        remainingIncome -= penalty.amount;
        totalMatched++;
      }
    }
  }

  return apiSuccess({ matched: totalMatched });
}
