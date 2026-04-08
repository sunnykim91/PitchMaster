import { NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess, requireRole } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PERMISSIONS } from "@/lib/permissions";

/** 벌금 납부 자동 확인: 입금 내역과 미납 벌금 1:1 매칭 (같은 멤버 + 같은 금액 + 발생일 이후) */
export async function POST() {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.DUES_RECORD_ADD);
  if (roleCheck) return roleCheck;

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // 1. 미납 벌금 조회 + 멤버 이름
  const { data: unpaidPenalties } = await db
    .from("penalty_records")
    .select("id, member_id, amount, date")
    .eq("team_id", ctx.teamId)
    .eq("status", "UNPAID")
    .order("date", { ascending: true });

  if (!unpaidPenalties || unpaidPenalties.length === 0) {
    return apiSuccess({ matched: 0, message: "미납 벌금이 없습니다" });
  }

  // 멤버 이름 조회 (description 기반 fallback용)
  const memberIds = [...new Set(unpaidPenalties.map((p) => p.member_id))];
  const { data: users } = await db.from("users").select("id, name").in("id", memberIds);
  const userNameMap = new Map<string, string>();
  for (const u of users ?? []) userNameMap.set(u.id, u.name);

  // 2. 팀 전체 입금 내역 조회 (user_id가 null인 건도 포함 — description 매칭 위해)
  const { data: incomeRecords } = await db
    .from("dues_records")
    .select("id, user_id, amount, recorded_at, description")
    .eq("team_id", ctx.teamId)
    .eq("type", "INCOME");

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

  // 4. 매칭
  let totalMatched = 0;
  const usedIncomeIds = new Set<string>();

  for (const penalty of unpaidPenalties) {
    const penaltyDate = penalty.date;
    const memberName = userNameMap.get(penalty.member_id) ?? "";

    // 매칭 조건: 같은 금액 + 벌금 발생일 이후 + 미사용
    // 우선순위 1: user_id 일치
    // 우선순위 2: description에 멤버 이름 포함 (user_id가 null인 경우)
    const matchingIncome = availableIncome.find(
      (r) =>
        r.amount === penalty.amount &&
        !usedIncomeIds.has(r.id) &&
        (r.recorded_at?.slice(0, 10) ?? "") >= penaltyDate &&
        (r.user_id === penalty.member_id || (memberName && r.description?.includes(memberName)))
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
