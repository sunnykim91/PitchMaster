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

  // MatchSummaryInput 조립
  const [goalsRes, mvpRes, attendanceRes] = await Promise.all([
    db.from("match_goals").select("*").eq("match_id", matchId),
    db.from("match_mvp_votes").select("*").eq("match_id", matchId),
    db.from("match_attendance").select("user_id, member_id, actually_attended").eq("match_id", matchId),
  ]);

  const members = await db
    .from("team_members")
    .select("id, user_id, pre_name, users(name)")
    .eq("team_id", session.user.teamId!);

  const nameMap = new Map<string, string>();
  const userNameMap = new Map<string, string>();
  for (const m of members.data ?? []) {
    const u = Array.isArray(m.users) ? m.users[0] : m.users;
    const name = u?.name ?? m.pre_name ?? "선수";
    nameMap.set(m.id, name);
    if (m.user_id) userNameMap.set(m.user_id, name);
  }

  const goals = (goalsRes.data ?? []).map((g) => ({
    scorerName: nameMap.get(g.scorer_id ?? "") ?? userNameMap.get(g.scorer_user_id ?? "") ?? "선수",
    quarter: g.quarter ?? null,
    isOwnGoal: g.is_own_goal ?? false,
  }));

  const assists = (goalsRes.data ?? [])
    .map((g) => nameMap.get(g.assist_id ?? "") ?? userNameMap.get(g.assist_user_id ?? "") ?? "")
    .filter((n): n is string => !!n);

  const mvpCounts = new Map<string, number>();
  for (const v of mvpRes.data ?? []) {
    const key = v.candidate_member_id ?? v.candidate_user_id ?? "";
    if (key) mvpCounts.set(key, (mvpCounts.get(key) ?? 0) + 1);
  }
  const topMvp = [...mvpCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const mom = topMvp ? nameMap.get(topMvp[0]) ?? userNameMap.get(topMvp[0]) ?? null : null;

  const attendanceCount = (attendanceRes.data ?? []).filter((a) => a.actually_attended).length;

  const score = match.our_score != null && match.opponent_score != null
    ? { us: match.our_score, opp: match.opponent_score }
    : null;
  const result: "W" | "D" | "L" | null = score
    ? score.us > score.opp ? "W" : score.us < score.opp ? "L" : "D"
    : null;

  const input: MatchSummaryInput = {
    matchType: match.match_type,
    score,
    result,
    opponent: match.opponent_name ?? null,
    goals,
    assists,
    mom,
    topScorerName: goals[0]?.scorerName ?? null,
    attendanceCount,
    location: match.location ?? null,
    weather: null,
    date: match.date ?? "",
    userId: session.user.id,
    teamId: session.user.teamId!,
    matchId,
  };

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
