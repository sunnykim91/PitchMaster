import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const session = await auth();
  if (!session || session.user.name !== "김선휘") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "DB not available" }, { status: 503 });
  }

  const DEMO_TEAM_ID = "192127c0-e2be-46b4-b340-7583730467da";
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // 전체 병렬 쿼리 (개별 팀 쿼리 제거)
  const [teamsRes, usersRes, matchesRes, postsRes, joinReqRes, recentUsersRes, membersRes, demoMembersRes, recentVotesRes] =
    await Promise.all([
      db.from("teams").select("id, name, sport_type, created_at, is_searchable"),
      db.from("users").select("id, name, created_at, is_profile_complete", { count: "exact" }),
      db.from("matches").select("id, team_id, match_date, status, created_at"),
      db.from("posts").select("id, team_id, created_at", { count: "exact" }),
      db.from("team_join_requests").select("id, team_id, name, status, created_at").eq("status", "PENDING"),
      db.from("users").select("id", { count: "exact" }).gte("created_at", sevenDaysAgo),
      // 전체 멤버 한 번에 조회 (팀별 개별 쿼리 제거)
      db.from("team_members").select("team_id, status"),
      // 데모 멤버
      db.from("team_members").select("user_id").eq("team_id", DEMO_TEAM_ID).not("user_id", "is", null),
      // 최근 투표
      db.from("match_attendance").select("match_id").gte("created_at", sevenDaysAgo),
    ]);

  // 데모 제외
  const demoMemberIds = new Set<string>();
  for (const m of demoMembersRes.data ?? []) if (m.user_id) demoMemberIds.add(m.user_id);

  const teams = (teamsRes.data ?? []).filter((t) => t.id !== DEMO_TEAM_ID);
  const users = (usersRes.data ?? []).filter((u: { id: string }) => !demoMemberIds.has(u.id));
  const matches = (matchesRes.data ?? []).filter((m: { team_id: string }) => m.team_id !== DEMO_TEAM_ID);
  const posts = postsRes.data ?? [];
  const pendingRequests = joinReqRes.data ?? [];

  // 팀별 멤버 수 (1번 쿼리로 집계)
  const memberCounts: Record<string, number> = {};
  for (const m of membersRes.data ?? []) {
    if (m.status === "ACTIVE" && m.team_id !== DEMO_TEAM_ID) {
      memberCounts[m.team_id] = (memberCounts[m.team_id] ?? 0) + 1;
    }
  }

  // 팀별 경기 수 & 최근 경기일
  const teamMatchInfo: Record<string, { count: number; lastMatch: string | null }> = {};
  for (const team of teams) {
    const teamMatches = matches.filter((m: { team_id: string }) => m.team_id === team.id);
    teamMatchInfo[team.id] = {
      count: teamMatches.length,
      lastMatch: teamMatches.length > 0
        ? teamMatches.sort((a: { match_date: string }, b: { match_date: string }) => b.match_date.localeCompare(a.match_date))[0].match_date
        : null,
    };
  }

  // 팀별 게시글 수
  const teamPostCounts: Record<string, number> = {};
  for (const p of posts) {
    teamPostCounts[p.team_id] = (teamPostCounts[p.team_id] ?? 0) + 1;
  }

  // 활성 팀 (경기 등록 or 투표)
  const recentMatches = matches.filter((m: { created_at: string }) => m.created_at >= sevenDaysAgo);
  const activeTeamIds = new Set(recentMatches.map((m: { team_id: string }) => m.team_id));

  if (recentVotesRes.data) {
    const voteMatchIds = new Set(recentVotesRes.data.map((v: { match_id: string }) => v.match_id));
    for (const m of matches) {
      if (voteMatchIds.has(m.id)) activeTeamIds.add(m.team_id);
    }
  }

  // 팀별 대기 가입 신청 수
  const teamPendingCounts: Record<string, number> = {};
  for (const r of pendingRequests) {
    teamPendingCounts[r.team_id] = (teamPendingCounts[r.team_id] ?? 0) + 1;
  }

  const teamDetails = teams
    .map((team) => ({
      id: team.id,
      name: team.name,
      sportType: team.sport_type,
      isSearchable: team.is_searchable,
      createdAt: team.created_at,
      memberCount: memberCounts[team.id] ?? 0,
      matchCount: teamMatchInfo[team.id]?.count ?? 0,
      lastMatch: teamMatchInfo[team.id]?.lastMatch ?? null,
      postCount: teamPostCounts[team.id] ?? 0,
      pendingRequests: teamPendingCounts[team.id] ?? 0,
      isActive: activeTeamIds.has(team.id),
    }))
    .sort((a, b) => b.memberCount - a.memberCount);

  return NextResponse.json({
    overview: {
      totalTeams: teams.length,
      totalUsers: users.length,
      profileComplete: users.filter((u: { is_profile_complete: boolean }) => u.is_profile_complete).length,
      newUsersThisWeek: recentUsersRes.count ?? 0,
      totalMatches: matches.length,
      totalPosts: postsRes.count ?? posts.length,
      activeTeams: activeTeamIds.size,
      pendingJoinRequests: pendingRequests.length,
    },
    teams: teamDetails,
    pendingRequests: pendingRequests.map((r: { id: string; team_id: string; name: string; created_at: string }) => ({
      id: r.id,
      teamId: r.team_id,
      teamName: teams.find((t) => t.id === r.team_id)?.name ?? "알 수 없음",
      name: r.name,
      createdAt: r.created_at,
    })),
  });
}
