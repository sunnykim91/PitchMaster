import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type TeamRecord = {
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  recent5: ("W" | "D" | "L")[];
};

export type TeamUniformInfo = {
  uniformPrimary: string | null;
  uniformSecondary: string | null;
  uniformPattern: string | null;
  uniforms?: { home?: { primary: string; secondary: string; pattern: string }; away?: { primary: string; secondary: string; pattern: string }; third?: { primary: string; secondary: string; pattern: string } | null } | null;
};

export type BirthdayMember = {
  name: string;
  birthDate: string;
  profileImageUrl: string | null;
};

export type DashboardData = {
  upcomingMatch: {
    id: string;
    match_date: string;
    match_time: string | null;
    match_end_time: string | null;
    opponent_name: string | null;
    location: string | null;
    uniform_type: string | null;
    voteCounts: { attend: number; absent: number; undecided: number };
    myVote: "ATTEND" | "ABSENT" | "MAYBE" | null;
    myMemberId: string | null;
    guestCount: number;
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
  teamRecord: TeamRecord;
  teamUniform: TeamUniformInfo | null;
  birthdayMembers: BirthdayMember[];
  hasDuesSettings: boolean;
  /** 팀 전체 경기 등록 수 (0이면 한 번도 경기를 등록한 적 없음) */
  totalMatches: number;
  /** 실제 가입(카카오 로그인) 완료한 팀원 수 */
  registeredMemberCount: number;
};

export async function getDashboardData(teamId: string, userId: string): Promise<DashboardData> {
  const db = getSupabaseAdmin();
  const emptyRecord: TeamRecord = { wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, recent5: [] };
  if (!db) return { upcomingMatch: null, recentResult: null, activeVotes: [], tasks: [], teamRecord: emptyRecord, teamUniform: null, birthdayMembers: [], hasDuesSettings: false, totalMatches: 0, registeredMemberCount: 0 };

  const now = new Date().toISOString();
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const today = kstNow.toISOString().split("T")[0];

  // 날짜 지난 SCHEDULED 경기 → 자동 COMPLETED 처리 (KST 기준)
  await db
    .from("matches")
    .update({ status: "COMPLETED" })
    .eq("team_id", teamId)
    .eq("status", "SCHEDULED")
    .lt("match_date", today);

  const [upcomingRes, recentRes, activeVotesRes] = await Promise.all([
    db.from("matches")
      .select("id, match_date, match_time, match_end_time, vote_deadline, opponent_name, status, location, uniform_type")
      .eq("team_id", teamId)
      .eq("status", "SCHEDULED")
      .gte("match_date", new Date().toISOString().split("T")[0])
      .order("match_date", { ascending: true })
      .limit(1)
      .maybeSingle(),
    db.from("matches")
      .select("id, match_date, opponent_name, status")
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

  const upcomingRaw = upcomingRes.data ?? null;
  const recentMatch = recentRes.data ?? null;

  // 예정 경기 투표 현황
  let upcomingMatch: DashboardData["upcomingMatch"] = null;
  if (upcomingRaw) {
    const [votesRes, myMemberRes, guestsRes] = await Promise.all([
      db.from("match_attendance").select("vote, user_id, member_id").eq("match_id", upcomingRaw.id),
      db.from("team_members").select("id").eq("user_id", userId).limit(1).maybeSingle(),
      db.from("match_guests").select("id").eq("match_id", upcomingRaw.id),
    ]);
    const voteList = (votesRes.data ?? []) as { vote: string; user_id: string | null; member_id: string | null }[];
    // 중복 제거: user_id ?? member_id 기준으로 1인 1표 (경기 목록/상세와 동일 로직)
    const deduped = new Map<string, string>();
    for (const v of voteList) {
      const key = v.user_id ?? v.member_id;
      if (key) deduped.set(key, v.vote);
    }
    const votes = [...deduped.values()];
    const voteCounts = {
      attend: votes.filter((v) => v === "ATTEND").length,
      absent: votes.filter((v) => v === "ABSENT").length,
      undecided: votes.filter((v) => v === "MAYBE").length,
    };
    const myMemberId = myMemberRes.data?.id ?? null;
    const myVoteRow = voteList.find((v) => v.user_id === userId || v.member_id === myMemberId);
    const myVote = myVoteRow ? (myVoteRow.vote as "ATTEND" | "ABSENT" | "MAYBE") : null;
    const guestCount = guestsRes.data?.length ?? 0;
    upcomingMatch = { ...upcomingRaw, voteCounts, myVote, myMemberId, guestCount };
  }

  let recentResult = null;
  if (recentMatch) {
    const [goalsRes, mvpRes] = await Promise.all([
      db.from("match_goals").select("scorer_id, is_own_goal").eq("match_id", recentMatch.id),
      db.from("match_mvp_votes").select("candidate_id, users:candidate_id(name)").eq("match_id", recentMatch.id),
    ]);
    type GoalRow = { scorer_id: string; is_own_goal: boolean };
    const goalRows = (goalsRes.data || []) as GoalRow[];
    const ourGoals = goalRows.filter((g) => g.scorer_id !== "OPPONENT" && !g.is_own_goal).length;
    const oppGoals = goalRows.filter((g) => g.scorer_id === "OPPONENT" || g.is_own_goal).length;

    const mvpCounts: Record<string, { count: number; name: string }> = {};
    type MvpVoteRow = { candidate_id: string; users: { name: string } | { name: string }[] | null };
    const voteRows = (mvpRes.data || []) as MvpVoteRow[];
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

  type VoteMatchRow = { id: string; match_date: string; vote_deadline: string };
  const activeVotes = ((activeVotesRes.data || []) as VoteMatchRow[]).map((m) => ({
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

  // ── 팀 전적 계산 (활성 시즌 기준) ──
  const { data: seasons } = await db
    .from("seasons")
    .select("start_date, end_date, is_active")
    .eq("team_id", teamId)
    .order("start_date", { ascending: false });

  const activeSeason = (seasons ?? []).find((s: { is_active: boolean }) => s.is_active) ?? (seasons ?? [])[0];

  let completedQuery = db
    .from("matches")
    .select("id")
    .eq("team_id", teamId)
    .eq("status", "COMPLETED")
    .eq("match_type", "REGULAR")
    .order("match_date", { ascending: false });

  if (activeSeason) {
    completedQuery = completedQuery
      .gte("match_date", activeSeason.start_date)
      .lte("match_date", activeSeason.end_date);
  }

  const { data: completedMatches } = await completedQuery;

  const completedIds = (completedMatches ?? []).map((m) => m.id);
  let teamRecord = emptyRecord;

  if (completedIds.length > 0) {
    const { data: allGoals } = await db
      .from("match_goals")
      .select("match_id, scorer_id, is_own_goal")
      .in("match_id", completedIds);

    // 경기별 득점/실점 집계
    const matchScores = new Map<string, { our: number; opp: number }>();
    for (const g of allGoals ?? []) {
      if (!matchScores.has(g.match_id)) matchScores.set(g.match_id, { our: 0, opp: 0 });
      const s = matchScores.get(g.match_id)!;
      if (g.scorer_id === "OPPONENT" || g.is_own_goal) s.opp++;
      else s.our++;
    }

    let wins = 0, draws = 0, losses = 0, gf = 0, ga = 0;
    const results: ("W" | "D" | "L")[] = [];

    // completedIds는 날짜 내림차순이므로 최근 경기부터
    for (const mid of completedIds) {
      const s = matchScores.get(mid) ?? { our: 0, opp: 0 };
      gf += s.our;
      ga += s.opp;
      if (s.our > s.opp) { wins++; results.push("W"); }
      else if (s.our === s.opp) { draws++; results.push("D"); }
      else { losses++; results.push("L"); }
    }

    teamRecord = {
      wins, draws, losses,
      goalsFor: gf, goalsAgainst: ga,
      recent5: results.slice(0, 5),
    };
  }

  // 팀 유니폼 정보
  const { data: teamInfoData } = await db
    .from("teams")
    .select("uniform_primary, uniform_secondary, uniform_pattern, uniforms")
    .eq("id", teamId)
    .single();

  const teamUniform: TeamUniformInfo | null = teamInfoData
    ? {
        uniformPrimary: teamInfoData.uniform_primary ?? null,
        uniformSecondary: teamInfoData.uniform_secondary ?? null,
        uniformPattern: teamInfoData.uniform_pattern ?? null,
        uniforms: (teamInfoData as { uniforms?: unknown }).uniforms as TeamUniformInfo["uniforms"],
      }
    : null;

  // ── 오늘 생일인 팀원 조회 (KST 기준) ──
  const todayMD = today.slice(5); // "MM-DD"
  const { data: birthdayRows } = await db
    .from("team_members")
    .select("users(name, birth_date, profile_image_url)")
    .eq("team_id", teamId)
    .eq("status", "ACTIVE");

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const birthdayMembers: BirthdayMember[] = ((birthdayRows ?? []) as any[])
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

  // ── 회비 설정 여부 ──
  const { count: duesSettingsCount } = await db
    .from("dues_settings")
    .select("id", { count: "exact", head: true })
    .eq("team_id", teamId)
    .neq("member_type", "__PERIOD__");

  const hasDuesSettings = (duesSettingsCount ?? 0) > 0;

  // ── 팀 전체 경기 수 (0건이면 한 번도 경기 등록 안 한 팀) ──
  const { count: totalMatchesCount } = await db
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("team_id", teamId);

  const totalMatches = totalMatchesCount ?? 0;

  // ── 실제 가입 완료(user_id가 있는) 팀원 수 ──
  const { count: registeredCount } = await db
    .from("team_members")
    .select("id", { count: "exact", head: true })
    .eq("team_id", teamId)
    .eq("status", "ACTIVE")
    .not("user_id", "is", null);

  const registeredMemberCount = registeredCount ?? 0;

  return { upcomingMatch, recentResult, activeVotes, tasks, teamRecord, teamUniform, birthdayMembers, hasDuesSettings, totalMatches, registeredMemberCount };
}
