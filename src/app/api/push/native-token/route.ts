import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// 네이티브 앱(TWA Android)이 전달한 FCM 토큰을 현재 로그인 유저에 연결한다.
// web push 의 /api/push/subscribe 와 동일한 패턴 (세션 확인 → SERVICE_ROLE 저장).

const VALID_PLATFORMS = new Set(["android", "ios"]);

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.isDemo) {
    return NextResponse.json({ error: "데모 모드에서는 사용할 수 없는 기능입니다" }, { status: 403 });
  }

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  const platform = VALID_PLATFORMS.has(body?.platform) ? body.platform : "android";
  if (!token) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  // 동일 토큰이 다른 유저(같은 기기 재로그인)에 묶여 있을 수 있으므로
  // 삭제 후 재삽입 → 기기↔현재 로그인 유저로 매핑 갱신.
  await db.from("native_push_tokens").delete().eq("token", token);
  const { error } = await db.from("native_push_tokens").insert({
    user_id: session.user.id,
    token,
    platform,
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

  const body = await req.json().catch(() => ({}));
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  await db.from("native_push_tokens").delete().eq("token", token).eq("user_id", session.user.id);

  return NextResponse.json({ ok: true });
}
