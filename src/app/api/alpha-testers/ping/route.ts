import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// KST 기준 오늘 날짜 (YYYY-MM-DD)
function todayKst(): string {
  const now = new Date();
  const kstMs = now.getTime() + 9 * 60 * 60 * 1000;
  const kst = new Date(kstMs);
  return kst.toISOString().slice(0, 10);
}

export async function POST() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "DB not available" }, { status: 503 });
  }

  // 본인이 알파 테스터로 등록되어 있는지 확인
  const { data: tester, error: testerErr } = await db
    .from("alpha_testers")
    .select("id, approved_at")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (testerErr) {
    console.error("[alpha-testers/ping select]", testerErr);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }

  // 등록 안 된 사용자 — 조용히 성공 응답 (클라이언트 무조건 호출 패턴 허용)
  if (!tester) {
    return NextResponse.json({ ok: true, registered: false });
  }

  // 운영자 승인 전엔 카운트하지 않음 (Play Console 등록 전)
  if (!tester.approved_at) {
    return NextResponse.json({ ok: true, registered: true, approved: false });
  }

  const logDate = todayKst();

  // 오늘 이미 로그 있으면 무시 (UNIQUE 제약)
  const { error: insertErr } = await db
    .from("alpha_tester_daily_log")
    .insert({
      alpha_tester_id: tester.id,
      log_date: logDate,
    });

  // 23505 = 이미 오늘 로그 있음 (정상)
  if (insertErr && insertErr.code !== "23505") {
    console.error("[alpha-testers/ping insert]", insertErr);
    return NextResponse.json({ error: "로깅 실패" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, registered: true, approved: true, logDate });
}
