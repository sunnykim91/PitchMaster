import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendTeamPush } from "@/lib/server/sendPush";

/**
 * 회비 미납 자동 알림 크론 (매월 1일 + 15일 실행)
 * 각 팀의 납부 기준일 기준으로 미납자에게 푸시 발송
 */
export async function GET(request: NextRequest) {
  // Vercel Cron 인증
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "DB not available" }, { status: 503 });

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // 회비 설정이 있는 팀 조회
  const { data: settings } = await db
    .from("dues_settings")
    .select("team_id, monthly_amount, member_type")
    .gt("monthly_amount", 0)
    .neq("member_type", "__PERIOD__");

  if (!settings || settings.length === 0) {
    return NextResponse.json({ nudged: 0, message: "No teams with dues settings" });
  }

  const teamIds = [...new Set(settings.map((s) => s.team_id))];
  let totalNudged = 0;

  for (const teamId of teamIds) {
    // 이번 달 납부 현황 조회
    const { data: paymentStatus } = await db
      .from("dues_payment_status")
      .select("member_id, status")
      .eq("team_id", teamId)
      .eq("month", currentMonth);

    // 미납자 member_id 추출
    const unpaidMemberIds = (paymentStatus ?? [])
      .filter((ps) => ps.status === "UNPAID")
      .map((ps) => ps.member_id);

    if (unpaidMemberIds.length === 0) continue;

    // member_id → user_id 매핑
    const { data: members } = await db
      .from("team_members")
      .select("user_id")
      .in("id", unpaidMemberIds)
      .not("user_id", "is", null);

    const userIds = (members ?? []).map((m) => m.user_id).filter(Boolean) as string[];
    if (userIds.length === 0) continue;

    // 중복 알림 방지: 최근 7일 내 같은 제목의 알림이 있으면 skip
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentNotifs } = await db
      .from("notifications")
      .select("id")
      .eq("team_id", teamId)
      .eq("title", "회비 납부 안내")
      .gte("created_at", sevenDaysAgo)
      .limit(1);

    if (recentNotifs && recentNotifs.length > 0) continue;

    // 푸시 발송
    await sendTeamPush(teamId, {
      title: "회비 납부 안내",
      body: `${currentMonth.replace("-", "년 ")}월 회비가 미납 상태입니다. 확인 부탁드립니다.`,
      url: "/dues?tab=status",
      userIds,
    });

    totalNudged += userIds.length;
  }

  return NextResponse.json({ nudged: totalNudged, month: currentMonth });
}
