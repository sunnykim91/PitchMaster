import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendTeamPush } from "@/lib/server/sendPush";

const DEMO_TEAM_NAME = "FC DEMO";

/** Cron: 1명(회장만) 팀에게 팀원 초대 넛지 푸시 발송 */
export async function POST(request: Request) {
  // 외부 임의 POST 로 전 팀에 푸시 폭탄 발송되는 것 방지 — /api/cron/* 와 동일하게 CRON_SECRET 검사
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "DB not available" }, { status: 503 });

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  // 24시간~3일 전에 생성된 팀 조회 (데모 팀 제외)
  const { data: teams } = await db
    .from("teams")
    .select("id, name, invite_code, created_at")
    .lt("created_at", oneDayAgo)
    .gt("created_at", threeDaysAgo)
    .neq("name", DEMO_TEAM_NAME);

  if (!teams || teams.length === 0) return NextResponse.json({ nudged: 0 });

  let nudged = 0;
  for (const team of teams) {
    // 활성 멤버 수 체크
    const { count } = await db
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("team_id", team.id)
      .eq("status", "ACTIVE");

    if ((count ?? 0) > 1) continue; // 이미 팀원이 있으면 스킵

    // 회장 user_id 조회
    const { data: president } = await db
      .from("team_members")
      .select("user_id")
      .eq("team_id", team.id)
      .eq("role", "PRESIDENT")
      .single();

    if (!president?.user_id) continue;

    // 최근 24시간 내 같은 회장에게 넛지 발송 이력 체크 (중복 방지).
    // user_id 필터 필수 — 없으면 다른 팀 회장이 받은 알림 하나로 모든 팀 넛지가 스킵됨
    // (match-nudge route 와 동일 패턴).
    const { count: recentNoti } = await db
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", president.user_id)
      .eq("title", "팀원을 초대해보세요!")
      .gte("created_at", oneDayAgo);

    if ((recentNoti ?? 0) > 0) continue;

    await sendTeamPush(team.id, {
      title: "팀원을 초대해보세요!",
      body: `${team.name} 초대 코드: ${team.invite_code} — 팀원에게 공유하면 바로 가입할 수 있습니다.`,
      url: "/dashboard",
      userIds: [president.user_id],
    });
    nudged++;
  }

  return NextResponse.json({ nudged });
}
