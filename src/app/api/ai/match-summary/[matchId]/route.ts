import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { MatchSummaryInput } from "@/lib/server/aiMatchSummary";
import { generateMatchSummaryFromTemplate } from "@/lib/server/matchSummaryTemplate";

/**
 * POST /api/ai/match-summary/[matchId]
 * 경기 후기 재생성 — 템플릿 기반 (AI 제거됨, 25차).
 *
 * 이전엔 Claude Haiku SSE 스트리밍이었으나:
 * - LLM이 득점자·골 수·시점을 왜곡하는 환각 지속
 * - DB 스키마 수정 후에도 "전반 유민 선제골" 같은 드라마 조작 발생
 * → 결정론적 템플릿으로 전환 (팩트 100%, 비용 0, 지연 0ms)
 *
 * Response: { summary: string, source: "template" }
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
  const [goalsRes, mvpRes, attendanceRes, guestsRes] = await Promise.all([
    db.from("match_goals").select("scorer_id, assist_id, quarter_number, is_own_goal").eq("match_id", matchId),
    db.from("match_mvp_votes").select("candidate_id").eq("match_id", matchId),
    db
      .from("match_attendance")
      .select("user_id, member_id, actually_attended, attendance_status")
      .eq("match_id", matchId),
    // 용병 — scorer_id / assist_id가 match_guests.id를 가리키는 경우
    db.from("match_guests").select("id, name").eq("match_id", matchId),
  ]);

  // scorer_id / assist_id / candidate_id는 users.id, team_members.id, match_guests.id 중 하나
  const members = await db
    .from("team_members")
    .select("id, user_id, pre_name, users(name)")
    .eq("team_id", session.user.teamId!);

  const nameMap = new Map<string, string>();
  // team_members.id + users.id 양쪽 등록
  for (const m of members.data ?? []) {
    const u = Array.isArray(m.users) ? m.users[0] : m.users;
    const name = u?.name ?? m.pre_name ?? "선수";
    nameMap.set(m.id, name);
    if (m.user_id) nameMap.set(m.user_id, name);
  }
  // 용병 id도 등록
  for (const g of guestsRes.data ?? []) {
    if (g.id && g.name) nameMap.set(g.id, g.name);
  }

  // 특수 상수 처리
  const SPECIAL: Record<string, string | null> = {
    UNKNOWN: null,   // "모름" — 득점자 언급 생략
    OPPONENT: null,  // 상대팀 득점 — 우리 서술에서 제외
  };

  const resolveName = (id: string | null | undefined): string | null => {
    if (!id) return null;
    if (id in SPECIAL) return SPECIAL[id];
    return nameMap.get(id) ?? null;
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

  // 우리 득점만 추출 — 득점자 이름이 있는 것만 (UNKNOWN/OPPONENT 제외)
  const goals = goalRows
    .filter((g) => !g.is_own_goal && g.scorer_id !== "OPPONENT")
    .map((g) => {
      const scorerName = resolveName(g.scorer_id);
      return scorerName ? {
        scorerName,
        quarter: g.quarter_number ?? null,
        isOwnGoal: false,
      } : null;
    })
    .filter((g): g is { scorerName: string; quarter: number | null; isOwnGoal: boolean } => g !== null);

  const assists = goalRows
    .map((g) => resolveName(g.assist_id))
    .filter((n): n is string => !!n);

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
    playerCount: match.player_count ?? 11,
    location: match.location ?? null,
    weather: null,
    date: match.match_date ?? "",
    userId: session.user.id,
    teamId: session.user.teamId!,
    matchId,
  };

  // 기록 전무한 경기는 AI 호출 차단 (환각 원천 방지)
  // 득점/MOM/참석 중 하나라도 있으면 허용. 이벤트(EVENT) 경기는 참석만 있어도 OK.
  const hasAnyRecord = !!score || !!mom || attendanceCount > 0;
  if (!hasAnyRecord && match.match_type !== "EVENT") {
    return NextResponse.json({
      error: "insufficient_data",
      message: "경기 기록(득점·MOM·참석)이 하나도 없어 후기를 생성할 수 없습니다. 먼저 경기 기록을 입력해주세요.",
    }, { status: 400 });
  }

  // 템플릿 기반 즉시 생성 (AI 호출 없음)
  const summary = generateMatchSummaryFromTemplate(input);

  const updatePayload: Record<string, unknown> = {
    ai_summary: summary,
    ai_summary_generated_at: new Date().toISOString(),
    ai_summary_model: "template",
  };
  if (isRegenerate) {
    const currentCount = (match as Record<string, unknown>).ai_summary_regenerate_count as number ?? 0;
    updatePayload.ai_summary_regenerate_count = currentCount + 1;
  }
  const { error: dbErr } = await db.from("matches").update(updatePayload).eq("id", matchId);
  if (dbErr) {
    console.error("[match-summary] DB 저장 실패:", dbErr.message);
  }

  // 기존 클라이언트(SSE consumeSseStream) 호환 — SSE 이벤트 스트림으로 응답
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      try {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "replace", text: summary, source: "template" })}\n\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done", source: "template" })}\n\n`));
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
