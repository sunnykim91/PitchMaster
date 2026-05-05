import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { autoCompleteTeamMatches, getKstToday } from "@/lib/server/autoCompleteMatches";
import { resolveValidMvp, pickStaffDecision, shouldApplyNewMvpPolicy } from "@/lib/mvpThreshold";

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
    vote_deadline: string | null;
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
  activeVotes: {
    id: string;
    title: string;
    due: string;
    matchDate: string;
    matchTime: string | null;
    opponentName: string | null;
    matchType: "REGULAR" | "INTERNAL" | "EVENT";
    voteCounts: { attend: number; absent: number; undecided: number };
  }[];
  tasks: DashboardTask[];
  teamRecord: TeamRecord;
  teamUniform: TeamUniformInfo | null;
  birthdayMembers: BirthdayMember[];
  hasDuesSettings: boolean;
  totalMatches: number;
  registeredMemberCount: number;
};

/**
 * 대시보드 미완료 항목.
 * - 일반 task 는 href 로 이동
 * - action="open-peer-evaluation" 은 모달 직접 열기 (PitchScore 동료 평가)
 */
export type DashboardTask =
  | { label: string; href: string; action?: undefined }
  | { label: string; action: "open-peer-evaluation"; href?: undefined };

const DUES_CUTOFF_DAY = 10;

const EMPTY_RECORD: TeamRecord = {
  wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, recent5: [],
};

type ActiveMemberRow = {
  id: string;
  user_id: string | null;
  status: string;
  role: string;
  users: { name: string | null; birth_date: string | null; profile_image_url: string | null } | { name: string | null; birth_date: string | null; profile_image_url: string | null }[] | null;
};

/**
 * 대시보드 SSR 데이터 fetch — 3단계 병렬화 (2026-05-05).
 *
 * Stage 1: 자동 완료 + 독립 쿼리 일괄 (Promise.all)
 * Stage 2: stage1 결과 의존 쿼리 일괄 (Promise.all)
 * Stage 3: completedMatches → allGoals (완료된 경기 수만큼)
 *
 * 이전 직렬 8단 await → 3단으로 축소. 대시보드 SSR 평균 ~400ms 절감.
 *
 * @param enablePitchScore Phase 2C 동료 평가 task 노출 여부 (현재 김선휘만)
 */
