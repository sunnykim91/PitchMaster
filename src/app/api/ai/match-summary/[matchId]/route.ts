import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { generateAiMatchSummaryStream, type MatchSummaryInput } from "@/lib/server/aiMatchSummary";
import { checkRateLimit } from "@/lib/server/aiUsageLog";

/**
 * POST /api/ai/match-summary/[matchId]
 * AI 경기 후기 재생성 (SSE 스트리밍).
 *
 * 기존 캐시 무시하고 Claude Haiku 스트리밍. 완료 시 matches 테이블에 저장.
 * Response: text/event-stream (타입은 MatchSummaryStreamEvent)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (session.user.name !== "김선휘") {
    return NextResponse.json({ error: "ai_not_available" }, { status: 403 });
  }

  // 풋살 팀 AI 차단 (API 레벨)
  if (session.user.teamId) {
    const dbCheck = getSupabaseAdmin();
    if (dbCheck) {
      const { data: team } = await dbCheck.from("teams").select("sport_type").eq("id", session.user.teamId).single();
      if (team?.sport_type === "FUTSAL") {
        return NextResponse.json({ error: "ai_not_available_for_futsal" }, { status: 403 });
      }
    }
  }

  // 재생성 여부 파악
  let isRegenerate = false;
  try {
    const body = await req.json().catch(() => ({}));
    isRegenerate = body?.regenerate === true;
  } catch { /* empty body */ }

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "db_unavailable" }, { status: 503 });

  const { data: match } = await db
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .eq("team_id", session.user.teamId!)
    .single();

  if (!match) {
    return NextResponse.json({ error: "match_not_found" }, { status: 404 });
  }

  // 재생성 1회 제한 체크
  if (isRegenerate) {
    const regenerateCount = (match as Record<string, unknown>).ai_summary_regenerate_count as number ?? 0;
    if (regenerateCount >= 1) {
      return NextResponse.json({
        error: "regenerate_limit",
        message: "경기 후기 재생성은 1회만 가능합니다.",
      }, { status: 429 });
    }
  }

  // MatchSummaryInput 조립 (실제 DB 스키마 기준)
  const [goalsRes, mvpRes, attendanceRes] = await Promise.all([
    db.from("match_goals").select("scorer_id, assist_id, quarter_number, is_own_goal").eq("match_id", matchId),
    db.from("match_mvp_votes").select("candidate_id").eq("match_id", matchId),
    db
      .from("match_attendance")
      .select("user_id, member_id, actually_attended, attendance_status")
      .eq("match_id", matchId),
  ]);

  // team_members.id, users.id 양쪽으로 이름 조회 (goals/mvp의 scorer_id는 둘 중 하나)
  const members = await db
    .from("team_members")
    .select("id, user_id, pre_name, users(name)")
    .eq("team_id", session.user.teamId!);

  const nameMap = new Map<string, string>();
  for (const m of members.data ?? []) {
    const u = Array.isArray(m.users) ? m.users[0] : m.users;
    const name = u?.name ?? m.pre_name ?? "선수";
    nameMap.set(m.id, name);
    if (m.user_id) nameMap.set(m.user_id, name);
  }

  const resolveName = (id: string | null | undefined): string => {
    if (!id) return "선수";
    return nameMap.get(id) ?? "선수";
  };

  // score는 match_goals 집계로 (matches 테이블에 점수 컬럼 없음)
  const goalRows = goalsRes.data ?? [];
  let usScore = 0, oppScore = 0;
  for (const g of goalRows) {
    if (g.scorer_id === "OPPONENT" || g.is_own_goal) oppScore++;
    else usScore++;
  }
  // 득점 기록 자체가 없으면 score null (환각 방지)
  const score = goalRows.length > 0 ? { us: usScore, opp: oppScore } : null;
  const result: "W" | "D" | "L" | null = score
    ? score.us > score.opp ? "W" : score.us < score.opp ? "L" : "D"
    : null;

  const goals = goalRows
    .filter((g) => !g.is_own_goal && g.scorer_id !== "OPPONENT")
    .map((g) => ({
      scorerName: resolveName(g.scorer_id),
      quarter: g.quarter_number ?? null,
      isOwnGoal: false,
    }));

  const assists = goalRows
    .map((g) => (g.assist_id ? resolveName(g.assist_id) : ""))
    .filter((n): n is string => !!n && n !== "선수");

  const mvpCounts = new Map<string, number>();
  for (const v of mvpRes.data ?? []) {
    if (v.candidate_id) mvpCounts.set(v.candidate_id, (mvpCounts.get(v.candidate_id) ?? 0) + 1);
  }
  const topMvp = [...mvpCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const mom = topMvp ? resolveName(topMvp[0]) : null;

  // 참석: attendance_status PRESENT/LATE 우선, 없으면 actually_attended=true 폴백
  const attendanceCount = (attendanceRes.data ?? []).filter((a) => {
    const s = a.attendance_status;
    if (s === "PRESENT" || s === "LATE") return true;
    if (s === "ABSENT") return false;
    return a.actually_attended === true;
  }).length;

  // 득점자 중 최다 득점자 (topScorer)
  const scorerCounts = new Map<string, number>();
  for (const g of goals) {
    scorerCounts.set(g.scorerName, (scorerCounts.get(g.scorerName) ?? 0) + 1);
  }
  const topScorerName = [...scorerCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const input: MatchSummaryInput = {
    matchType: match.match_type,
    score,
    result,
    opponent: match.opponent_name ?? null,
    goals,
    assists,
    mom,
    topScorerName,
    attendanceCount,
    location: match.location ?? null,
    weather: null,
    date: match.match_date ?? "",
    userId: session.user.id,
    teamId: session.user.teamId!,
    matchId,
  };

  // 기록이 너무 빈약한 경기는 AI 호출 스킵 (환각 방지)
  // score도 없고 MOM도 없고 참석도 0이면 후기 생성 거부
  if (!score && !mom && attendanceCount === 0) {
    return NextResponse.json({
      error: "insufficient_data",
      message: "경기 기록(득점·MOM·참석)이 충분하지 않아 후기를 생성할 수 없습니다. 먼저 경기 기록을 입력해주세요.",
    }, { status: 400 });
  }

  // 스트리밍 + 완료 시 DB 저장
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let accumulated = "";
      let finalText: string | null = null;
      let finalSource: "ai" | "rule" = "ai";
      let finalModel: string | undefined;

      try {
        for await (const event of generateAiMatchSummaryStream(input)) {
          const line = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(line));

          if (event.type === "chunk") accumulated += event.text;
          else if (event.type === "replace") { finalText = event.text; finalSource = event.source; }
          else if (event.type === "done") { finalSource = event.source; finalModel = event.model; }
        }

        // 스트림 완료 후 DB 저장 (AI 성공 시에만 — rule fallback은 저장 안 함, 재시도 여지 보존)
        if (finalSource === "ai" && accumulated) {
          const summary = finalText ?? accumulated;
          const updatePayload: Record<string, unknown> = {
            ai_summary: summary,
            ai_summary_generated_at: new Date().toISOString(),
            ai_summary_model: finalModel ?? null,
          };
          // 재생성이면 regenerate_count 증가
          if (isRegenerate) {
            const currentCount = (match as Record<string, unknown>).ai_summary_regenerate_count as number ?? 0;
            updatePayload.ai_summary_regenerate_count = currentCount + 1;
          }
          await db.from("matches").update(updatePayload).eq("id", matchId);
        }

        controller.close();
      } catch (err) {
        console.error("[/api/ai/match-summary stream] error:", err);
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
