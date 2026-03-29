import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendTeamPush } from "@/lib/server/sendPush";

const DEMO_TEAM_ID = "192127c0-e2be-46b4-b340-7583730467da";
const NUDGE_TITLE = "첫 경기를 등록해보세요!";

/** Cron: 팀원 2명+ but 경기 0건인 팀에게 경기 등록 넛지 (생성 3~7일) */
export async function GET(request: NextRequest) {
  // Vercel Cron 인증
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "DB not available" }, { status: 503 });

  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // 3~7일 전 생성된 팀 조회 (데모 제외)
  const { data: teams } = await db
    .from("teams")
    .select("id, name")
    .lt("created_at", threeDaysAgo)
    .gt("created_at", sevenDaysAgo)
    .neq("id", DEMO_TEAM_ID);

  if (!teams || teams.length === 0) return NextResponse.json({ nudged: 0 });

  let nudged = 0;
  for (const team of teams) {
    // 활성 멤버 2명 이상인지 확인
    const { count: memberCount } = await db
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("team_id", team.id)
      .eq("status", "ACTIVE");

    if ((memberCount ?? 0) < 2) continue;

    // 경기가 0건인지 확인
    const { count: matchCount } = await db
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("team_id", team.id);

    if ((matchCount ?? 0) > 0) continue;

    // 중복 발송 방지 (24시간 내 같은 제목)
    const { count: recentNoti } = await db
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("team_id", team.id)
      .eq("title", NUDGE_TITLE)
      .gte("created_at", oneDayAgo);

    if ((recentNoti ?? 0) > 0) continue;

    // 회장에게 푸시 발송
    const { data: president } = await db
      .from("team_members")
      .select("user_id")
      .eq("team_id", team.id)
      .eq("role", "PRESIDENT")
      .single();

    if (!president?.user_id) continue;

    await sendTeamPush(team.id, {
      title: NUDGE_TITLE,
      body: `${team.name}에 팀원이 모였어요! 경기 일정을 등록하면 참석 투표를 받을 수 있습니다.`,
      url: "/matches",
      userIds: [president.user_id],
    });
    nudged++;
  }

  return NextResponse.json({ nudged });
}
