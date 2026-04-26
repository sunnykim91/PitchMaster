import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * 특정 상대팀과의 우리 팀 전적 조회.
 *
 * GET /api/team-stats/opponent?name=FC서순
 *
 * 응답:
 *   {
 *     opponentName, played, won, drawn, lost,
 *     goalsFor, goalsAgainst,
 *     recentScores: [{ date, us, opp, result, matchId }, ... 최근 5경기]
 *   }
 *
 * stats_included=false 자체전·이벤트는 제외 (커리어 통계와 동일 정책).
 * 정확한 opponent_name 일치 + 같은 team_id 만.
 */
export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const opponent = request.nextUrl.searchParams.get("name")?.trim();
  if (!opponent) return apiError("opponent name required", 400);

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // 동일 opponent_name 의 완료 경기 (정확 일치)
  const { data: matches } = await db
    .from("matches")
    .select("id, match_date, opponent_name")
    .eq("team_id", ctx.teamId)
    .eq("status", "COMPLETED")
    .eq("opponent_name", opponent)
    .neq("stats_included", false)
    .order("match_date", { ascending: false });

  type MatchRow = { id: string; match_date: string; opponent_name: string };
  const matchRows = (matches ?? []) as MatchRow[];

  if (matchRows.length === 0) {
    return apiSuccess({
      opponentName: opponent,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      recentScores: [],
    });
  }

  // 골 데이터로 스코어 집계
  const matchIds = matchRows.map((m) => m.id);
  const { data: goalsData } = await db
    .from("match_goals")
    .select("match_id, scorer_id, is_own_goal")
    .in("match_id", matchIds);

  type GoalRow = { match_id: string; scorer_id: string | null; is_own_goal: boolean | null };
  const goalRows = (goalsData ?? []) as GoalRow[];

  const scoreByMatch = new Map<string, { our: number; opp: number }>();
  for (const g of goalRows) {
    const s = scoreByMatch.get(g.match_id) ?? { our: 0, opp: 0 };
    if (g.scorer_id === "OPPONENT" || g.is_own_goal === true) s.opp++;
    else s.our++;
    scoreByMatch.set(g.match_id, s);
  }

  let won = 0, drawn = 0, lost = 0;
  let goalsFor = 0, goalsAgainst = 0;
  const recentScores: Array<{
    matchId: string;
    date: string;
    us: number;
    opp: number;
    result: "W" | "D" | "L";
  }> = [];

  for (const m of matchRows) {
    const s = scoreByMatch.get(m.id) ?? { our: 0, opp: 0 };
    goalsFor += s.our;
    goalsAgainst += s.opp;
    const result: "W" | "D" | "L" = s.our > s.opp ? "W" : s.our < s.opp ? "L" : "D";
    if (result === "W") won++;
    else if (result === "D") drawn++;
    else lost++;
    if (recentScores.length < 5) {
      recentScores.push({ matchId: m.id, date: m.match_date, us: s.our, opp: s.opp, result });
    }
  }

  return apiSuccess({
    opponentName: opponent,
    played: matchRows.length,
    won,
    drawn,
    lost,
    goalsFor,
    goalsAgainst,
    recentScores,
  });
}
