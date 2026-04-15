import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateAiTacticsAnalysis, type TacticsAnalysisInput } from "@/lib/server/aiTacticsAnalysis";

/**
 * POST /api/ai/tactics
 * 김선휘 Feature Flag 전용. 편성 데이터 받아 Claude Haiku로 코치식 분석 1~2단락 생성.
 *
 * Body: TacticsAnalysisInput
 * Response: { text: string, source: "ai" | "rule" }
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

  let body: TacticsAnalysisInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.formationName || !Array.isArray(body.attendees)) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const result = await generateAiTacticsAnalysis(body);
  return NextResponse.json({ text: result.text, source: result.source });
}
