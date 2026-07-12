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
      "id, status, created_at, activated_at, rewarded_at, reward_note, referred_team_id, referrer:referrer_user_id(name, phone), referred:referred_user_id(name), team:referred_team_id(name)",
    )
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  // 검수용 초대팀 통계 — 완료경기 수 · 카카오 연동 멤버 수(진짜 가입자) · 전체 멤버 수(명단 포함).
  // 활성화 게이트(완료경기≥1 && 연동멤버≥3)를 실제로 넘겼는지, 어뷰징 아닌 진짜 팀인지 운영자가 눈으로 판단.
  const referrals = await Promise.all(
    rows.map(async (r) => {
      const teamId = (r as { referred_team_id: string | null }).referred_team_id;
      let stats = { completedMatches: 0, linkedMembers: 0, totalMembers: 0 };
      if (teamId) {
        const [completed, linked, total] = await Promise.all([
          db.from("matches").select("id", { count: "exact", head: true }).eq("team_id", teamId).eq("status", "COMPLETED"),
          db.from("team_members").select("id", { count: "exact", head: true }).eq("team_id", teamId).not("user_id", "is", null).in("status", ["ACTIVE", "DORMANT"]),
          db.from("team_members").select("id", { count: "exact", head: true }).eq("team_id", teamId).in("status", ["ACTIVE", "DORMANT"]),
        ]);
        stats = {
          completedMatches: completed.count ?? 0,
          linkedMembers: linked.count ?? 0,
          totalMembers: total.count ?? 0,
        };
      }
      return { ...r, stats };
    }),
  );

  return NextResponse.json({ referrals });
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
