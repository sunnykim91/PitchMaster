import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { autoCompleteTeamMatches, getKstNow, getKstToday } from "@/lib/server/autoCompleteMatches";
import { resolveValidMvps, pickStaffDecision, shouldApplyNewMvpPolicy } from "@/lib/mvpThreshold";
import { isTeamRecordMatch, type Role } from "@/lib/types";
import { isStaffOrAbove, isPresident } from "@/lib/permissions";
import { computeMatchScore } from "@/lib/server/matchScore";
import { countEligibleMatches, kstDateString } from "@/lib/attendanceEligibility";

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
    matchType: "REGULAR" | "INTERNAL" | "EVENT";
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
  teamUniform: TeamUniformInfo | null;
  birthdayMembers: BirthdayMember[];
  hasDuesSettings: boolean;
  totalMatches: number;
  registeredMemberCount: number;
  /** 홈 공지 노출 — 운영공지(전역) 최신 1건 + 팀공지 최근 핀 2건 */
  noticePins: {
    global: { id: string; title: string; createdAt: string } | null;
    team: { id: string; title: string; createdAt: string }[];
  };
  /** 신규 회장 5단계 온보딩 — Phase 2 (68차C).
   *  각 step 의 done 여부는 SSR 에서 계산. 5/5 완료 시 위자드 자동 dismiss 처리는 클라이언트. */
  onboardingSteps: OnboardingStep[];
};

export type OnboardingStep = {
  key: "team_created" | "members_invited" | "first_match" | "dues_setup" | "shared_to_chat";
  label: string;
  description: string;
  done: boolean;
  /** 행동 버튼 href (done=true 면 무시) */
  href?: string;
  /** 카카오 공유 같은 액션 — href 대신 클라이언트에서 처리. 'kakaoShare' 등 */
  action?: "kakaoShare";
};

/**
 * 대시보드 미완료 항목.
 * - 일반 task 는 href 로 이동
 * - 모든 task 는 단순 Link 형태 (45차 동료평가 UI 비활성화 후속)
 */
export type DashboardTask = {
  label: string;
  href: string;
  /** 시급도 — UI 색상·정렬에 사용. high=긴급(빨강), medium=권장(노랑), low=옵션(회색) */
  urgency?: "high" | "medium" | "low";
  /** lucide 아이콘 이름 (DashboardClient 에서 매핑). 없으면 기본 체크 ○ */
  icon?: "check" | "vote" | "trophy" | "user" | "wallet" | "upload" | "userPlus" | "calendar" | "clipboard" | "settings" | "users" | "alertCircle";
  /** 왜 해야 하는지 한 줄 부가 설명 (선택). 50대 운영진 친화. */
  description?: string;
};

const DUES_CUTOFF_DAY = 10;

const EMPTY_RECORD: TeamRecord = {
  wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, recent5: [],
};

