import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { generateAiTacticsAnalysisStream, type TacticsAnalysisInput } from "@/lib/server/aiTacticsAnalysis";
import { checkRateLimit } from "@/lib/server/aiUsageLog";

/**
 * POST /api/ai/tactics
 * 김선휘 Feature Flag 전용. SSE로 코치식 3단락 분석 스트리밍.
 *
 * Body: TacticsAnalysisInput
 * Response: text/event-stream
 *   data: {"type":"chunk","text":"참석 "}
 *   data: {"type":"replace","text":"룰기반텍스트","source":"rule","reason":"low_quality"}  // 선택
 *   data: {"type":"done","source":"ai"|"rule","model":"..."}
 *
 * 429: 일일 한도 초과 (JSON 응답)
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (session.user.name !== "김선휘") {
    return NextResponse.json({ error: "ai_not_available" }, { status: 403 });
  }

  // 풋살 팀 AI 차단 (API 레벨)
  if (session.user.teamId) {
    const db = getSupabaseAdmin();
    if (db) {
      const { data: team } = await db.from("teams").select("sport_type").eq("id", session.user.teamId).single();
      if (team?.sport_type === "FUTSAL") {
        return NextResponse.json({ error: "ai_not_available_for_futsal" }, { status: 403 });
      }
    }
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

  // 경기당 1회 + 팀당 월 10회 체크
  const matchId = body.matchId ?? null;
  const rate = await checkRateLimit("tactics", session.user.id, session.user.teamId ?? null, matchId);
  if (!rate.allowed) {
    return NextResponse.json({
      error: "rate_limited",
      reason: rate.reason,
      monthlyCount: rate.monthlyCount,
      monthlyCap: rate.monthlyCap,
      message: rate.message,
    }, { status: 429 });
  }

  const inputWithContext: TacticsAnalysisInput = {
    ...body,
    userId: session.user.id,
    teamId: session.user.teamId ?? null,
    matchId: matchId,
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of generateAiTacticsAnalysisStream(inputWithContext)) {
          const line = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(line));
        }
        controller.close();
      } catch (err) {
        console.error("[/api/ai/tactics] stream error:", err);
        const errLine = `data: ${JSON.stringify({ type: "error", message: "stream_failed" })}\n\n`;
        controller.enqueue(encoder.encode(errLine));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
