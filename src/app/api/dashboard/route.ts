import { NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const now = new Date().toISOString();

  // 1-3. Fetch upcoming match, recent completed match, and active votes in parallel
  const [
    { data: upcomingMatch },
    { data: recentMatch },
    { data: activeVoteMatches },
  ] = await Promise.all([
    db
      .from("matches")
      .select("*")
      .eq("team_id", ctx.teamId)
      .eq("status", "SCHEDULED")
      .gte("match_date", new Date().toISOString().split("T")[0])
      .order("match_date", { ascending: true })
      .limit(1)
      .maybeSingle(),
    db
      .from("matches")
      .select("*")
      .eq("team_id", ctx.teamId)
      .eq("status", "COMPLETED")
      .order("match_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("matches")
      .select("id, match_date, vote_deadline, opponent_name")
      .eq("team_id", ctx.teamId)
      .eq("status", "SCHEDULED")
      .gt("vote_deadline", now)
      .order("vote_deadline", { ascending: true })
      .limit(5),
  ]);

  const voteMatchRows = (activeVoteMatches || []) as any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  const activeVotes = voteMatchRows.map((m) => ({
    id: m.id,
    title: `${m.match_date} 경기 참석 투표`,
    due: m.vote_deadline,
  }));

  // 4. Fetch goals+mvp for recent match AND task checks in parallel
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [goalsResult, mvpResult, userVoteResult, userMvpVoteResult] = await Promise.all([
    recentMatch
      ? db.from("match_goals").select("*, scorer:scorer_id(name)").eq("match_id", recentMatch.id)
      : Promise.resolve({ data: [] }),
    recentMatch
      ? db.from("match_mvp_votes").select("candidate_id, users:candidate_id(name)").eq("match_id", recentMatch.id)
      : Promise.resolve({ data: [] }),
    upcomingMatch
      ? db.from("match_attendance").select("vote").eq("match_id", upcomingMatch.id).eq("user_id", ctx.userId).maybeSingle()
      : Promise.resolve({ data: null }),
    recentMatch
      ? db.from("match_mvp_votes").select("id").eq("match_id", recentMatch.id).eq("voter_id", ctx.userId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  let recentResult = null;
  if (recentMatch) {
    const goalRows = (goalsResult.data || []) as any[];
    const ourGoals = goalRows.filter((g) => g.scorer_id !== "OPPONENT" && !g.is_own_goal).length;
    const oppGoals = goalRows.filter((g) => g.scorer_id === "OPPONENT" || g.is_own_goal).length;

    const mvpCounts: Record<string, { count: number; name: string }> = {};
    const voteRows = (mvpResult.data || []) as any[];
    voteRows.forEach((v) => {
      const id = v.candidate_id;
      const name = Array.isArray(v.users) ? v.users[0]?.name : v.users?.name;
      if (!mvpCounts[id]) mvpCounts[id] = { count: 0, name: name || "" };
      mvpCounts[id].count++;
    });
    const topMvp = Object.values(mvpCounts).sort((a, b) => b.count - a.count)[0];

    recentResult = {
      id: recentMatch.id,
      date: recentMatch.match_date,
      score: `${ourGoals} : ${oppGoals}`,
      opponent: recentMatch.opponent_name,
      mvp: topMvp?.name || null,
    };
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  // 5. Build pending tasks list
  const tasks: string[] = [];
  if (upcomingMatch && !userVoteResult.data) {
    tasks.push("다음 경기 참석 투표 완료하기");
  }
  if (recentMatch && !userMvpVoteResult.data) {
    tasks.push("최근 경기 MVP 투표 완료하기");
  }

  return apiSuccess({
    upcomingMatch,
    recentResult,
    activeVotes,
    tasks,
  });
}
