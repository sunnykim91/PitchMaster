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
  // 어드민 통계에서 제외할 팀 — 데모 + 본인/지인/테스트 팀
  // (참고: memory/reference_internal_team_exclusion.md)
  const EXCLUDED_TEAM_IDS = new Set<string>([
    DEMO_TEAM_ID,
    "c743835e-a3c5-4949-98d4-90aee30d4ff5", // FCMZ (본인)
    "020db2ac-531c-4c74-916b-48eb45fe9a98", // FCMZ 풋살 (본인)
    "f1678029-1b44-4a80-93fc-0a6036bbaba2", // FK Rebirth (지인)
    "b55ba657-b8bb-4e07-aead-72d265b51247", // fc jsy (알파 테스트 더미)
    "dc022d7e-5952-48f2-9db9-35708e6fb075", // 에스케이디앤디 (알파 테스트 더미)
  ]);
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  // 전체 병렬 쿼리 (개별 팀 쿼리 제거)
  // 각 테이블의 실제 시간 컬럼:
  //   match_attendance → voted_at  (created_at 없음, 무한 0건 사고 방지)
  //   match_goals      → created_at
  //   posts            → created_at
  //   dues_records     → recorded_at  (created_at 없음)
  //   matches          → created_at
  const [teamsRes, usersRes, matchesRes, postsRes, joinReqRes, recentUsersRes, membersRes, demoMembersRes, recentVotesRes, recentGoalsRes, recentPostsRes, recentDuesRes, recentMatchesByCreatorRes, allMembersRes] =
    await Promise.all([
      db.from("teams").select("id, name, sport_type, created_at, is_searchable"),
      db.from("users").select("id, name, created_at, is_profile_complete, signup_source", { count: "exact" }),
      db.from("matches").select("id, team_id, match_date, status, created_at"),
      db.from("posts").select("id, team_id, author_id, created_at", { count: "exact" }),
      db.from("team_join_requests").select("id, team_id, name, status, created_at").eq("status", "PENDING"),
      db.from("users").select("id", { count: "exact" }).gte("created_at", sevenDaysAgo),
      // 전체 멤버 한 번에 조회 (BANNED 제외)
      db.from("team_members").select("team_id, status").in("status", ["ACTIVE", "DORMANT"]),
      // 제외 대상 팀(데모+본인+지인+테스트) 멤버 — activeUsers/totalUsers 카운트에서 빼기 위함
      db.from("team_members").select("user_id").in("team_id", Array.from(EXCLUDED_TEAM_IDS)).not("user_id", "is", null),
      // 최근 투표 (14일) — voted_at 사용. user_id null이면 member_id로 보완
      db.from("match_attendance").select("match_id, user_id, member_id").gte("voted_at", fourteenDaysAgo),
      // 최근 골 기록 (14일) — scorer_id는 team_members.id, recorded_by는 user_id
      db.from("match_goals").select("match_id, scorer_id, recorded_by").gte("created_at", fourteenDaysAgo),
      // 최근 게시글 (14일)
      db.from("posts").select("team_id, author_id").gte("created_at", fourteenDaysAgo),
      // 최근 회비 내역 (14일) — recorded_at 사용
      db.from("dues_records").select("team_id, user_id, recorded_by").gte("recorded_at", fourteenDaysAgo),
      // 최근 경기 등록 (14일) — 등록자 활성 카운트용
      db.from("matches").select("team_id, created_by").gte("created_at", fourteenDaysAgo),
      // team_members.id → user_id 매핑 (match_attendance.member_id, match_goals.scorer_id 변환용)
      db.from("team_members").select("id, user_id"),
    ]);

  // 제외 대상 팀 멤버의 user_id (전체 통계에서 빼기)
  const excludedMemberIds = new Set<string>();
  for (const m of demoMembersRes.data ?? []) if (m.user_id) excludedMemberIds.add(m.user_id);

  const teams = (teamsRes.data ?? []).filter((t) => !EXCLUDED_TEAM_IDS.has(t.id));
  const users = (usersRes.data ?? []).filter((u: { id: string }) => !excludedMemberIds.has(u.id));
  const matches = (matchesRes.data ?? []).filter((m: { team_id: string }) => !EXCLUDED_TEAM_IDS.has(m.team_id));
  const posts = postsRes.data ?? [];
  const pendingRequests = joinReqRes.data ?? [];

  // 팀별 멤버 수 (1번 쿼리로 집계)
  const memberCounts: Record<string, number> = {};
  for (const m of membersRes.data ?? []) {
    if (m.status === "ACTIVE" && !EXCLUDED_TEAM_IDS.has(m.team_id)) {
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

  // 활성 팀 판단 (14일 내: 경기 등록 / 투표 / 골 기록 / 게시글 / 회비 내역)
  // 동시에 활성 유저(14일 내 앱에 흔적 남긴 유저) 집합도 누적
  const recentMatches = matches.filter((m: { created_at: string }) => m.created_at >= fourteenDaysAgo);
  const activeTeamIds = new Set(recentMatches.map((m: { team_id: string }) => m.team_id));
  const activeUserIds = new Set<string>();

  const matchTeamMap = new Map<string, string>(matches.map((m: { id: string; team_id: string }) => [m.id, m.team_id]));

  // team_members.id → user_id 매핑 (member_id / scorer_id 변환)
  const memberToUser = new Map<string, string>();
  for (const m of (allMembersRes.data ?? []) as { id: string; user_id: string | null }[]) {
    if (m.user_id) memberToUser.set(m.id, m.user_id);
  }
  const addActiveUser = (uid: string | null | undefined) => {
    if (uid && !excludedMemberIds.has(uid)) activeUserIds.add(uid);
  };

  // 투표 활동 (팀 + 유저). user_id null이면 member_id → user_id 변환
  for (const v of (recentVotesRes.data ?? []) as { match_id: string; user_id: string | null; member_id: string | null }[]) {
    const teamId = matchTeamMap.get(v.match_id);
    if (teamId) activeTeamIds.add(teamId);
    addActiveUser(v.user_id ?? (v.member_id ? memberToUser.get(v.member_id) ?? null : null));
  }
  // 골 기록 활동 (팀 + scorer/recorded_by 유저)
  for (const g of (recentGoalsRes.data ?? []) as { match_id: string; scorer_id: string | null; recorded_by: string | null }[]) {
    const teamId = matchTeamMap.get(g.match_id);
    if (teamId) activeTeamIds.add(teamId);
    if (g.scorer_id) addActiveUser(memberToUser.get(g.scorer_id) ?? null);
    addActiveUser(g.recorded_by);
  }
  // 게시글 활동 (팀 + 작성자)
  for (const p of (recentPostsRes.data ?? []) as { team_id: string; author_id: string | null }[]) {
    activeTeamIds.add(p.team_id);
    addActiveUser(p.author_id);
  }
  // 회비 활동 (팀 + 입력자 + 본인 user_id)
  for (const d of (recentDuesRes.data ?? []) as { team_id: string; user_id: string | null; recorded_by: string | null }[]) {
    activeTeamIds.add(d.team_id);
    addActiveUser(d.user_id);
    addActiveUser(d.recorded_by);
  }
  // 경기 등록 활동 (등록자)
  for (const m of (recentMatchesByCreatorRes.data ?? []) as { team_id: string; created_by: string | null }[]) {
    if (EXCLUDED_TEAM_IDS.has(m.team_id)) continue;
    addActiveUser(m.created_by);
  }
  for (const id of EXCLUDED_TEAM_IDS) activeTeamIds.delete(id);

  // 팀 상태: 활성 / 휴면 / 미사용
  function getTeamStatus(teamId: string): "active" | "dormant" | "unused" {
    if (activeTeamIds.has(teamId)) return "active";
    const info = teamMatchInfo[teamId];
    const hasActivity = (info?.count ?? 0) > 0 || (teamPostCounts[teamId] ?? 0) > 0;
    if (hasActivity) return "dormant";
    return "unused";
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
      status: getTeamStatus(team.id),
    }))
    .sort((a, b) => b.memberCount - a.memberCount);

  // 최근 3일 내 신규 가입 유저 (데모 제외) + 소속 팀
  const recentUsersList = users
    .filter((u: { created_at?: string }) => u.created_at && u.created_at >= threeDaysAgo)
    .sort((a: { created_at: string }, b: { created_at: string }) => b.created_at.localeCompare(a.created_at));

  // 각 유저의 소속 팀 조회 (한 유저가 여러 팀이면 첫 번째만 표시, 데모 팀 제외)
  const userTeamMap: Record<string, string> = {};
  if (recentUsersList.length > 0) {
    const userIds = recentUsersList.map((u: { id: string }) => u.id);
    const { data: userTeams } = await db
      .from("team_members")
      .select("user_id, teams:team_id(name)")
      .in("user_id", userIds)
      .in("status", ["ACTIVE", "DORMANT"])
      .not("team_id", "in", `(${Array.from(EXCLUDED_TEAM_IDS).join(",")})`);
    for (const row of (userTeams ?? []) as { user_id: string; teams: { name: string } | { name: string }[] | null }[]) {
      const teamName = Array.isArray(row.teams) ? row.teams[0]?.name : row.teams?.name;
      if (teamName && !userTeamMap[row.user_id]) userTeamMap[row.user_id] = teamName;
    }
  }

  // === 가입 출처별 cohort 분석 (30일 내 가입자) ===
  // signup_source 컬럼은 2026-05-12 도입. 그 전 가입자는 NULL → "미추적" 그룹.
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  type UserWithSource = { id: string; created_at: string; signup_source: string | null };
  const recent30dUsers = (users as UserWithSource[]).filter(
    (u) => u.created_at && u.created_at >= thirtyDaysAgo,
  );

  const sourceMap = new Map<string, { signups: number; activeUsers: number }>();
  for (const u of recent30dUsers) {
    const key = u.signup_source && u.signup_source.trim() ? u.signup_source : "(미추적)";
    const bucket = sourceMap.get(key) ?? { signups: 0, activeUsers: 0 };
    bucket.signups += 1;
    if (activeUserIds.has(u.id)) bucket.activeUsers += 1;
    sourceMap.set(key, bucket);
  }

  const signupSourceCohorts = Array.from(sourceMap.entries())
    .map(([source, { signups, activeUsers }]) => ({
      source,
      signups,
      activeUsers,
      activeRate: signups > 0 ? Math.round((activeUsers / signups) * 100) : 0,
    }))
    .sort((a, b) => b.signups - a.signups);

  const recentSignups = {
    users: recentUsersList.map((u: { id: string; name: string; created_at: string; is_profile_complete: boolean }) => ({
      id: u.id,
      name: u.name,
      createdAt: u.created_at,
      profileComplete: u.is_profile_complete,
      teamName: userTeamMap[u.id] ?? null,
    })),
    teams: teams
      .filter((t) => t.created_at >= threeDaysAgo)
      .map((t) => ({
        id: t.id,
        name: t.name,
        sportType: t.sport_type,
        createdAt: t.created_at,
        memberCount: memberCounts[t.id] ?? 0,
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };

  return NextResponse.json({
    overview: {
      totalTeams: teams.length,
      totalUsers: users.length,
      profileComplete: users.filter((u: { is_profile_complete: boolean }) => u.is_profile_complete).length,
      newUsersThisWeek: recentUsersRes.count ?? 0,
      totalMatches: matches.length,
      totalPosts: postsRes.count ?? posts.length,
      activeTeams: activeTeamIds.size,
      activeUsers: activeUserIds.size,
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
    recentSignups,
    signupSourceCohorts,
  });
}
