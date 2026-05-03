import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateAiFullPlan } from "@/lib/server/aiFullPlan";
import { checkRateLimit } from "@/lib/server/aiUsageLog";
import type { TacticsAnalysisInput } from "@/lib/server/aiTacticsAnalysis";

/**
 * POST /api/ai/full-plan
 * Phase C — 쿼터별 다른 포메이션 + 배치 생성.
 *
 * Body: TacticsAnalysisInput (formationName은 기본값 참고용)
 * Response: { plans: QuarterPlan[], source: "ai" | "rule", error?: string }
 *
 * UI 레벨에서 운영진(STAFF+) 이상만 접근. API 레벨 rate limit으로 남용 방지.
 * 레이트리밋: tactics 카테고리 공유 (user 40 / team 200 per day).
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // 풋살 차단 해제 (41차) — formations.ts 풋살 포메이션 4종 등록됨, AI Full Plan 풋살 지원.

  let body: TacticsAnalysisInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.formationName || !Array.isArray(body.attendees) || !body.quarterCount) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  // 경기당 2회(최초+재생성) + 팀당 월 10회 체크
  const matchId = body.matchId ?? null;
  const rate = await checkRateLimit("tactics-plan", session.user.id, session.user.teamId ?? null, matchId);
  if (!rate.allowed) {
    return NextResponse.json({
      error: "rate_limited",
      reason: rate.reason,
      monthlyCount: rate.monthlyCount,
      monthlyCap: rate.monthlyCap,
      message: rate.message,
    }, { status: 429 });
  }

  const result = await generateAiFullPlan({
    ...body,
    userId: session.user.id,
    teamId: session.user.teamId ?? null,
    matchId: matchId,
  });

  return NextResponse.json(result);
}
