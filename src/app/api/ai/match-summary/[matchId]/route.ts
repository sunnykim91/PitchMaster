import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getOrGenerateMatchSummary } from "@/lib/server/aiMatchSummaryCache";
import { checkRateLimit } from "@/lib/server/aiUsageLog";
import type { MatchSummaryInput } from "@/lib/server/aiMatchSummary";

/**
 * POST /api/ai/match-summary/[matchId]
 * AI 경기 후기 재생성. 김선휘 Feature Flag 전용.
 *
 * 기존 캐시된 후기를 무시하고 새로 생성 (forceRegenerate: true).
 * 레이트리밋 체크.
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

  const rate = await checkRateLimit("match_summary", session.user.id, session.user.teamId ?? null);
  if (!rate.allowed) {
    return NextResponse.json({
      error: "rate_limited",
      message: `경기 후기 생성은 하루 ${rate.cap}회까지 가능합니다.`,
    }, { status: 429 });
  }

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "db_unavailable" }, { status: 503 });

  // 경기 데이터 조회 (팀 검증 포함)
  const { data: match } = await db
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .eq("team_id", session.user.teamId!)
    .single();

  if (!match) {
    return NextResponse.json({ error: "match_not_found" }, { status: 404 });
  }

  // MatchSummaryInput 조립 — getMatchDetailData의 로직 간소화 버전
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
  };

  const summary = await getOrGenerateMatchSummary({
    matchId,
    cachedSummary: null,
    cachedGeneratedAt: null,
    enableGenerate: true,
    input,
    userId: session.user.id,
    teamId: session.user.teamId!,
    forceRegenerate: true,
  });

  if (!summary) {
    return NextResponse.json({ error: "generation_failed" }, { status: 502 });
  }

  return NextResponse.json({ summary });
}
