import { getSupabaseAdmin } from "@/lib/supabase/admin";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type DashboardData = {
  upcomingMatch: {
    id: string;
    match_date: string;
    match_time: string | null;
    opponent_name: string | null;
    location: string | null;
  } | null;
  recentResult: {
    id: string;
    date: string;
    score: string;
    opponent: string | null;
    mvp: string | null;
  } | null;
  activeVotes: { id: string; title: string; due: string }[];
  tasks: string[];
};

export async function getDashboardData(teamId: string, userId: string): Promise<DashboardData> {
  const db = getSupabaseAdmin();
  if (!db) return { upcomingMatch: null, recentResult: null, activeVotes: [], tasks: [] };

  const now = new Date().toISOString();

  const [upcomingRes, recentRes, activeVotesRes] = await Promise.all([
    db.from("matches")
      .select("*")
      .eq("team_id", teamId)
      .eq("status", "SCHEDULED")
      .gte("match_date", new Date().toISOString().split("T")[0])
      .order("match_date", { ascending: true })
      .limit(1)
      .maybeSingle(),
    db.from("matches")
      .select("*")
      .eq("team_id", teamId)
      .eq("status", "COMPLETED")
      .order("match_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db.from("matches")
      .select("id, match_date, vote_deadline, opponent_name")
      .eq("team_id", teamId)
      .eq("status", "SCHEDULED")
      .gt("vote_deadline", now)
      .order("vote_deadline", { ascending: true })
      .limit(5),
  ]);

  const upcomingMatch = upcomingRes.data ?? null;
  const recentMatch = recentRes.data ?? null;

  let recentResult = null;
  if (recentMatch) {
    const [goalsRes, mvpRes] = await Promise.all([
      db.from("match_goals").select("scorer_id").eq("match_id", recentMatch.id),
      db.from("match_mvp_votes").select("candidate_id, users:candidate_id(name)").eq("match_id", recentMatch.id),
    ]);
    const goalRows = (goalsRes.data || []) as any[];
    const ourGoals = goalRows.filter((g) => g.scorer_id !== "OPPONENT").length;
    const oppGoals = goalRows.filter((g) => g.scorer_id === "OPPONENT").length;

    const mvpCounts: Record<string, { count: number; name: string }> = {};
    const voteRows = (mvpRes.data || []) as any[];
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

  const activeVotes = ((activeVotesRes.data || []) as any[]).map((m) => ({
    id: m.id,
    title: `${m.match_date} 경기 참석 투표`,
    due: m.vote_deadline,
  }));

  // Check pending tasks
  const tasks: string[] = [];
  const taskChecks = await Promise.all([
    upcomingMatch
      ? db.from("match_attendance").select("vote").eq("match_id", upcomingMatch.id).eq("user_id", userId).maybeSingle()
      : Promise.resolve({ data: true }),
    recentMatch
      ? db.from("match_mvp_votes").select("id").eq("match_id", recentMatch.id).eq("voter_id", userId).maybeSingle()
      : Promise.resolve({ data: true }),
  ]);
  if (upcomingMatch && !taskChecks[0].data) tasks.push("다음 경기 참석 투표 완료하기");
  if (recentMatch && !taskChecks[1].data) tasks.push("최근 경기 MVP 투표 완료하기");

  return { upcomingMatch, recentResult, activeVotes, tasks };
}
