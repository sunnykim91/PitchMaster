import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { generateAiTacticsAnalysisStream, type TacticsAnalysisInput } from "@/lib/server/aiTacticsAnalysis";
import { checkRateLimit } from "@/lib/server/aiUsageLog";

/**
 * GET /api/ai/tactics?matchId=...
 * 저장된 AI 코치 분석 조회. 스트리밍 없이 JSON 반환.
 * 이미 생성된 분석을 "다시 보기" 할 때 사용 (rate limit 영향 없음).
 *
 * Response:
 *   { analysis: string | null, generatedAt: string | null, model: string | null }
 *   - 분석 없으면 analysis === null
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const matchId = req.nextUrl.searchParams.get("matchId");
  if (!matchId) {
    return NextResponse.json({ error: "missing_matchId" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "db_unavailable" }, { status: 503 });

  // 본인 팀 경기인지 검증 (타 팀 분석 조회 차단)
  const { data: match } = await db
    .from("matches")
    .select("ai_coach_analysis, ai_coach_generated_at, ai_coach_model")
    .eq("id", matchId)
    .eq("team_id", session.user.teamId!)
    .single();

  if (!match) {
    return NextResponse.json({ error: "match_not_found" }, { status: 404 });
  }

  return NextResponse.json({
    analysis: (match as { ai_coach_analysis?: string | null }).ai_coach_analysis ?? null,
    generatedAt: (match as { ai_coach_generated_at?: string | null }).ai_coach_generated_at ?? null,
    model: (match as { ai_coach_model?: string | null }).ai_coach_model ?? null,
  });
}

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

  // 경기당 1회(재생성 불가) + 팀당 월 10회 체크
  const matchId = body.matchId ?? null;
  const rate = await checkRateLimit("tactics-coach", session.user.id, session.user.teamId ?? null, matchId);
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
