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

/**
 * 알파 테스터 출석 카운트.
 *
 * TWA 진입 검증은 **클라이언트 측 isTwa()** 가 담당:
 *   - `document.referrer === android-app://app.pitchmaster/...` 일 때만 fetch 호출
 *   - PWA·일반 브라우저는 클라이언트에서 호출 자체를 안 함
 *
 * 서버 측에서는 HTTP `Referer` 헤더로 TWA를 구분할 수 없음
 * (fetch의 Referer는 현재 페이지 URL이라 항상 https://pitch-master.app/...).
 * 따라서 서버는 인증·등록·승인만 검증하고 INSERT.
 *
 * 알파 단계 한정으로 클라이언트 신뢰. 우회 가능하지만 14일 운영 안정성 우선.
 */
export async function POST() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "DB not available" }, { status: 503 });
  }

  const { data: tester, error: testerErr } = await db
    .from("alpha_testers")
    .select("id, approved_at")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (testerErr) {
    console.error("[alpha-testers/ping select]", testerErr);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }

  if (!tester) {
    return NextResponse.json({ ok: true, registered: false });
  }

  if (!tester.approved_at) {
    return NextResponse.json({ ok: true, registered: true, approved: false });
  }

  const logDate = todayKst();

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
