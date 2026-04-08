import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/** 휴면 자동 복귀 크론 (매일 KST 00:00 실행) — dormant_until 만료 시 ACTIVE 전환 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });

  const today = new Date().toISOString().slice(0, 10);

  // dormant_until이 오늘 이전이고 아직 DORMANT인 멤버 → ACTIVE 전환
  const { data: expired, error } = await db
    .from("team_members")
    .update({
      status: "ACTIVE",
      dormant_type: null,
      dormant_until: null,
      dormant_reason: null,
    })
    .eq("status", "DORMANT")
    .lt("dormant_until", today)
    .not("dormant_until", "is", null)
    .select("id, user_id, team_id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ restored: expired?.length ?? 0 });
}
