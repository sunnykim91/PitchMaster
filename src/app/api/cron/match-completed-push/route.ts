import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { processMatchCompletedPush } from "@/lib/server/processMatchCompletedPush";

/**
 * 경기 종료 후 MVP 투표 시작 + OVR 변동 알림 크론.
 *
 * 두 경로로 트리거됨:
 *   1) autoCompleteTeamMatches 가 경기를 COMPLETED 로 전환할 때 즉시 (fire-and-forget)
 *   2) 이 크론 — 안전망 (5분 간격 cron, 최대 5분 지연)
 *
 * 실제 로직은 src/lib/server/processMatchCompletedPush.ts.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });

  const result = await processMatchCompletedPush(db);
  return NextResponse.json(result);
}
