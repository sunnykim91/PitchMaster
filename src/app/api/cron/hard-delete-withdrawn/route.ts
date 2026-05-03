import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * GET /api/cron/hard-delete-withdrawn
 *
 * 매일 1회 Vercel Cron 이 호출. 탈퇴 후 14일 경과한 users row 를 물리 삭제.
 * FK CASCADE 로 posts·post_comments·match_attendance·push_subscriptions·notifications 등
 * 연관 데이터 일괄 정리됨.
 *
 * 인증: Authorization: Bearer {CRON_SECRET}
 * 스케줄: vercel.json 에서 "0 3 * * *" (매일 03:00 UTC = KST 12:00)
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "db_unavailable" }, { status: 503 });

  // 14일 전 기준 타임스탬프
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  // 삭제 대상 조회 (감사 로그 업데이트용)
  // is_banned=true 는 영구 차단 — hard-delete 제외 (kakao_id 보존해 재가입 차단)
  const { data: targets, error: selectErr } = await db
    .from("users")
    .select("id, kakao_id")
    .not("deleted_at", "is", null)
    .lt("deleted_at", cutoff)
    .eq("is_banned", false);

  if (selectErr) {
    console.error("[hard-delete-withdrawn] 대상 조회 실패:", selectErr);
    return NextResponse.json({ error: "select_failed" }, { status: 500 });
  }

  if (!targets || targets.length === 0) {
    return NextResponse.json({ ok: true, deleted: 0 });
  }

  const ids = targets.map((t) => t.id);

  // 물리 삭제 — FK CASCADE 로 연관 row 도 자동 삭제. is_banned=true 는 위 select 단계에서 제외됨.
  const { error: deleteErr } = await db
    .from("users")
    .delete()
    .in("id", ids)
    .eq("is_banned", false);

  if (deleteErr) {
    console.error("[hard-delete-withdrawn] 삭제 실패:", deleteErr);
    return NextResponse.json({ error: "delete_failed", message: deleteErr.message }, { status: 500 });
  }

  // 감사 로그 hard_deleted_at 업데이트 (best-effort)
  await db
    .from("account_withdrawal_log")
    .update({ hard_deleted_at: new Date().toISOString() })
    .in("user_id", ids)
    .is("hard_deleted_at", null);

  return NextResponse.json({ ok: true, deleted: ids.length, ids });
}
