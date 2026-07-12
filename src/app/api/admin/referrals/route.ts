import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isPlatformAdmin } from "@/lib/admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * 추천 리워드 운영 (플랫폼 관리자 전용).
 * GET  — 전체 추천 목록 (추천인 이름/연락처·초대팀·상태·날짜)
 * PATCH— { id, action: "reward" | "void", note? } — 기프티콘 지급 완료/무효 처리
 */
export async function GET() {
  const session = await auth();
  if (!session || !isPlatformAdmin(session.user.id)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "DB not available" }, { status: 503 });

  const { data, error } = await db
    .from("referrals")
    .select(
      "id, status, created_at, activated_at, rewarded_at, reward_note, referrer:referrer_user_id(name, phone), referred:referred_user_id(name), team:referred_team_id(name)",
    )
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ referrals: data ?? [] });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session || !isPlatformAdmin(session.user.id)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const id = body?.id as string | undefined;
  const action = body?.action as string | undefined;
  const note = typeof body?.note === "string" ? body.note.slice(0, 200) : null;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "DB not available" }, { status: 503 });

  let update: Record<string, unknown>;
  if (action === "reward") {
    update = { status: "REWARDED", rewarded_at: new Date().toISOString(), reward_note: note };
  } else if (action === "void") {
    update = { status: "VOID" };
  } else {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }

  const { error } = await db.from("referrals").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
