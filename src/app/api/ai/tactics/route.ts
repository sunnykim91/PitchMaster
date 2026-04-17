import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateAiTacticsAnalysis, type TacticsAnalysisInput } from "@/lib/server/aiTacticsAnalysis";
import { checkRateLimit } from "@/lib/server/aiUsageLog";

/**
 * POST /api/ai/tactics
 * 김선휘 Feature Flag 전용. 편성 데이터 받아 Claude Haiku로 코치식 3단락 분석 생성.
 *
 * Body: TacticsAnalysisInput
 * Response: { text: string, source: "ai" | "rule" }
 * 429: 일일 호출 한도 초과
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Phase 2 Feature Flag: 김선휘만
  if (session.user.name !== "김선휘") {
    return NextResponse.json({ error: "ai_not_available" }, { status: 403 });
  }

  // 레이트리밋 체크 (24시간 내 user/team 일일 캡)
  const rate = await checkRateLimit("tactics", session.user.id, session.user.teamId ?? null);
  if (!rate.allowed) {
    return NextResponse.json({
      error: "rate_limited",
      reason: rate.reason,
      count: rate.userCount ?? rate.teamCount,
      cap: rate.cap,
      message: rate.reason === "user_cap"
        ? `하루 ${rate.cap}회까지만 사용 가능합니다. (현재 ${rate.userCount}회)`
        : `팀 전체 하루 ${rate.cap}회 한도에 도달했습니다.`,
    }, { status: 429 });
  }

  let body: TacticsAnalysisInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.formationName || !Array.isArray(body.attendees)) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const result = await generateAiTacticsAnalysis({
    ...body,
    userId: session.user.id,
    teamId: session.user.teamId ?? null,
  });
  return NextResponse.json({ text: result.text, source: result.source });
}
