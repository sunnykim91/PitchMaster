import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMonthlyTeamUsage, type AiFeature } from "@/lib/server/aiUsageLog";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * GET /api/ai/usage?feature=tactics&matchId=xxx
 * UI에서 AI 사용 현황 표시용.
 *
 * Response:
 *   { monthlyCount, monthlyCap, matchUsed, regenerateCount }
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const feature = searchParams.get("feature") as AiFeature | null;
  const matchId = searchParams.get("matchId");

  if (!feature) {
    return NextResponse.json({ error: "feature required" }, { status: 400 });
  }

  const teamId = session.user.teamId ?? null;

  // 팀 월 사용량
  const monthly = teamId ? await getMonthlyTeamUsage(feature, teamId) : null;

  // 이 경기에서 이미 사용했는지
  let matchUsed = false;
  if (matchId && teamId) {
    const db = getSupabaseAdmin();
    if (db) {
      const { count } = await db
        .from("ai_usage_log")
        .select("id", { count: "exact", head: true })
        .eq("match_id", matchId)
        .eq("feature", feature)
        .eq("team_id", teamId)
        .eq("source", "ai");
      matchUsed = (count ?? 0) > 0;
    }
  }

  // 경기 후기 재생성 횟수
  let regenerateCount: number | null = null;
  if (matchId && feature === "match_summary" && teamId) {
    const db = getSupabaseAdmin();
    if (db) {
      const { data } = await db
        .from("matches")
        .select("ai_summary_regenerate_count")
        .eq("id", matchId)
        .eq("team_id", teamId)
        .single();
      regenerateCount = (data as Record<string, unknown>)?.ai_summary_regenerate_count as number ?? 0;
    }
  }

  return NextResponse.json({
    monthlyCount: monthly?.count ?? null,
    monthlyCap: monthly?.cap ?? null,
    matchUsed,
    regenerateCount,
  });
}
