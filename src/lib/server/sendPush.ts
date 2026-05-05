import webpush from "web-push";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

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
  const notifications = targetUserIds.map((uid) => ({
    user_id: uid,
    type: "PUSH",
    title: opts.title,
    message: opts.body,
    is_read: false,
    url: opts.url ?? "/dashboard",
  }));
  await db.from("notifications").insert(notifications);

  // 푸시 구독 조회 & 발송
  const { data: subs } = await db
    .from("push_subscriptions")
    .select("endpoint, keys")
    .in("user_id", targetUserIds);

  if (!subs || subs.length === 0) return { sent: 0, failed: 0 };

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
          payload
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

  return { sent, failed };
}
