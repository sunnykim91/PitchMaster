import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const TWA_PACKAGE = "app.pitchmaster";
const TWA_REFERER_PREFIX = `android-app://${TWA_PACKAGE}`;

function todayKst(): string {
  const now = new Date();
  const kstMs = now.getTime() + 9 * 60 * 60 * 1000;
  return new Date(kstMs).toISOString().slice(0, 10);
}

/**
 * TWA(Play Store 알파 빌드) 진입 신호 다중 검증.
 *
 * Bubblewrap TWA는 Chrome Custom Tabs 위에서 동작하는데, OS·런처·Chrome 버전 조합에
 * 따라 referrer가 누락되는 케이스가 있음 (53차 박제). 단일 referrer만 의존하면
 * 자동 카운트가 사일런트로 빠진다.
 *
 * 3가지 신호 중 하나라도 매치되면 TWA로 인정:
 *  1. Referer 헤더가 `android-app://app.pitchmaster` 로 시작 (가장 신뢰)
 *  2. X-Requested-With 헤더가 패키지명과 일치 (Android WebView 표준)
 *  3. 클라이언트 신뢰 헤더 `X-Pitchmaster-Source: twa` (Android 진입 시 클라가 세팅)
 *
 * PWA 홈 화면 추가본·일반 모바일 Chrome은 위 신호를 모두 만족하지 못함.
 */
function detectTwa(req: NextRequest): { ok: boolean; signal: string | null } {
  const referer = req.headers.get("referer") ?? "";
  if (referer.toLowerCase().startsWith(TWA_REFERER_PREFIX)) {
    return { ok: true, signal: "referer" };
  }

  const xrw = req.headers.get("x-requested-with") ?? "";
  if (xrw.toLowerCase() === TWA_PACKAGE) {
    return { ok: true, signal: "x-requested-with" };
  }

  const clientSignal = req.headers.get("x-pitchmaster-source") ?? "";
  if (clientSignal.toLowerCase() === "twa") {
    return { ok: true, signal: "x-pitchmaster-source" };
  }

  return { ok: false, signal: null };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const forceAlpha = url.searchParams.get("alpha") === "1";
  const twa = detectTwa(req);
  const isTwa = twa.ok || forceAlpha;

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

  if (!isTwa) {
    return NextResponse.json({
      ok: true,
      registered: true,
      approved: true,
      twa: false,
      reason: "TWA signal not detected — PWA·browser entry not counted",
    });
  }

  const logDate = todayKst();

  const { error: insertErr } = await db
    .from("alpha_tester_daily_log")
    .insert({
      alpha_tester_id: tester.id,
      log_date: logDate,
    });

  if (insertErr && insertErr.code !== "23505") {
    console.error("[alpha-testers/ping insert]", insertErr);
    return NextResponse.json({ error: "로깅 실패" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    registered: true,
    approved: true,
    twa: true,
    signal: forceAlpha ? "force" : twa.signal,
    logDate,
    alreadyLogged: insertErr?.code === "23505",
  });
}