type ActiveMemberRow = {
  id: string;
  user_id: string | null;
  status: string;
  role: string;
  joined_at: string | null;
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
 */
export async function getDashboardData(
  teamId: string,
  userId: string,
): Promise<DashboardData> {
  const db = getSupabaseAdmin();
  if (!db) return {
    upcomingMatch: null, recentResult: null, activeVotes: [], tasks: [],
    teamUniform: null, birthdayMembers: [],
    hasDuesSettings: false, totalMatches: 0, registeredMemberCount: 0,
    noticePins: { global: null, team: [] },
    onboardingSteps: [],
  };

  const nowIso = new Date().toISOString();
  const today = getKstToday();
  const kstNowDate = getKstNow();
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
    globalNoticeRes,
    teamNoticePinsRes,
  ] = await Promise.all([
    autoCompleteTeamMatches(db, teamId),
    db.from("matches")
      .select("id, match_date, match_time, match_end_time, vote_deadline, opponent_name, status, location, uniform_type, match_type")
      .eq("team_id", teamId)
      .eq("status", "SCHEDULED")
      .gte("match_date", today)
      .order("match_date", { ascending: true })
      .limit(1)
      .maybeSingle(),
    db.from("matches")
      .select("id, match_date, opponent_name, status, match_type")
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
      .select("id, user_id, status, role, joined_at, users(name, birth_date, profile_image_url)")
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
    // 운영공지 최신 1건 (전역)
    db.from("posts")
      .select("id, title, created_at")
      .eq("is_global", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // 팀공지 최근 2건 (category=NOTICE 인 글은 자동 핀 처리되므로 is_pinned 추가 필터 불필요)
    db.from("posts")
      .select("id, title, created_at")
      .eq("team_id", teamId)
      .eq("category", "NOTICE")
      .order("created_at", { ascending: false })
      .limit(2),
  ]);

  const upcomingRaw = upcomingRes.data ?? null;
  const recentMatch = recentRes.data ?? null;
  const allMembers = (membersRes.data ?? []) as ActiveMemberRow[];
  const teamSettings = teamRes.data ?? null;
  const seasonList = (seasonsRes.data ?? []) as { start_date: string; end_date: string; is_active: boolean }[];
  const totalMatches = totalMatchesRes.count ?? 0;
  const profileRow = profileRes.data ?? null;
  const hasDuesSettings = (duesSettingsRes.count ?? 0) > 0;
  const mvpVoteStaffOnly = teamSettings?.mvp_vote_staff_only ?? false;

  // 한 번 가져온 멤버 데이터로 다용도 셋 구성
  const myMember = allMembers.find((m) => m.user_id === userId) ?? null;
  const myTeamMemberId = myMember?.id ?? null;
  const myRole = myMember?.role ?? "MEMBER";
  const isStaff = isStaffOrAbove(myRole as Role);
  const staffVoterIds = new Set<string>(
    allMembers
      .filter((m) => isStaffOrAbove(m.role as Role))
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

  // matchAttendance 쿼리는 upcoming + activeVotes 의 모든 match_id 한 번에 묶음
  const allVoteFetchMatchIds = [
    ...(upcomingRaw ? [upcomingRaw.id] : []),
    ...voteMatchIds,
  ];

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
    penaltyRulesCountRes,
  ] = await Promise.all([
    allVoteFetchMatchIds.length > 0
      ? db.from("match_attendance").select("match_id, vote, user_id, member_id").in("match_id", allVoteFetchMatchIds)
      : Promise.resolve({ data: [] as { match_id: string; vote: string; user_id: string | null; member_id: string | null }[] }),
    upcomingRaw
      ? db.from("match_guests").select("id").eq("match_id", upcomingRaw.id)
      : Promise.resolve({ data: [] as { id: string }[] }),
    recentMatch
      ? db.from("match_goals").select("scorer_id, is_own_goal, side").eq("match_id", recentMatch.id)
      : Promise.resolve({ data: [] as { scorer_id: string; is_own_goal: boolean; side: string | null }[] }),
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
    // 벌금 규칙 카운트 — task "벌금 규칙 미설정" 노출 판정
    isStaff
      ? db.from("penalty_rules").select("id", { count: "exact", head: true }).eq("team_id", teamId).eq("is_active", true)
      : Promise.resolve({ count: 0 }),
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
    // matchType(camel) 매핑 필수 — upcomingRaw 엔 match_type(snake)만 있어, 빠지면 클라가 항상 'REGULAR' fallback (INTERNAL/EVENT 오표시)
    const matchType = (upcomingRaw.match_type === "INTERNAL" ? "INTERNAL" : upcomingRaw.match_type === "EVENT" ? "EVENT" : "REGULAR") as "REGULAR" | "INTERNAL" | "EVENT";
    upcomingMatch = { ...upcomingRaw, matchType, voteCounts, myVote, myMemberId: myTeamMemberId, guestCount };
  }

  // recentResult 조립
  let recentResult: DashboardData["recentResult"] = null;
  if (recentMatch) {
    const goalRows = (recentGoalsRes.data ?? []) as { scorer_id: string; is_own_goal: boolean; side: string | null }[];
    // 스코어 문자열은 공통 헬퍼 (자체전 side 집계 + 자책골 규칙 단일소스)
    const scoreStr = computeMatchScore(goalRows, recentMatch.match_type === "INTERNAL");
    type MvpVoteRow = { voter_id: string; candidate_id: string; is_staff_decision: boolean | null; users: { name: string } | { name: string }[] | null };
    const voteRows = (recentMvpRes.data ?? []) as MvpVoteRow[];
    const attendedCount = (recentAttRes.data ?? []).length;
    const newPolicy = shouldApplyNewMvpPolicy(recentMatch.match_date, mvpVoteStaffOnly);
    const staffDecision = pickStaffDecision(voteRows, staffVoterIds, {
      applyBackfillHealing: !newPolicy,
    });
    const winnerIds = resolveValidMvps(
      voteRows.map((v) => v.candidate_id).filter(Boolean),
      attendedCount,
      staffDecision,
    );
    // 공동 1등이면 이름 병기 ("철수, 영희")
    const nameOfWinner = (id: string): string | null => {
      const row = voteRows.find((v) => v.candidate_id === id);
      return row ? (Array.isArray(row.users) ? row.users[0]?.name : row.users?.name) ?? null : null;
    };
    const winnerName = winnerIds.length
      ? winnerIds.map(nameOfWinner).filter(Boolean).join(", ") || null
      : null;
    recentResult = {
      id: recentMatch.id,
      date: recentMatch.match_date,
      score: scoreStr,
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

  // tasks 조립 — 50대 운영진도 "지금 뭘 해야 할지" 한눈에 보이도록 urgency/icon/description 메타 동반.
  // 정렬 우선순위: high(긴급) → medium(권장) → low(옵션).
  const tasks: DashboardTask[] = [];

  // ─── 본인 액션 (모든 사용자) ───────────────────────────────
  if (upcomingMatch && !myUpcomingVoteRes.data) {
    tasks.push({
      label: "다음 경기 참석 투표하기",
      href: `/matches/${upcomingMatch.id}?tab=vote`,
      urgency: "high",
      icon: "vote",
      description: "팀원들이 내 참석 여부를 기다리고 있어요",
    });
  }
  if (recentMatch && !myMvpVoteRes.data) {
    tasks.push({
      label: "최근 경기 MVP 투표하기",
      href: `/matches/${recentMatch.id}?tab=diary`,
      urgency: "medium",
      icon: "trophy",
      description: "오늘의 활약상을 한 명에게",
    });
  }
  if (profileRow && profileRow.is_profile_complete === false) {
    tasks.push({
      label: "내 프로필 완성하기",
      href: "/settings",
      urgency: "medium",
      icon: "user",
      description: "포지션·연락처를 채우면 자동 편성이 더 정확해져요",
    });
  }

  const myStatus = (myPaymentRes.data as { status?: string } | null)?.status ?? null;
  const myExemptions = (myExemptionsRes.data ?? []) as { start_date: string; end_date: string | null }[];
  const hasActiveExemption = myExemptions.some((ex) => ex.start_date <= monthEnd && (ex.end_date === null || ex.end_date >= monthStart));
  const isPaidOrExempt = myStatus === "PAID" || myStatus === "EXEMPT" || hasActiveExemption;
  // 회비는 가입 다음 달부터 부과 — 가입 월·이전이면 본인 미납 task 띄우지 않음.
  const myJoinMonth = kstDateString(myMember?.joined_at)?.slice(0, 7) ?? null;
  const billableThisMonth = !myJoinMonth || currentMonth > myJoinMonth;
  if (hasDuesSettings && myTeamMemberId && billableThisMonth && todayDay >= DUES_CUTOFF_DAY && !isPaidOrExempt) {
    tasks.push({
      label: "이번 달 회비 납부 확인",
      href: "/dues?tab=status",
      urgency: "high",
      icon: "wallet",
      description: "통장으로 보낸 회비가 등록됐는지 확인",
    });
  }

  // ─── 운영진 액션 (STAFF+) ───────────────────────────────
  if (isStaff) {
    // 1) 가입 신청 대기
    const pendingCount = pendingJoinCountRes.count ?? 0;
    if (pendingCount > 0) {
      tasks.push({
        label: `가입 대기자 ${pendingCount}명 승인`,
        href: "/settings?tab=team",
        urgency: "high",
        icon: "userPlus",
        description: "팀 설정에서 승인·거절 처리",
      });
    }

    // 2) 가장 최근 완료 경기 출석 체크 누락 — MVP 후보 0명 사고 방지 (2026-05-27 사고 기반)
    const recentAttendCount = (recentAttRes.data ?? []).length;
    if (recentMatch && recentAttendCount === 0) {
      tasks.push({
        label: "최근 경기 출석 체크",
        href: `/matches/${recentMatch.id}?tab=attendance`,
        urgency: "high",
        icon: "clipboard",
        description: "참석·지각·불참을 표시해야 MVP·벌금이 자동 처리돼요",
      });
    }

    // 3) 회비 영수증 업로드 (기존)
    if (hasDuesSettings && todayDay >= DUES_CUTOFF_DAY) {
      const monthRecordCount = monthRecordCountRes.count ?? 0;
      const memberCount = allMembers.length;
      const paidCount = paidCountRes.count ?? 0;
      const paidRatio = memberCount > 0 ? paidCount / memberCount : 0;
      if (monthRecordCount === 0 || paidRatio < 0.5) {
        tasks.push({
          label: "회비 영수증 업로드",
          href: "/dues?tab=bulk",
          urgency: "medium",
          icon: "upload",
          description: "통장 캡처 한 장이면 OCR 로 자동 정리",
        });
      }
    }

    // 4) 시즌 미설정 (신규 — 통계 누적 못 함)
    if (seasonList.length === 0) {
      tasks.push({
        label: "시즌 만들기",
        href: "/settings?tab=season",
        urgency: "medium",
        icon: "calendar",
        description: "시즌이 있어야 경기·통계가 쌓여요",
      });
    }

    // 5) 회비 설정 미완료 (신규)
    if (!hasDuesSettings) {
      tasks.push({
        label: "회비 설정하기",
        href: "/dues?tab=settings",
        urgency: "medium",
        icon: "settings",
        description: "월 회비·휴면 정책을 한 번 정하면 매월 자동",
      });
    }

    // 6) 예정 경기 없음 — 한 경기도 없으면 활성화의 첫 관문이라 high 로 띄움
    //    (#3 측정 결론: 빈 팀에 초대부터 밀면 효과 X. 첫 경기 → 초대 순서로 유도)
    if (!upcomingMatch) {
      const noMatchEver = totalMatches === 0;
      tasks.push({
        label: noMatchEver ? "첫 경기 만들기" : "다음 경기 일정 등록",
        href: "/matches",
        urgency: noMatchEver ? "high" : "medium",
        icon: "calendar",
        description: noMatchEver
          ? "경기를 만들면 투표·알림이 시작되고, 팀원을 부를 명분이 생겨요"
          : "일정을 미리 만들면 투표·알림이 자동",
      });
    }

    // 7) 회원 5명 미만 — 회장만 (신규)
    if (isPresident(myRole as Role) && registeredMemberCount > 0 && registeredMemberCount < 5) {
      tasks.push({
        label: `회원 ${registeredMemberCount}명 — 더 초대하기`,
        href: "/settings?tab=team",
        urgency: "medium",
        icon: "users",
        description: "초대 링크를 단톡방에 공유하면 끝",
      });
    }

    // 8) 벌금 규칙 미설정 (신규, 옵션)
    const penaltyRulesCount = penaltyRulesCountRes.count ?? 0;
    if (penaltyRulesCount === 0 && hasDuesSettings) {
      tasks.push({
        label: "벌금 규칙 설정 (선택)",
        href: "/dues?tab=settings",
        urgency: "low",
        icon: "alertCircle",
        description: "지각·결석·미투표 자동 청구를 켜둘 수 있어요",
      });
    }
  }

  // 시급도 정렬: high → medium → low (같은 등급은 push 순서 유지)
  const urgencyOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  tasks.sort((a, b) => (urgencyOrder[a.urgency ?? "medium"] ?? 1) - (urgencyOrder[b.urgency ?? "medium"] ?? 1));

  const teamUniform: TeamUniformInfo | null = teamSettings
    ? {
        uniformPrimary: teamSettings.uniform_primary ?? null,
        uniformSecondary: teamSettings.uniform_secondary ?? null,
        uniformPattern: teamSettings.uniform_pattern ?? null,
        uniforms: (teamSettings as { uniforms?: unknown }).uniforms as TeamUniformInfo["uniforms"],
      }
    : null;

  type NoticeRow = { id: string; title: string; created_at: string };
  const globalNoticeRow = (globalNoticeRes.data as NoticeRow | null) ?? null;
  const teamNoticeRows = ((teamNoticePinsRes.data ?? []) as NoticeRow[]);
  const noticePins = {
    global: globalNoticeRow
      ? { id: globalNoticeRow.id, title: globalNoticeRow.title, createdAt: globalNoticeRow.created_at }
      : null,
    team: teamNoticeRows.map((r) => ({ id: r.id, title: r.title, createdAt: r.created_at })),
  };

  // ─── 신규 회장 5단계 온보딩 (Phase 2, 68차C) ───
  // 각 단계 자동 감지 — DB·기존 변수만 사용 (추가 쿼리 0).
  // "단톡방 공유"는 서버에서 알 수 없어 done=false 고정, 클라이언트에서 localStorage 로 마지막 단계만 보강.
  const onboardingSteps: OnboardingStep[] = [
    {
      key: "team_created",
      label: "팀 만들기",
      description: "팀이 생성되었어요",
      done: true, // 이 SSR이 도달했다는 건 팀 이미 존재
    },
    {
      key: "first_match",
      label: "첫 경기 만들기",
      description: totalMatches > 0 ? `${totalMatches}개 등록됨` : "경기를 만들면 자동 투표가 시작되고, 팀원을 부를 명분이 생겨요",
      done: totalMatches > 0,
      href: "/matches",
    },
    {
      key: "members_invited",
      label: "회원 3명 이상 초대",
      description:
        registeredMemberCount >= 3
          ? `현재 ${registeredMemberCount}명`
          : totalMatches > 0
          ? `현재 ${registeredMemberCount}명 — 단톡방에 일정을 공유해 참석을 받아보세요`
          : `현재 ${registeredMemberCount}명 — 먼저 경기를 만들고 초대하면 더 잘 모여요`,
      done: registeredMemberCount >= 3,
      action: "kakaoShare",
    },
    {
      key: "dues_setup",
      label: "회비 설정",
      description: hasDuesSettings ? "설정 완료" : "월 회비·휴면 정책 한 번만 정해두면 매월 자동",
      done: hasDuesSettings,
      href: "/dues?tab=settings",
    },
    {
      key: "shared_to_chat",
      label: "단톡방에 앱 공유",
      description: "회원들이 알림을 받으려면 한 번 공유해주세요",
      done: false, // 클라이언트 localStorage 에서 덮어씀
      action: "kakaoShare",
    },
  ];

  return {
    upcomingMatch,
    recentResult,
    activeVotes,
    tasks,
    teamUniform,
    birthdayMembers,
    hasDuesSettings,
    totalMatches,
    registeredMemberCount,
    noticePins,
    onboardingSteps,
  };
}

/**
 * 대시보드 시즌 통계 (팀 전적 + 본인 시즌 기록) — getDashboardData 에서 분리 (2026-06-16).
 *
 * Why: 이 집계는 시즌 전체 완료경기의 골·출석을 스캔해 SSR 의 마지막 3번째 wave 를 늦췄다.
 *      홈 진입 시 급한 카드(다음경기·할일·투표)만 먼저 그리고, 전적·시즌기록 카드는 클라이언트가
 *      /api/dashboard/season-stats 로 따로 불러와 채운다 (DashboardClient).
 *      ⚠️ 집계 SQL·로직은 기존 stage 3 와 100% 동일 — 위치만 이동(숫자 회귀 0).
 */
export type DashboardSeasonStats = {
  teamRecord: TeamRecord;
  mySeasonStats: {
    matches: number;
    goals: number;
    attendanceRate: number;
    teamGoalRank: number | null;
    totalCompletedMatches: number;
  } | null;
};

export async function getDashboardSeasonStats(
  teamId: string,
  userId: string,
): Promise<DashboardSeasonStats> {
  const db = getSupabaseAdmin();
  if (!db) return { teamRecord: EMPTY_RECORD, mySeasonStats: null };

  // 활성 시즌 범위 + 본인 team_member id (병렬) — getDashboardData stage 1 과 동일 소스.
  const [seasonsRes, myMemberRes] = await Promise.all([
    db.from("seasons")
      .select("start_date, end_date, is_active")
      .eq("team_id", teamId)
      .order("start_date", { ascending: false }),
    db.from("team_members")
      .select("id, joined_at")
      .eq("team_id", teamId)
      .eq("user_id", userId)
      .in("status", ["ACTIVE", "DORMANT"])
      .maybeSingle(),
  ]);
  const seasonList = (seasonsRes.data ?? []) as { start_date: string; end_date: string; is_active: boolean }[];
  const activeSeason = seasonList.find((s) => s.is_active) ?? seasonList[0] ?? null;
  const seasonStart = activeSeason?.start_date ?? null;
  const seasonEnd = activeSeason?.end_date ?? null;
  const myMemberForStats = myMemberRes.data as { id: string; joined_at: string | null } | null;
  const myTeamMemberId = myMemberForStats?.id ?? null;

  // completedMatches 쿼리 (시즌 범위 내) — 기존 stage 2/3 와 동일 SQL (stats_included NULL 처리 포함).
  let completedMatchesQuery = db.from("matches")
    .select("id, match_type, match_date")
    .eq("team_id", teamId)
    .eq("status", "COMPLETED")
    .neq("stats_included", false)
    .order("match_date", { ascending: false });
  if (seasonStart && seasonEnd) {
    completedMatchesQuery = completedMatchesQuery.gte("match_date", seasonStart).lte("match_date", seasonEnd);
  }
  const completedMatchesRes = await completedMatchesQuery;

  const completedMatchRows = (completedMatchesRes.data ?? [])
    .filter((m) => isTeamRecordMatch((m as { match_type?: string | null }).match_type));
  const completedMatchIds = completedMatchRows.map((m) => m.id);
  // 출석률 분모 후보 — 시즌 전체 완료 경기일 + (matchId → 경기일) 맵
  const allMyMatchDates = completedMatchRows.map((m) => (m as { match_date: string }).match_date);
  const myMatchDateById = new Map(
    completedMatchRows.map((m) => [m.id, (m as { match_date: string }).match_date] as const),
  );

  let teamRecord = EMPTY_RECORD;
  let mySeasonStats: DashboardSeasonStats["mySeasonStats"] = null;
  if (completedMatchIds.length > 0) {
    const [allGoalsRes, myAttByUserRes, myAttByMemberRes] = await Promise.all([
      db.from("match_goals")
        .select("match_id, scorer_id, is_own_goal")
        .in("match_id", completedMatchIds),
      db.from("match_attendance")
        .select("match_id")
        .in("match_id", completedMatchIds)
        .eq("vote", "ATTEND")
        .eq("user_id", userId),
      myTeamMemberId
        ? db.from("match_attendance")
            .select("match_id")
            .in("match_id", completedMatchIds)
            .eq("vote", "ATTEND")
            .eq("member_id", myTeamMemberId)
        : Promise.resolve({ data: [] as { match_id: string }[] }),
    ]);
    const allGoals = allGoalsRes.data;
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

    // 본인 출전 — vote='ATTEND' row 합집합 (user_id 또는 member_id), match_id 기준 dedupe
    const attMatchSet = new Set<string>();
    for (const r of (myAttByUserRes.data ?? [])) attMatchSet.add(r.match_id);
    for (const r of (myAttByMemberRes.data ?? [])) attMatchSet.add(r.match_id);
    const attendCount = attMatchSet.size;

    // 출석률 분모 = 가입(joined_at) 이후 경기. 단 가입 전 출석 기록이 있으면(과거 데이터 이관 멤버)
    // 가입일 게이트를 무시하고 시즌 전체를 분모로 — records 탭의 computeAttendanceRateWithHistory와 동일 규칙.
    const myJoinKst = kstDateString(myMemberForStats?.joined_at);
    const myAttendedDates = [...attMatchSet]
      .map((id) => myMatchDateById.get(id))
      .filter((d): d is string => !!d);
    const myHasPreJoinAttendance = !!myJoinKst && myAttendedDates.some((d) => d < myJoinKst);
    const myEligibleMatches = countEligibleMatches(
      allMyMatchDates,
      myHasPreJoinAttendance ? null : myMemberForStats?.joined_at,
    );

    // 본인 골 — scorer_id 가 userId 또는 myTeamMemberId 일 수 있어 둘 다 매칭
    const myScorerIds = new Set<string>([userId]);
    if (myTeamMemberId) myScorerIds.add(myTeamMemberId);
    let myGoalCount = 0;
    for (const g of allGoals ?? []) {
      if (g.scorer_id && !g.is_own_goal && myScorerIds.has(g.scorer_id)) myGoalCount++;
    }

    if (attendCount > 0 || myGoalCount > 0) {
      // 팀내 골 순위 — allGoals scorer_id 별 group count 후 본인보다 큰 사람 수 + 1
      let teamGoalRank: number | null = null;
      if (myGoalCount > 0) {
        const goalsByScorer = new Map<string, number>();
        for (const g of allGoals ?? []) {
          if (g.scorer_id && !g.is_own_goal && g.scorer_id !== "OPPONENT") {
            goalsByScorer.set(g.scorer_id, (goalsByScorer.get(g.scorer_id) ?? 0) + 1);
          }
        }
        const myScorerSet = new Set<string>([userId]);
        if (myTeamMemberId) myScorerSet.add(myTeamMemberId);
        let higherCount = 0;
        for (const [scorerId, c] of goalsByScorer.entries()) {
          if (myScorerSet.has(scorerId)) continue;
          if (c > myGoalCount) higherCount++;
        }
        teamGoalRank = higherCount + 1;
      }

      mySeasonStats = {
        matches: attendCount,
        goals: myGoalCount,
        attendanceRate: myEligibleMatches > 0 ? Math.round((attendCount / myEligibleMatches) * 100) : 0,
        teamGoalRank,
        totalCompletedMatches: myEligibleMatches,
      };
    }
  }

  return { teamRecord, mySeasonStats };
}
