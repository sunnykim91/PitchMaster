import { NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess, requireRole } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PERMISSIONS } from "@/lib/permissions";

/** 벌금 납부 자동 확인: 입금 내역과 미납 벌금 1:1 매칭 (같은 멤버 + 같은 금액) */
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

  // 2. 해당 멤버들의 입금 내역 조회
  const { data: incomeRecords } = await db
    .from("dues_records")
    .select("id, user_id, amount")
    .eq("team_id", ctx.teamId)
    .eq("type", "INCOME")
    .in("user_id", memberIds);

  if (!incomeRecords || incomeRecords.length === 0) {
    return apiSuccess({ matched: 0, message: "매칭 가능한 입금 내역이 없습니다" });
  }

  // 3. 이미 벌금에 매칭된 입금 내역 ID 제외
  const { data: alreadyMatched } = await db
    .from("penalty_records")
    .select("dues_record_id")
    .eq("team_id", ctx.teamId)
    .not("dues_record_id", "is", null);

  const usedRecordIds = new Set((alreadyMatched ?? []).map((r) => r.dues_record_id));
  const availableIncome = incomeRecords.filter((r) => !usedRecordIds.has(r.id));

  // 4. 멤버별 + 금액 매칭 (같은 멤버, 같은 금액의 입금 건이 있어야 매칭)
  let totalMatched = 0;
  const usedIncomeIds = new Set<string>();

  for (const penalty of unpaidPenalties) {
    // 같은 멤버 + 같은 금액 + 아직 사용 안 한 입금 건 찾기
    const matchingIncome = availableIncome.find(
      (r) => r.user_id === penalty.member_id && r.amount === penalty.amount && !usedIncomeIds.has(r.id)
    );

    if (!matchingIncome) continue;

    const { error } = await db
      .from("penalty_records")
      .update({ status: "PAID", is_paid: true, dues_record_id: matchingIncome.id })
      .eq("id", penalty.id);

    if (!error) {
      usedIncomeIds.add(matchingIncome.id);
      totalMatched++;
    }
  }

  return apiSuccess({ matched: totalMatched });
}
