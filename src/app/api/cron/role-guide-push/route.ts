import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { processRoleGuidePush } from "@/lib/server/processRoleGuidePush";

/**
 * 투표 마감 직후 역할 가이드 푸시 크론 — 5분 간격.
 *
 * 동작: vote_deadline <= now() 이고 role_guide_push_sent_at IS NULL 인
 *       SCHEDULED 경기의 ATTEND 투표자들에게 개인 푸시 발송.
 *
 * 푸시는 편성 존재 여부에 따라 구체/일반 문구 분기.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });

  const result = await processRoleGuidePush(db);
  return NextResponse.json(result);
}
