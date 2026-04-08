import { NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/** 납부 통계 — 최근 6개월 납부율 추이 + 장기 미납자 */
export async function GET() {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // 최근 6개월 월 목록 생성
  const months: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  // 활성 멤버 수 (면제 제외)
  const { data: members } = await db
    .from("team_members")
    .select("id, user_id, users(name)")
    .eq("team_id", ctx.teamId)
    .eq("status", "ACTIVE");

  const memberCount = members?.length ?? 0;
  if (memberCount === 0) return apiSuccess({ history: [], longTermUnpaid: [] });

  // 전체 납부현황 조회 (최근 6개월)
  const { data: allStatus } = await db
    .from("dues_payment_status")
    .select("member_id, month, status")
    .eq("team_id", ctx.teamId)
    .in("month", months);

  // 월별 납부율
  const history = months.map((month) => {
    const monthData = (allStatus ?? []).filter((s) => s.month === month);
    const exempt = monthData.filter((s) => s.status === "EXEMPT").length;
    const paid = monthData.filter((s) => s.status === "PAID").length;
    const total = memberCount - exempt;
    return {
      month: month.slice(5) + "월", // "04월"
      rate: total > 0 ? Math.round((paid / total) * 100) : 0,
    };
  });

  // 활성 면제 회원 조회 (장기 미납자에서 제외)
  const { data: activeExemptions } = await db
    .from("member_dues_exemptions")
    .select("member_id")
    .eq("team_id", ctx.teamId)
    .eq("is_active", true);
  const exemptMemberIds = new Set((activeExemptions ?? []).map((e) => e.member_id));

  // 장기 미납자 (최근 3개월 연속 UNPAID, 면제/휴회/부상 제외)
  const recentMonths = months.slice(-3);
  const unpaidCounts = new Map<string, number>();

  for (const m of members ?? []) {
    const memberId = m.user_id ?? m.id;
    if (exemptMemberIds.has(memberId)) continue; // 면제 회원 스킵
    let consecutive = 0;
    for (const month of recentMonths) {
      const status = (allStatus ?? []).find(
        (s) => s.member_id === memberId && s.month === month
      );
      if (!status || status.status === "UNPAID") {
        consecutive++;
      } else {
        consecutive = 0;
      }
    }
    if (consecutive >= 2) {
      const user = Array.isArray(m.users) ? m.users[0] : m.users;
      const name = (user as { name: string } | null)?.name ?? "알 수 없음";
      unpaidCounts.set(name, consecutive);
    }
  }

  const longTermUnpaid = [...unpaidCounts.entries()]
    .filter(([name]) => name !== "알 수 없음")
    .map(([name, months]) => ({ name, months }))
    .sort((a, b) => b.months - a.months);

  return apiSuccess({ history, longTermUnpaid });
}
