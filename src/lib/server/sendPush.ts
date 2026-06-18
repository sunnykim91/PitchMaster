import webpush from "web-push";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendNativePushToUsers } from "@/lib/server/sendNativePush";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_CONTACT_EMAIL || "mailto:admin@pitchmaster.app";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
}

/** 팀 전체 또는 특정 유저들에게 푸시 + 인앱 알림 발송 */
export async function sendTeamPush(
  teamId: string,
  opts: { title: string; body: string; url?: string; userIds?: string[] }
) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return { sent: 0, failed: 0 };

  const db = getSupabaseAdmin();
  if (!db) return { sent: 0, failed: 0 };

  // 대상 유저 결정
  let targetUserIds = opts.userIds;
  if (!targetUserIds) {
    const { data: members } = await db
      .from("team_members")
      .select("user_id")
      .eq("team_id", teamId)
      .eq("status", "ACTIVE")
      .not("user_id", "is", null);
    targetUserIds = (members ?? []).map((m) => m.user_id).filter(Boolean);
  }

  if (targetUserIds.length === 0) return { sent: 0, failed: 0 };

  // 인앱 알림 생성 (url 도 같이 저장 — 알림 카드 클릭 시 라우팅)
  // team_id 필수: cron(match-nudge 등)의 팀 단위 중복 발송 방지 조회가 이 컬럼으로 거름.
  // (2026-06-10 수정 전까지 미기록 — 13,044행 중 19행만 team_id 존재, dedup 전면 무력화 상태였음)
  const notifications = targetUserIds.map((uid) => ({
    user_id: uid,
    team_id: teamId,
    type: "PUSH",
    title: opts.title,
    message: opts.body,
    is_read: false,
    url: opts.url ?? "/dashboard",
  }));
  await db.from("notifications").insert(notifications);

  // 네이티브 FCM 발송 (앱 사용자 — 브라우저 비의존). 웹푸시와 별개 경로.
  // 네이티브 앱은 웹푸시 구독을 만들지 않으므로 같은 기기 중복 없음.
  const native = await sendNativePushToUsers(targetUserIds, {
    title: opts.title,
    body: opts.body,
    url: opts.url,
  });

  // 웹푸시 구독 조회 & 발송 (데스크톱/PWA)
  const { data: subs } = await db
    .from("push_subscriptions")
    .select("endpoint, keys")
    .in("user_id", targetUserIds);

  if (!subs || subs.length === 0) return native;

  const payload = JSON.stringify({
    title: opts.title,
    body: opts.body,
    url: opts.url ?? "/dashboard",
  });

  let sent = 0;
  let failed = 0;

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.keys?.p256dh, auth: sub.keys?.auth } },
          payload,
          // urgency high: 단말 절전(doze) 중에도 즉시 표시 — 밤 발송 푸시가 새벽에 몰려 뜨는 문제 방지.
          // 모든 팀 푸시(MVP·결과·역할·넛지)가 시간 민감이라 일괄 적용 (2026-06-10)
          { urgency: "high" }
        );
        sent++;
      } catch (err: unknown) {
        const code = (err as { statusCode?: number })?.statusCode;
        if (code === 410 || code === 404) {
          await db.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
        failed++;
      }
    })
  );

  return { sent: sent + native.sent, failed: failed + native.failed };
}
