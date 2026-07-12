import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { autoCompleteAllMatches } from "@/lib/server/autoCompleteMatches";
import { activatePendingReferrals } from "@/lib/server/referrals";

/**
 * 모든 팀 일괄 자동 완료 크론 (5분 간격).
 *
 * 배경:
 * autoCompleteTeamMatches 는 페이지 진입 시점에만 실행되어, 활성 사용자가
 * 없는 팀은 SCHEDULED → COMPLETED 전환이 영영 안 됨. 그러면 후속 cron
 * (match-completed-push, match-result) 도 작동 못 함.
 *
 * 이 cron 이 5분마다 일괄 전환 → MVP 투표 시작 푸시·OVR 변동 푸시가
 * 사용자 진입 없이도 정상 발송.
 *
 * 가드: 최근 7일 윈도우. 옛 경기 무더기 처리로 인한 푸시 폭탄 방지.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });

  const result = await autoCompleteAllMatches(db);
  // 추천 리워드 활성화 — 초대팀이 첫 COMPLETED 경기 + 카카오 연동멤버 ≥3 이면 ACTIVATED (별도 cron 없이 여기 얹음)
  const referralsActivated = await activatePendingReferrals();
  return NextResponse.json({ ...result, referralsActivated });
}
