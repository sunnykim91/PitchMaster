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
 * 김선휘 Feature Flag (베타).
 * 레이트리밋: tactics 카테고리 공유 (user 40 / team 200 per day).
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (session.user.name !== "김선휘") {
    return NextResponse.json({ error: "ai_not_available" }, { status: 403 });
  }

  const rate = await checkRateLimit("tactics", session.user.id, session.user.teamId ?? null);
  if (!rate.allowed) {
    return NextResponse.json({
      error: "rate_limited",
      message: rate.reason === "user_cap"
        ? `하루 ${rate.cap}회까지만 사용 가능합니다.`
        : `팀 전체 하루 ${rate.cap}회 한도에 도달했습니다.`,
    }, { status: 429 });
  }

  let body: TacticsAnalysisInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.formationName || !Array.isArray(body.attendees) || !body.quarterCount) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const result = await generateAiFullPlan({
    ...body,
    userId: session.user.id,
    teamId: session.user.teamId ?? null,
  });

  return NextResponse.json(result);
}
