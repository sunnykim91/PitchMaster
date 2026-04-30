import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * GET /api/admin/usage — AI 사용량 집계 (관리자 전용)
 *
 * 응답:
 *  - last30d: 최근 30일 AI 호출 통계
 *    - totalCalls / aiCalls / ruleCalls / errorCalls
 *    - byFeature: { feature: count }
 *    - byTeam: 상위 20팀 (team_id, team_name, count)
 *    - dailyTrend: 일별 호출수 (최근 30일)
 *    - costEstimate: 토큰 사용량 기반 비용 추정 ($)
 *  - allTime: 누적 통계 (단순)
 */
export async function GET() {
  const session = await auth();
  if (!session || session.user.name !== "김선휘") {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ ok: false, error: "no_db" }, { status: 500 });

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // 최근 30일 모든 호출
  const { data: rows, error } = await db
    .from("ai_usage_log")
    .select("feature, source, team_id, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens, error_reason, created_at")
    .gte("created_at", thirtyDaysAgo.toISOString());

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // ── 집계 ──
  let totalCalls = 0, aiCalls = 0, ruleCalls = 0, errorCalls = 0;
  const byFeature: Record<string, number> = {};
  const byTeamMap: Record<string, number> = {};
  const dailyMap: Record<string, number> = {};
  let totalInput = 0, totalOutput = 0, totalCacheRead = 0, totalCacheCreation = 0;

  for (const r of rows ?? []) {
    totalCalls++;
    if (r.source === "ai") aiCalls++;
    else if (r.source === "rule") ruleCalls++;
    else if (r.source === "error") errorCalls++;

    byFeature[r.feature] = (byFeature[r.feature] ?? 0) + 1;
    if (r.team_id) byTeamMap[r.team_id] = (byTeamMap[r.team_id] ?? 0) + 1;

    const day = (r.created_at as string).slice(0, 10);
    dailyMap[day] = (dailyMap[day] ?? 0) + 1;

    totalInput += r.input_tokens ?? 0;
    totalOutput += r.output_tokens ?? 0;
    totalCacheRead += r.cache_read_tokens ?? 0;
    totalCacheCreation += r.cache_creation_tokens ?? 0;
  }

  // 상위 20팀 — team_name 조인
  const topTeamIds = Object.entries(byTeamMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([id]) => id);

  let teamNames: Record<string, string> = {};
  if (topTeamIds.length > 0) {
    const { data: teams } = await db
      .from("teams")
      .select("id, name")
      .in("id", topTeamIds);
    teamNames = Object.fromEntries((teams ?? []).map((t) => [t.id, t.name]));
  }

  const byTeam = topTeamIds.map((id) => ({
    teamId: id,
    teamName: teamNames[id] ?? "(삭제됨)",
    count: byTeamMap[id],
  }));

  // 일별 추이 — 30일 모두 채우기 (없는 날은 0)
  const dailyTrend: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    dailyTrend.push({ date: key, count: dailyMap[key] ?? 0 });
  }

  // 비용 추정 — Haiku 4.5 기준 ($1/M input, $5/M output, $0.10/M cache read, $1.25/M cache creation)
  // 참고: https://www.anthropic.com/pricing
  const costEstimate =
    (totalInput / 1_000_000) * 1.0 +
    (totalOutput / 1_000_000) * 5.0 +
    (totalCacheRead / 1_000_000) * 0.1 +
    (totalCacheCreation / 1_000_000) * 1.25;

  // ── 누적 통계 (간단) ──
  const { count: allTimeCount } = await db
    .from("ai_usage_log")
    .select("id", { count: "exact", head: true });

  return NextResponse.json({
    ok: true,
    data: {
      last30d: {
        totalCalls,
        aiCalls,
        ruleCalls,
        errorCalls,
        byFeature,
        byTeam,
        dailyTrend,
        tokens: {
          input: totalInput,
          output: totalOutput,
          cacheRead: totalCacheRead,
          cacheCreation: totalCacheCreation,
        },
        costEstimateUSD: Math.round(costEstimate * 100) / 100,
      },
      allTime: {
        totalCalls: allTimeCount ?? 0,
      },
    },
  });
}
