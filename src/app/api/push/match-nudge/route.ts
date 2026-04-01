import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendTeamPush } from "@/lib/server/sendPush";

const DEMO_TEAM_NAME = "FC DEMO";

/** Cron: 경기 0건 팀의 회장에게 첫 경기 등록 넛지 푸시 발송
 *  - 생성된 지 2일 이상 + 활성 멤버 3명 이상 + 경기 0건 팀
 *  - FC DEMO 제외
 *  - 24시간 내 동일 타이틀 알림 이미 발송한 팀 제외
 */
export async function POST() {
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "DB not available" }, { status: 503 });

  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const NUDGE_TITLE = "첫 경기를 등록해보세요!";

  // 생성된 지 2일 이상된 팀 조회 (데모 팀 제외)
  const { data: teams } = await db
    .from("teams")
    .select("id, name, created_at")
    .lt("created_at", twoDaysAgo)
    .neq("name", DEMO_TEAM_NAME);

  if (!teams || teams.length === 0) return NextResponse.json({ nudged: 0 });

  let nudged = 0;

  for (const team of teams) {
    // 경기 수 체크 — 1건 이상이면 스킵
    const { count: matchCount } = await db
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("team_id", team.id);

    if ((matchCount ?? 0) > 0) continue;

    // 활성 멤버 수 체크 — 3명 미만이면 스킵
    const { count: memberCount } = await db
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("team_id", team.id)
      .eq("status", "ACTIVE");

    if ((memberCount ?? 0) < 3) continue;

    // 24시간 내 같은 팀(회장 user_id 기준) 알림 중복 방지
    // 회장 user_id 조회
    const { data: president } = await db
      .from("team_members")
      .select("user_id")
      .eq("team_id", team.id)
      .eq("role", "PRESIDENT")
      .single();

    if (!president?.user_id) continue;

    const { count: recentNoti } = await db
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", president.user_id)
      .eq("title", NUDGE_TITLE)
      .gte("created_at", oneDayAgo);

    if ((recentNoti ?? 0) > 0) continue;

    await sendTeamPush(team.id, {
      title: NUDGE_TITLE,
      body: `팀원 ${memberCount}명이 기다리고 있어요. 첫 경기를 만들어보세요!`,
      url: "/matches",
      userIds: [president.user_id],
    });
    nudged++;
  }

  return NextResponse.json({ nudged });
}
