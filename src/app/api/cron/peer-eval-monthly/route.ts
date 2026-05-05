import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendTeamPush } from "@/lib/server/sendPush";

const NOTIFICATION_TITLE = "📊 이번 달 동료 평가";
const NOTIFICATION_BODY = "팀원들의 능력치를 평가해주세요. 우리 팀 PitchScore™ 정확도가 올라가요.";

/**
 * Phase 2C 정기 라운드 평가 알림 (매월 1일 KST 오전 10시).
 *
 * 적용 범위 (검증 단계):
 *   - Feature Flag 통과 사용자 (name = "김선휘") 본인만
 *   - 검증 완료 후 enable_pitchscore 컬럼 또는 팀 단위 토글로 확장 예정
 *
 * 중복 방지:
 *   - 이번 달 1일 이후 같은 title 알림이 있으면 skip
 *   - cron 재실행 / 같은 날 여러 번 트리거 되어도 1회 보장
 *
 * 알림 url: /dashboard (대시보드 task → "팀원 평가하기" 카드로 진입)
 */
export async function GET(request: NextRequest) {
  // Vercel Cron 인증
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "DB not available" }, { status: 503 });

  // Feature Flag 통과 사용자 조회
  const { data: flagUsers, error: flagErr } = await db
    .from("users")
    .select("id, name")
    .eq("name", "김선휘");

  if (flagErr) {
    return NextResponse.json({ error: flagErr.message }, { status: 500 });
  }

  if (!flagUsers || flagUsers.length === 0) {
    return NextResponse.json({ sent: 0, skipped: 0, reason: "No flagged users" });
  }

  // 이번 달 1일 00:00 KST → UTC 변환 (대략 — DB 저장은 UTC)
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthStartIso = monthStart.toISOString();

  let sent = 0;
  let skipped = 0;
  const results: Array<{ user_id: string; status: "sent" | "skipped" | "no_team" }> = [];

  for (const user of flagUsers) {
    // 활성 팀 조회 (가장 최근 활성)
    const { data: membership } = await db
      .from("team_members")
      .select("team_id")
      .eq("user_id", user.id)
      .eq("status", "ACTIVE")
      .order("joined_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!membership?.team_id) {
      results.push({ user_id: user.id, status: "no_team" });
      continue;
    }

    // 이번 달 이미 발송 여부 체크
    const { count: existing } = await db
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("title", NOTIFICATION_TITLE)
      .gte("created_at", monthStartIso);

    if ((existing ?? 0) > 0) {
      skipped++;
      results.push({ user_id: user.id, status: "skipped" });
      continue;
    }

    // 푸시 + 인앱 알림 발송
    const result = await sendTeamPush(membership.team_id, {
      title: NOTIFICATION_TITLE,
      body: NOTIFICATION_BODY,
      url: "/dashboard",
      userIds: [user.id],
    });

    sent += result.sent;
    results.push({ user_id: user.id, status: "sent" });
  }

  return NextResponse.json({ sent, skipped, total: flagUsers.length, results });
}