export async function getDashboardData(
  teamId: string,
  userId: string,
  enablePitchScore: boolean = false,
): Promise<DashboardData> {
  const db = getSupabaseAdmin();
  if (!db) return {
    upcomingMatch: null, recentResult: null, activeVotes: [], tasks: [],
    teamRecord: EMPTY_RECORD, teamUniform: null, birthdayMembers: [],
    hasDuesSettings: false, totalMatches: 0, registeredMemberCount: 0,
  };

  const nowIso = new Date().toISOString();
  const today = getKstToday();
  const todayDateOnly = nowIso.split("T")[0];
  const kstNowDate = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const currentMonth = `${kstNowDate.getUTCFullYear()}-${String(kstNowDate.getUTCMonth() + 1).padStart(2, "0")}`;
  const todayDay = kstNowDate.getUTCDate();
  const monthStart = `${currentMonth}-01`;
  const lastDay = new Date(kstNowDate.getUTCFullYear(), kstNowDate.getUTCMonth() + 1, 0).getDate();
  const monthEnd = `${currentMonth}-${String(lastDay).padStart(2, "0")}`;

  // ── Stage 1: 독립 쿼리 일괄 + autoComplete 백그라운드 ──
  const [
    ,
    upcomingRes,
    recentRes,
    activeVotesRes,
    teamRes,
    membersRes,
    seasonsRes,
    totalMatchesRes,
    profileRes,
    duesSettingsRes,
    peerEvalCountRes,
  ] = await Promise.all([
    autoCompleteTeamMatches(db, teamId),
    db.from("matches")
      .select("id, match_date, match_time, match_end_time, vote_deadline, opponent_name, status, location, uniform_type, match_type")
      .eq("team_id", teamId)
      .eq("status", "SCHEDULED")
      .gte("match_date", todayDateOnly)
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
      .select("id, match_date, match_time, vote_deadline, opponent_name, match_type")
      .eq("team_id", teamId)
      .eq("status", "SCHEDULED")
      .gt("vote_deadline", nowIso)
      .order("match_date", { ascending: true })
      .order("match_time", { ascending: true })
      .limit(4),
    db.from("teams")
      .select("uniform_primary, uniform_secondary, uniform_pattern, uniforms, mvp_vote_staff_only")
      .eq("id", teamId)
      .maybeSingle(),
    // 한 번의 fetch 로 7가지 용도 모두 처리:
    //  • upcomingMatch / activeVotes 투표 정규화 (member_id ↔ user_id 매핑)
    //  • recentResult MVP 백필 치유 (STAFF+ voter)
    //  • taskChecks isStaff 판단 (myTm)
    //  • registeredMemberCount (ACTIVE + user_id 보유)
    //  • birthdayMembers (ACTIVE + birth_date)
    //  • dues OCR 기준 멤버 수 (ACTIVE/DORMANT)
    db.from("team_members")
      .select("id, user_id, status, role, users(name, birth_date, profile_image_url)")
      .eq("team_id", teamId)
      .in("status", ["ACTIVE", "DORMANT"])
      .returns<ActiveMemberRow[]>(),
    db.from("seasons")
      .select("start_date, end_date, is_active")
      .eq("team_id", teamId)
      .order("start_date", { ascending: false }),
    db.from("matches")
      .select("id", { count: "exact", head: true })
      .eq("team_id", teamId),
    db.from("users")
      .select("is_profile_complete")
      .eq("id", userId)
      .maybeSingle(),
    db.from("dues_settings")
      .select("id", { count: "exact", head: true })
      .eq("team_id", teamId)
      .neq("member_type", "__PERIOD__"),
    // PitchScore 동료 평가 누적 — 본인이 evaluator 로 한 평가 (자기평가 SELF 제외).
    // Feature Flag 일 때만 fetch. 3건 미만이면 dashboard task 노출.
    enablePitchScore
      ? db.from("player_evaluations")
          .select("id", { count: "exact", head: true })
          .eq("evaluator_user_id", userId)
          .eq("team_id", teamId)
          .neq("source", "SELF")
      : Promise.resolve({ count: 0 }),
  ]);

  const upcomingRaw = upcomingRes.data ?? null;
  const recentMatch = recentRes.data ?? null;
  const allMembers = (membersRes.data ?? []) as ActiveMemberRow[];
  const teamSettings = teamRes.data ?? null;
  const seasonList = (seasonsRes.data ?? []) as { start_date: string; end_date: string; is_active: boolean }[];
  const activeSeason = seasonList.find((s) => s.is_active) ?? seasonList[0] ?? null;
  const totalMatches = totalMatchesRes.count ?? 0;
  const profileRow = profileRes.data ?? null;
  const hasDuesSettings = (duesSettingsRes.count ?? 0) > 0;
  const mvpVoteStaffOnly = teamSettings?.mvp_vote_staff_only ?? false;

  // 한 번 가져온 멤버 데이터로 다용도 셋 구성
  const myMember = allMembers.find((m) => m.user_id === userId) ?? null;
  const myTeamMemberId = myMember?.id ?? null;
  const myRole = myMember?.role ?? "MEMBER";
  const isStaff = myRole === "PRESIDENT" || myRole === "STAFF";
  const staffVoterIds = new Set<string>(
    allMembers
      .filter((m) => m.role === "PRESIDENT" || m.role === "STAFF")
      .map((m) => m.user_id)
      .filter((id): id is string => !!id)
  );
  const memberByUserId = new Map<string, { id: string; status: string }>();
  const memberById = new Map<string, { user_id: string | null; status: string }>();
  for (const m of allMembers) {
    if (m.user_id) memberByUserId.set(m.user_id, { id: m.id, status: m.status });
    memberById.set(m.id, { user_id: m.user_id, status: m.status });
  }
  const activeOnlyIdSet = new Set(allMembers.filter((m) => m.status === "ACTIVE").map((m) => m.id));
  const allMemberIdSet = new Set(allMembers.map((m) => m.id));
  const registeredMemberCount = allMembers.filter((m) => m.status === "ACTIVE" && m.user_id).length;

  // 생일 (today MM-DD 매칭, ACTIVE 만)
  const todayMD = today.slice(5);
  const birthdayMembers: BirthdayMember[] = allMembers
    .filter((m) => m.status === "ACTIVE")
    .map((m) => (Array.isArray(m.users) ? m.users[0] : m.users))
    .filter((u): u is { name: string | null; birth_date: string | null; profile_image_url: string | null } =>
      !!u && !!u.birth_date && u.birth_date.slice(5) === todayMD)
    .map((u) => ({
      name: u.name ?? "",
      birthDate: u.birth_date!,
      profileImageUrl: u.profile_image_url ?? null,
    }));

  // ── Stage 2: stage1 결과 의존 쿼리 일괄 ──
  const voteMatchRows = (activeVotesRes.data ?? [])
    .filter((m) => !upcomingRaw || m.id !== upcomingRaw.id)
    .slice(0, 3) as { id: string; match_date: string; match_time: string | null; vote_deadline: string; opponent_name: string | null; match_type: string | null }[];
  const voteMatchIds = voteMatchRows.map((m) => m.id);

  const seasonStart = activeSeason?.start_date ?? null;
  const seasonEnd = activeSeason?.end_date ?? null;

  // matchAttendance 쿼리는 upcoming + activeVotes 의 모든 match_id 한 번에 묶음
  const allVoteFetchMatchIds = [
    ...(upcomingRaw ? [upcomingRaw.id] : []),
    ...voteMatchIds,
  ];

  // completedMatches 쿼리 (시즌 범위 내)
  let completedMatchesQuery = db.from("matches")
    .select("id")
    .eq("team_id", teamId)
    .eq("status", "COMPLETED")
    .eq("match_type", "REGULAR")
    .neq("stats_included", false)
    .order("match_date", { ascending: false });
  if (seasonStart && seasonEnd) {
    completedMatchesQuery = completedMatchesQuery.gte("match_date", seasonStart).lte("match_date", seasonEnd);
  }

  const [
    voteAttendanceRes,
    upcomingGuestsRes,
    recentGoalsRes,
    recentMvpRes,
    recentAttRes,
    myUpcomingVoteRes,
    myMvpVoteRes,
    myPaymentRes,
    myExemptionsRes,
    monthRecordCountRes,
    paidCountRes,
    pendingJoinCountRes,
    completedMatchesRes,
  ] = await Promise.all([
    allVoteFetchMatchIds.length > 0
      ? db.from("match_attendance").select("match_id, vote, user_id, member_id").in("match_id", allVoteFetchMatchIds)
      : Promise.resolve({ data: [] as { match_id: string; vote: string; user_id: string | null; member_id: string | null }[] }),
    upcomingRaw
      ? db.from("match_guests").select("id").eq("match_id", upcomingRaw.id)
      : Promise.resolve({ data: [] as { id: string }[] }),
    recentMatch
      ? db.from("match_goals").select("scorer_id, is_own_goal").eq("match_id", recentMatch.id)
      : Promise.resolve({ data: [] as { scorer_id: string; is_own_goal: boolean }[] }),
    recentMatch
      ? db.from("match_mvp_votes").select("voter_id, candidate_id, is_staff_decision, users:candidate_id(name)").eq("match_id", recentMatch.id)
      : Promise.resolve({ data: [] as { voter_id: string; candidate_id: string; is_staff_decision: boolean | null; users: { name: string } | { name: string }[] | null }[] }),
    recentMatch
      ? db.from("match_attendance").select("id").eq("match_id", recentMatch.id).in("attendance_status", ["PRESENT", "LATE"])
      : Promise.resolve({ data: [] as { id: string }[] }),
    upcomingRaw
      ? db.from("match_attendance").select("vote").eq("match_id", upcomingRaw.id).eq("user_id", userId).maybeSingle()
      : Promise.resolve({ data: null }),
    recentMatch
      ? db.from("match_mvp_votes").select("id").eq("match_id", recentMatch.id).eq("voter_id", userId).maybeSingle()
      : Promise.resolve({ data: null }),
    myTeamMemberId
      ? db.from("dues_payment_status").select("status").eq("team_id", teamId).eq("member_id", myTeamMemberId).eq("month", currentMonth).maybeSingle()
      : Promise.resolve({ data: null }),
    myTeamMemberId
      ? db.from("member_dues_exemptions").select("id, start_date, end_date").eq("team_id", teamId).eq("member_id", myTeamMemberId).eq("is_active", true)
      : Promise.resolve({ data: [] as { id: string; start_date: string; end_date: string | null }[] }),
    isStaff
      ? db.from("dues_records").select("id", { count: "exact", head: true }).eq("team_id", teamId).gte("recorded_at", `${currentMonth}-01T00:00:00+09:00`)
      : Promise.resolve({ count: 0 }),
    isStaff
      ? db.from("dues_payment_status").select("id", { count: "exact", head: true }).eq("team_id", teamId).eq("month", currentMonth).eq("status", "PAID")
      : Promise.resolve({ count: 0 }),
    isStaff
      ? db.from("team_join_requests").select("id", { count: "exact", head: true }).eq("team_id", teamId).eq("status", "PENDING")
      : Promise.resolve({ count: 0 }),
    completedMatchesQuery,
  ]);

  // upcomingMatch 조립
  const allVoteRows = (voteAttendanceRes.data ?? []) as { match_id: string; vote: string; user_id: string | null; member_id: string | null }[];

  let upcomingMatch: DashboardData["upcomingMatch"] = null;
  if (upcomingRaw) {
    const upcomingVotes = allVoteRows.filter((r) => r.match_id === upcomingRaw.id);
    const memberVoteMap = new Map<string, string>();
    for (const v of upcomingVotes) {
      if (v.member_id) {
        memberVoteMap.set(v.member_id, v.vote);
      } else if (v.user_id) {
        const m = memberByUserId.get(v.user_id);
        if (m) memberVoteMap.set(m.id, v.vote);
      }
    }
    const isEvent = upcomingRaw.match_type === "EVENT";
    const countableMemberIds = isEvent ? allMemberIdSet : activeOnlyIdSet;
    const votes = [...memberVoteMap.entries()]
      .filter(([id]) => countableMemberIds.has(id))
      .map(([, vote]) => vote);
    const voteCounts = {
      attend: votes.filter((v) => v === "ATTEND").length,
      absent: votes.filter((v) => v === "ABSENT").length,
      undecided: votes.filter((v) => v === "MAYBE").length,
    };
    const myVoteRow = upcomingVotes.find((v) => v.user_id === userId || v.member_id === myTeamMemberId);
    const myVote = myVoteRow ? (myVoteRow.vote as "ATTEND" | "ABSENT" | "MAYBE") : null;
    const guestCount = (upcomingGuestsRes.data ?? []).length;
    upcomingMatch = { ...upcomingRaw, voteCounts, myVote, myMemberId: myTeamMemberId, guestCount };
  }

  // recentResult 조립
  let recentResult: DashboardData["recentResult"] = null;
  if (recentMatch) {
    const goalRows = (recentGoalsRes.data ?? []) as { scorer_id: string; is_own_goal: boolean }[];
    const ourGoals = goalRows.filter((g) => g.scorer_id !== "OPPONENT" && !g.is_own_goal).length;
    const oppGoals = goalRows.filter((g) => g.scorer_id === "OPPONENT" || g.is_own_goal).length;
    type MvpVoteRow = { voter_id: string; candidate_id: string; is_staff_decision: boolean | null; users: { name: string } | { name: string }[] | null };
    const voteRows = (recentMvpRes.data ?? []) as MvpVoteRow[];
    const attendedCount = (recentAttRes.data ?? []).length;
    const newPolicy = shouldApplyNewMvpPolicy(recentMatch.match_date, mvpVoteStaffOnly);
    const staffDecision = pickStaffDecision(voteRows, staffVoterIds, {
      applyBackfillHealing: !newPolicy,
    });
    const winnerId = resolveValidMvp(
      voteRows.map((v) => v.candidate_id).filter(Boolean),
      attendedCount,
      staffDecision,
    );
    const winnerName = winnerId
      ? (() => {
          const row = voteRows.find((v) => v.candidate_id === winnerId);
          return row ? (Array.isArray(row.users) ? row.users[0]?.name : row.users?.name) ?? null : null;
        })()
      : null;
    recentResult = {
      id: recentMatch.id,
      date: recentMatch.match_date,
      score: `${ourGoals} : ${oppGoals}`,
      opponent: recentMatch.opponent_name,
      mvp: winnerName,
    };
  }

  // activeVotes 조립
  const voteCountsByMatch: Record<string, { attend: number; absent: number; undecided: number }> = {};
  for (const m of voteMatchRows) {
    const matchVotes = allVoteRows.filter((r) => r.match_id === m.id);
    const memberVoteMap = new Map<string, string>();
    for (const r of matchVotes) {
      if (r.member_id) {
        memberVoteMap.set(r.member_id, r.vote);
      } else if (r.user_id) {
        const mem = memberByUserId.get(r.user_id);
        if (mem) memberVoteMap.set(mem.id, r.vote);
      }
    }
    const countableIds = m.match_type === "EVENT" ? allMemberIdSet : activeOnlyIdSet;
    const votes = [...memberVoteMap.entries()]
      .filter(([id]) => countableIds.has(id))
      .map(([, v]) => v);
    voteCountsByMatch[m.id] = {
      attend: votes.filter((v) => v === "ATTEND").length,
      absent: votes.filter((v) => v === "ABSENT").length,
      undecided: votes.filter((v) => v === "MAYBE").length,
    };
  }

  const activeVotes = voteMatchRows.map((m) => ({
    id: m.id,
    title: `${m.match_date} 경기 참석 투표`,
    due: m.vote_deadline,
    matchDate: m.match_date,
    matchTime: m.match_time,
    opponentName: m.opponent_name,
    matchType: (m.match_type === "INTERNAL" ? "INTERNAL" : m.match_type === "EVENT" ? "EVENT" : "REGULAR") as "REGULAR" | "INTERNAL" | "EVENT",
    voteCounts: voteCountsByMatch[m.id] ?? { attend: 0, absent: 0, undecided: 0 },
  }));

  // tasks 조립
  const tasks: DashboardTask[] = [];

  // PitchScore 동료 평가 — 누적 3건 미만이면 노출 (Feature Flag 일 때만)
  if (enablePitchScore) {
    const peerEvalCount = peerEvalCountRes.count ?? 0;
    if (peerEvalCount < 3) {
      const remaining = 3 - peerEvalCount;
      tasks.push({
        label: peerEvalCount === 0
          ? "팀원 평가하기 (3명 권장)"
          : `팀원 평가 ${remaining}명 더 하기`,
        action: "open-peer-evaluation",
      });
    }
  }

  if (upcomingMatch && !myUpcomingVoteRes.data) {
    tasks.push({ label: "다음 경기 참석 투표 완료하기", href: `/matches/${upcomingMatch.id}?tab=vote` });
  }
  if (recentMatch && !myMvpVoteRes.data) {
    tasks.push({ label: "최근 경기 MVP 투표 완료하기", href: `/matches/${recentMatch.id}?tab=record` });
  }
  if (profileRow && profileRow.is_profile_complete === false) {
    tasks.push({ label: "프로필 완성하기", href: "/settings" });
  }

  const myStatus = (myPaymentRes.data as { status?: string } | null)?.status ?? null;
  const myExemptions = (myExemptionsRes.data ?? []) as { start_date: string; end_date: string | null }[];
  const hasActiveExemption = myExemptions.some((ex) => ex.start_date <= monthEnd && (ex.end_date === null || ex.end_date >= monthStart));
  const isPaidOrExempt = myStatus === "PAID" || myStatus === "EXEMPT" || hasActiveExemption;
  if (hasDuesSettings && myTeamMemberId && todayDay >= DUES_CUTOFF_DAY && !isPaidOrExempt) {
    tasks.push({ label: "이번 달 회비 납부 확인", href: "/dues?tab=status" });
  }

  if (isStaff && hasDuesSettings && todayDay >= DUES_CUTOFF_DAY) {
    const monthRecordCount = monthRecordCountRes.count ?? 0;
    const memberCount = allMembers.length; // ACTIVE + DORMANT (이전 동작 유지)
    const paidCount = paidCountRes.count ?? 0;
    const paidRatio = memberCount > 0 ? paidCount / memberCount : 0;
    if (monthRecordCount === 0 || paidRatio < 0.5) {
      tasks.push({ label: "회비 영수증 업로드", href: "/dues?tab=bulk" });
    }
  }

  if (isStaff) {
    const pendingCount = pendingJoinCountRes.count ?? 0;
    if (pendingCount > 0) {
      tasks.push({ label: `가입 대기자 ${pendingCount}명 승인`, href: "/members" });
    }
  }

  // ── Stage 3: completedMatches → allGoals (시즌 전적) ──
  const completedMatchIds = (completedMatchesRes.data ?? []).map((m) => m.id);
  let teamRecord = EMPTY_RECORD;
  if (completedMatchIds.length > 0) {
    const { data: allGoals } = await db
      .from("match_goals")
      .select("match_id, scorer_id, is_own_goal")
      .in("match_id", completedMatchIds);
    const matchScores = new Map<string, { our: number; opp: number }>();
    for (const g of allGoals ?? []) {
      if (!matchScores.has(g.match_id)) matchScores.set(g.match_id, { our: 0, opp: 0 });
      const s = matchScores.get(g.match_id)!;
      if (g.scorer_id === "OPPONENT" || g.is_own_goal) s.opp++;
      else s.our++;
    }
    let wins = 0, draws = 0, losses = 0, gf = 0, ga = 0;
    const results: ("W" | "D" | "L")[] = [];
    for (const mid of completedMatchIds) {
      const s = matchScores.get(mid) ?? { our: 0, opp: 0 };
      gf += s.our;
      ga += s.opp;
      if (s.our > s.opp) { wins++; results.push("W"); }
      else if (s.our === s.opp) { draws++; results.push("D"); }
      else { losses++; results.push("L"); }
    }
    teamRecord = { wins, draws, losses, goalsFor: gf, goalsAgainst: ga, recent5: results.slice(0, 5) };
  }

  const teamUniform: TeamUniformInfo | null = teamSettings
    ? {
        uniformPrimary: teamSettings.uniform_primary ?? null,
        uniformSecondary: teamSettings.uniform_secondary ?? null,
        uniformPattern: teamSettings.uniform_pattern ?? null,
        uniforms: (teamSettings as { uniforms?: unknown }).uniforms as TeamUniformInfo["uniforms"],
      }
    : null;

  return {
    upcomingMatch,
    recentResult,
    activeVotes,
    tasks,
    teamRecord,
    teamUniform,
    birthdayMembers,
    hasDuesSettings,
    totalMatches,
    registeredMemberCount,
  };
}
