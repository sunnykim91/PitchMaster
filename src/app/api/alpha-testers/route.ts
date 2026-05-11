import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TESTER_CAP = 20;

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  let body: { googleEmail?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const googleEmail = typeof body.googleEmail === "string" ? body.googleEmail.trim().toLowerCase() : "";
  if (!googleEmail || !EMAIL_RE.test(googleEmail) || googleEmail.length > 254) {
    return NextResponse.json({ error: "유효한 이메일을 입력해주세요." }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "DB not available" }, { status: 503 });
  }

  // 본인이 이미 등록되어 있으면 cap 무관 (이메일 변경 허용)
  const { data: self } = await db
    .from("alpha_testers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  // 신규 등록일 때만 20명 cap 체크
  if (!self) {
    const { count } = await db
      .from("alpha_testers")
      .select("id", { count: "exact", head: true });
    if ((count ?? 0) >= TESTER_CAP) {
      return NextResponse.json(
        { error: "선착순 20명이 마감되었습니다. 다음 모집을 기다려주세요!" },
        { status: 409 }
      );
    }
  }

  // upsert: 같은 user_id면 이메일만 갱신 (테스터가 이메일 잘못 입력 후 재등록)
  const { data, error } = await db
    .from("alpha_testers")
    .upsert(
      {
        user_id: userId,
        google_email: googleEmail,
      },
      { onConflict: "user_id" }
    )
    .select("id, google_email, registered_at, approved_at")
    .single();

  if (error) {
    // unique violation on email (다른 user가 이미 같은 이메일 등록)
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "이미 다른 분이 등록한 이메일입니다." },
        { status: 409 }
      );
    }
    console.error("[alpha-testers POST]", error);
    return NextResponse.json({ error: "등록 실패" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, tester: data });
}

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "DB not available" }, { status: 503 });
  }

  const { data, error } = await db
    .from("alpha_testers")
    .select("id, google_email, registered_at, approved_at, rewarded_at")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error) {
    console.error("[alpha-testers GET]", error);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }

  return NextResponse.json({ tester: data });
}
