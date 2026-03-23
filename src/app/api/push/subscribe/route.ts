import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });

  const subscription = await req.json();
  if (!subscription?.endpoint) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  // 기존 동일 endpoint 삭제 후 insert (unique 제약 없이 안전)
  await db.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
  const { error } = await db
    .from("push_subscriptions")
    .insert({
      user_id: session.user.id,
      endpoint: subscription.endpoint,
      keys: subscription.keys ?? {},
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });

  const { endpoint } = await req.json();
  if (!endpoint) return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });

  await db.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", session.user.id);

  return NextResponse.json({ ok: true });
}
