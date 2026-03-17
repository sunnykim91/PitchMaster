import { NextResponse } from "next/server";
import webpush from "web-push";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isStaffOrAbove } from "@/lib/permissions";

// Configure VAPID credentials
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails("mailto:admin@pitchmaster.app", VAPID_PUBLIC, VAPID_PRIVATE);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only staff+ can send push notifications
  if (!isStaffOrAbove(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return NextResponse.json({ error: "Push not configured" }, { status: 500 });
  }

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });

  const { title, body, url, userIds } = await req.json();
  if (!title || !body) {
    return NextResponse.json({ error: "Missing title or body" }, { status: 400 });
  }

  // Get subscriptions for target users (or all team members)
  let query = db.from("push_subscriptions").select("endpoint, p256dh, auth, user_id");

  if (userIds && Array.isArray(userIds) && userIds.length > 0) {
    query = query.in("user_id", userIds);
  } else if (session.user.teamId) {
    // Send to all team members
    const { data: members } = await db
      .from("team_members")
      .select("user_id")
      .eq("team_id", session.user.teamId)
      .not("user_id", "is", null);

    const memberUserIds = (members ?? []).map((m) => m.user_id).filter(Boolean);
    if (memberUserIds.length === 0) {
      return NextResponse.json({ sent: 0 });
    }
    query = query.in("user_id", memberUserIds);
  }

  const { data: subscriptions } = await query;
  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const payload = JSON.stringify({ title, body, url: url ?? "/notifications" });

  let sent = 0;
  const failed: string[] = [];

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        );
        sent++;
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        // Remove expired/invalid subscriptions
        if (statusCode === 410 || statusCode === 404) {
          await db.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
        failed.push(sub.endpoint);
      }
    })
  );

  return NextResponse.json({ sent, failed: failed.length });
}
