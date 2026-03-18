import { NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const now = new Date().toISOString();

  // 1. Upcoming match (next SCHEDULED match)
  const { data: upcomingMatch } = await db
    .from("matches")
    .select("*")
    .eq("team_id", ctx.teamId)
    .eq("status", "SCHEDULED")
    .gte("match_date", new Date().toISOString().split("T")[0])
    .order("match_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  // 2. Most recent COMPLETED match
  const { data: recentMatch } = await db
    .from("matches")
    .select("*")
    .eq("team_id", ctx.teamId)
    .eq("status", "COMPLETED")
    .order("match_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  let recentResult = null;
  if (recentMatch) {
    // Get goals for recent match
    const { data: goals } = await db
      .from("match_goals")
      .select("*, scorer:scorer_id(name)")
      .eq("match_id", recentMatch.id);

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const goalRows = (goals || []) as any[];
    const ourGoals = goalRows.filter((g) => g.scorer_id !== "OPPONENT" && !g.is_own_goal).length;
    const oppGoals = goalRows.filter((g) => g.scorer_id === "OPPONENT" || g.is_own_goal).length;

    // Get MVP
    const { data: mvpVotes } = await db
      .from("match_mvp_votes")
      .select("candidate_id, users:candidate_id(name)")
      .eq("match_id", recentMatch.id);

    const mvpCounts: Record<string, { count: number; name: string }> = {};
    const voteRows = (mvpVotes || []) as any[];
    voteRows.forEach((v) => {
      const id = v.candidate_id;
      const name = Array.isArray(v.users) ? v.users[0]?.name : v.users?.name;
      if (!mvpCounts[id]) mvpCounts[id] = { count: 0, name: name || "" };
      mvpCounts[id].count++;
    });
    const topMvp = Object.values(mvpCounts).sort((a, b) => b.count - a.count)[0];
    /* eslint-enable @typescript-eslint/no-explicit-any */

    recentResult = {
      id: recentMatch.id,
      date: recentMatch.match_date,
      score: `${ourGoals} : ${oppGoals}`,
      opponent: recentMatch.opponent_name,
      mvp: topMvp?.name || null,
    };
  }

  // 3. Active votes (matches with vote_deadline in the future)
  const { data: activeVoteMatches } = await db
    .from("matches")
    .select("id, match_date, vote_deadline, opponent_name")
    .eq("team_id", ctx.teamId)
    .eq("status", "SCHEDULED")
    .gt("vote_deadline", now)
    .order("vote_deadline", { ascending: true })
    .limit(5);

  const voteMatchRows = (activeVoteMatches || []) as any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  const activeVotes = voteMatchRows.map((m) => ({
    id: m.id,
    title: `${m.match_date} 경기 참석 투표`,
    due: m.vote_deadline,
  }));

  // 4. Check user's pending tasks
  const tasks: string[] = [];

  // Check if user voted for upcoming match
  if (upcomingMatch) {
    const { data: userVote } = await db
      .from("match_attendance")
      .select("vote")
      .eq("match_id", upcomingMatch.id)
      .eq("user_id", ctx.userId)
      .maybeSingle();
    if (!userVote) {
      tasks.push("다음 경기 참석 투표 완료하기");
    }
  }

  // Check MVP votes for recent completed match
  if (recentMatch) {
    const { data: userMvpVote } = await db
      .from("match_mvp_votes")
      .select("id")
      .eq("match_id", recentMatch.id)
      .eq("voter_id", ctx.userId)
      .maybeSingle();
    if (!userMvpVote) {
      tasks.push("최근 경기 MVP 투표 완료하기");
    }
  }

  return apiSuccess({
    upcomingMatch,
    recentResult,
    activeVotes,
    tasks,
  });
}
