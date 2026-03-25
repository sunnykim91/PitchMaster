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

  // 병렬 쿼리
  const [teamsRes, usersRes, matchesRes, postsRes, joinReqRes, recentUsersRes] =
    await Promise.all([
      // 전체 팀 목록
      db
        .from("teams")
        .select("id, name, sport_type, created_at, is_searchable"),
      // 전체 유저
      db.from("users").select("id, name, created_at, is_profile_complete", {
        count: "exact",
      }),
      // 전체 경기
      db.from("matches").select("id, team_id, match_date, status, created_at"),
      // 전체 게시글 수
      db.from("posts").select("id, team_id, created_at", { count: "exact" }),
      // 대기 중 가입 신청
      db
        .from("team_join_requests")
        .select("id, team_id, name, status, created_at")
        .eq("status", "PENDING"),
      // 최근 7일 가입 유저
      db
        .from("users")
        .select("id", { count: "exact" })
        .gte(
          "created_at",
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        ),
    ]);

  const teams = teamsRes.data ?? [];
  const users = usersRes.data ?? [];
  const matches = matchesRes.data ?? [];
  const posts = postsRes.data ?? [];
  const pendingRequests = joinReqRes.data ?? [];

  // 팀별 멤버 수
  const memberCounts: Record<string, number> = {};
  for (const team of teams) {
    const { count } = await db
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("team_id", team.id)
      .eq("status", "ACTIVE");
    memberCounts[team.id] = count ?? 0;
  }

  // 팀별 경기 수 & 최근 경기일
  const teamMatchInfo: Record<
    string,
    { count: number; lastMatch: string | null }
  > = {};
  for (const team of teams) {
    const teamMatches = matches.filter(
      (m: { team_id: string }) => m.team_id === team.id
    );
    teamMatchInfo[team.id] = {
      count: teamMatches.length,
      lastMatch:
        teamMatches.length > 0
          ? teamMatches.sort(
              (
                a: { match_date: string },
                b: { match_date: string }
              ) => b.match_date.localeCompare(a.match_date)
            )[0].match_date
          : null,
    };
  }

  // 팀별 게시글 수
  const teamPostCounts: Record<string, number> = {};
  for (const p of posts) {
    teamPostCounts[p.team_id] = (teamPostCounts[p.team_id] ?? 0) + 1;
  }

  // 최근 7일 활성 팀 (경기 등록 or 투표 발생)
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();
  const recentMatches = matches.filter(
    (m: { created_at: string }) => m.created_at >= sevenDaysAgo
  );
  const activeTeamIds = new Set(
    recentMatches.map((m: { team_id: string }) => m.team_id)
  );

  // 최근 7일 투표 발생한 팀도 활성으로 카운트
  const { data: recentVotes } = await db
    .from("match_attendance")
    .select("match_id")
    .gte("created_at", sevenDaysAgo);
  if (recentVotes) {
    const voteMatchIds = new Set(
      recentVotes.map((v: { match_id: string }) => v.match_id)
    );
    for (const m of matches) {
      if (voteMatchIds.has(m.id)) activeTeamIds.add(m.team_id);
    }
  }

  // 팀별 대기 가입 신청 수
  const teamPendingCounts: Record<string, number> = {};
  for (const r of pendingRequests) {
    teamPendingCounts[r.team_id] = (teamPendingCounts[r.team_id] ?? 0) + 1;
  }

  // 팀 상세 리스트 (활성도 포함)
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
    .sort((a, b) => b.memberCount - a.memberCount); // 멤버 수 내림차순

  return NextResponse.json({
    overview: {
      totalTeams: teams.length,
      totalUsers: usersRes.count ?? users.length,
      profileComplete: users.filter(
        (u: { is_profile_complete: boolean }) => u.is_profile_complete
      ).length,
      newUsersThisWeek: recentUsersRes.count ?? 0,
      totalMatches: matches.length,
      totalPosts: postsRes.count ?? posts.length,
      activeTeams: activeTeamIds.size,
      pendingJoinRequests: pendingRequests.length,
    },
    teams: teamDetails,
    pendingRequests: pendingRequests.map(
      (r: {
        id: string;
        team_id: string;
        name: string;
        created_at: string;
      }) => ({
        id: r.id,
        teamId: r.team_id,
        teamName:
          teams.find((t) => t.id === r.team_id)?.name ?? "알 수 없음",
        name: r.name,
        createdAt: r.created_at,
      })
    ),
  });
}
