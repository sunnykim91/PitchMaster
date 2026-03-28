import { NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function GET() {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const now = new Date().toISOString();
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const today = kstNow.toISOString().split("T")[0];

  // 날짜 지난 SCHEDULED 경기 → 자동 COMPLETED 처리
  await db
    .from("matches")
    .update({ status: "COMPLETED" })
    .eq("team_id", ctx.teamId)
    .eq("status", "SCHEDULED")
    .lt("match_date", today);

  const [upcomingRes, recentRes, activeVotesRes] = await Promise.all([
    db.from("matches")
      .select("id, match_date, match_time, vote_deadline, opponent_name, status, location")
      .eq("team_id", ctx.teamId)
      .eq("status", "SCHEDULED")
      .gte("match_date", today)
      .order("match_date", { ascending: true })
      .limit(1)
      .maybeSingle(),
    db.from("matches")
      .select("id, match_date, opponent_name, status")
      .eq("team_id", ctx.teamId)
      .eq("status", "COMPLETED")
      .order("match_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db.from("matches")
      .select("id, match_date, vote_deadline, opponent_name")
      .eq("team_id", ctx.teamId)
      .eq("status", "SCHEDULED")
      .gt("vote_deadline", now)
      .order("vote_deadline", { ascending: true })
      .limit(5),
  ]);

  const upcomingRaw = upcomingRes.data ?? null;
  const recentMatch = recentRes.data ?? null;

  // 예정 경기 투표 현황 + 내 투표
  let upcomingMatch: any = null;
  if (upcomingRaw) {
    const [votesRes, myMemberRes, guestsRes] = await Promise.all([
      db.from("match_attendance").select("vote, user_id, member_id").eq("match_id", upcomingRaw.id),
      db.from("team_members").select("id").eq("user_id", ctx.userId).limit(1).maybeSingle(),
      db.from("match_guests").select("id").eq("match_id", upcomingRaw.id),
    ]);
    const voteList = (votesRes.data ?? []) as { vote: string; user_id: string | null; member_id: string | null }[];
    const voteCounts = {
      attend: voteList.filter((v) => v.vote === "ATTEND").length,
      absent: voteList.filter((v) => v.vote === "ABSENT").length,
      undecided: voteList.filter((v) => v.vote === "MAYBE").length,
    };
    const myMemberId = myMemberRes.data?.id ?? null;
    const myVoteRow = voteList.find((v) => v.user_id === ctx.userId || v.member_id === myMemberId);
    const myVote = myVoteRow ? myVoteRow.vote : null;
    const guestCount = guestsRes.data?.length ?? 0;
    upcomingMatch = { ...upcomingRaw, voteCounts, myVote, myMemberId, guestCount };
  }

  // 최근 경기 결과
  let recentResult = null;
  if (recentMatch) {
    const [goalsRes, mvpRes] = await Promise.all([
      db.from("match_goals").select("scorer_id, is_own_goal").eq("match_id", recentMatch.id),
      db.from("match_mvp_votes").select("candidate_id, users:candidate_id(name)").eq("match_id", recentMatch.id),
    ]);
    type GoalRow = { scorer_id: string; is_own_goal: boolean };
    const goalRows = (goalsRes.data || []) as GoalRow[];
    const ourGoals = goalRows.filter((g: GoalRow) => g.scorer_id !== "OPPONENT" && !g.is_own_goal).length;
    const oppGoals = goalRows.filter((g: GoalRow) => g.scorer_id === "OPPONENT" || g.is_own_goal).length;

    const mvpCounts: Record<string, { count: number; name: string }> = {};
    const voteRows = (mvpRes.data || []) as any[];
    voteRows.forEach((v: any) => {
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

  type VoteMatchRow = { id: string; match_date: string; vote_deadline: string };
  const activeVotes = ((activeVotesRes.data || []) as VoteMatchRow[]).map((m) => ({
    id: m.id,
    title: `${m.match_date} 경기 참석 투표`,
    due: m.vote_deadline,
  }));

  // 할 일
  const tasks: string[] = [];
  const [userVoteResult, userMvpVoteResult] = await Promise.all([
    upcomingMatch
      ? db.from("match_attendance").select("vote").eq("match_id", upcomingMatch.id).eq("user_id", ctx.userId).maybeSingle()
      : Promise.resolve({ data: null }),
    recentMatch
      ? db.from("match_mvp_votes").select("id").eq("match_id", recentMatch.id).eq("voter_id", ctx.userId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (upcomingMatch && !userVoteResult.data) tasks.push("다음 경기 참석 투표 완료하기");
  if (recentMatch && !userMvpVoteResult.data) tasks.push("최근 경기 MVP 투표 완료하기");

  // 팀 전적 (활성 시즌 기준)
  const { data: seasonList } = await db
    .from("seasons")
    .select("start_date, end_date, is_active")
    .eq("team_id", ctx.teamId)
    .order("start_date", { ascending: false });

  const currentSeason = (seasonList ?? []).find((s: any) => s.is_active) ?? (seasonList ?? [])[0];

  let completedQ = db
    .from("matches")
    .select("id")
    .eq("team_id", ctx.teamId)
    .eq("status", "COMPLETED")
    .eq("match_type", "REGULAR")
    .order("match_date", { ascending: false });

  if (currentSeason) {
    completedQ = completedQ
      .gte("match_date", currentSeason.start_date)
      .lte("match_date", currentSeason.end_date);
  }

  const { data: completedMatches } = await completedQ;

  const completedIds = (completedMatches ?? []).map((m: any) => m.id);
  let teamRecord = { wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, recent5: [] as string[] };

  if (completedIds.length > 0) {
    const { data: allGoals } = await db
      .from("match_goals")
      .select("match_id, scorer_id, is_own_goal")
      .in("match_id", completedIds);

    const matchScores = new Map<string, { our: number; opp: number }>();
    for (const g of (allGoals ?? []) as any[]) {
      if (!matchScores.has(g.match_id)) matchScores.set(g.match_id, { our: 0, opp: 0 });
      const s = matchScores.get(g.match_id)!;
      if (g.scorer_id === "OPPONENT" || g.is_own_goal) s.opp++;
      else s.our++;
    }

    let wins = 0, draws = 0, losses = 0, gf = 0, ga = 0;
    const results: string[] = [];

    for (const mid of completedIds) {
      const s = matchScores.get(mid) ?? { our: 0, opp: 0 };
      gf += s.our;
      ga += s.opp;
      if (s.our > s.opp) { wins++; results.push("W"); }
      else if (s.our === s.opp) { draws++; results.push("D"); }
      else { losses++; results.push("L"); }
    }

    teamRecord = { wins, draws, losses, goalsFor: gf, goalsAgainst: ga, recent5: results.slice(0, 5) };
  }

  // ── 오늘 생일인 팀원 조회 (KST 기준) ──
  const todayMD = today.slice(5); // "MM-DD"
  const { data: birthdayRows } = await db
    .from("team_members")
    .select("users(name, birth_date, profile_image_url)")
    .eq("team_id", ctx.teamId)
    .eq("status", "ACTIVE");

  const birthdayMembers = ((birthdayRows ?? []) as any[])
    .filter((row: any) => {
      const u = Array.isArray(row.users) ? row.users[0] : row.users;
      const bd = u?.birth_date;
      return bd && bd.slice(5) === todayMD;
    })
    .map((row: any) => {
      const u = Array.isArray(row.users) ? row.users[0] : row.users;
      return {
        name: u.name,
        birthDate: u.birth_date,
        profileImageUrl: u.profile_image_url ?? null,
      };
    });

  return apiSuccess({
    upcomingMatch,
    recentResult,
    activeVotes,
    tasks,
    teamRecord,
    birthdayMembers,
  });
}
