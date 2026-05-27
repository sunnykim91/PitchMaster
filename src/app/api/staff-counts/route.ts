import { NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isStaffOrAbove } from "@/lib/permissions";
import { getKstToday } from "@/lib/server/autoCompleteMatches";

/**
 * 햄버거 "빠른 처리" 그룹 badge 카운트 — Phase 4 (68차C).
 *
 * 가벼운 endpoint: 세 카운트만 반환. ClientLayout 이 mount 시 1회 호출해 SidebarNav badge 에 표시.
 *
 * 평회원은 분기해서 0 반환 (UI 측에서 그룹 자체 안 보이지만 안전망).
 */
export async function GET() {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  if (!isStaffOrAbove(ctx.teamRole)) {
    return apiSuccess({ joinRequests: 0, unpaidPenalties: 0, attendanceMissing: 0 });
  }

  const db = getSupabaseAdmin();
  if (!db) return apiError("DB not available", 503);

  const today = getKstToday();
  // 7일 가드 — 너무 옛 경기까지 "출석 체크 안 함" 노출하면 의미 없음
  const sevenDaysAgoDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  // 1) 가입 신청 PENDING
  // 2) 미납 벌금 UNPAID — dues_penalties 테이블, status='UNPAID'
  // 3) 출석 체크 안 한 최근 완료 경기 — match_attendance 의 PRESENT/LATE 0건이고 종료 시각 7일 이내
  const [pendingRes, penaltiesRes, recentCompletedRes] = await Promise.all([
    db.from("team_join_requests")
      .select("id", { count: "exact", head: true })
      .eq("team_id", ctx.teamId)
      .eq("status", "PENDING"),
    db.from("dues_penalties")
      .select("id", { count: "exact", head: true })
      .eq("team_id", ctx.teamId)
      .eq("status", "UNPAID"),
    db.from("matches")
      .select("id")
      .eq("team_id", ctx.teamId)
      .eq("status", "COMPLETED")
      .neq("match_type", "EVENT")
      .gte("match_date", sevenDaysAgoDate)
      .lte("match_date", today),
  ]);

  // 출석 체크 안 한 경기 수 산정: 매치별 PRESENT/LATE 카운트 0건인 매치
  let attendanceMissing = 0;
  const recentMatchIds = (recentCompletedRes.data ?? []).map((m: { id: string }) => m.id);
  if (recentMatchIds.length > 0) {
    const { data: attRows } = await db
      .from("match_attendance")
      .select("match_id, attendance_status")
      .in("match_id", recentMatchIds)
      .in("attendance_status", ["PRESENT", "LATE"]);
    const matchesWithAttendance = new Set(
      (attRows ?? []).map((r: { match_id: string }) => r.match_id)
    );
    attendanceMissing = recentMatchIds.filter((id) => !matchesWithAttendance.has(id)).length;
  }

  return apiSuccess({
    joinRequests: pendingRes.count ?? 0,
    unpaidPenalties: penaltiesRes.count ?? 0,
    attendanceMissing,
  });
}
