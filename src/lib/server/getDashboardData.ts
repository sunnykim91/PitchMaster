import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { autoCompleteTeamMatches, getKstToday } from "@/lib/server/autoCompleteMatches";

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
  tasks: { label: string; href: string }[];
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
  const today = getKstToday();

  // 종료된 SCHEDULED 경기 → 자동 COMPLETED 처리 (KST 기준, 당일 match_end_time 포함)
  await autoCompleteTeamMatches(db, teamId);

  const [upcomingRes, recentRes, activeVotesRes] = await Promise.all([
    db.from("matches")
      .select("id, match_date, match_time, match_end_time, vote_deadline, opponent_name, status, location, uniform_type, match_type")
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
      .select("id, match_date, match_time, vote_deadline, opponent_name, match_type")
      .eq("team_id", teamId)
      .eq("status", "SCHEDULED")
      .gt("vote_deadline", now)
      .order("match_date", { ascending: true })
      .order("match_time", { ascending: true })
      .limit(4),
  ]);

  const upcomingRaw = upcomingRes.data ?? null;
  const recentMatch = recentRes.data ?? null;

  // 예정 경기 투표 현황
  let upcomingMatch: DashboardData["upcomingMatch"] = null;
  if (upcomingRaw) {
    const [votesRes, myMemberRes, guestsRes, teamMembersRes] = await Promise.all([
      db.from("match_attendance").select("vote, user_id, member_id").eq("match_id", upcomingRaw.id),
      db.from("team_members").select("id").eq("user_id", userId).limit(1).maybeSingle(),
      db.from("match_guests").select("id").eq("match_id", upcomingRaw.id),
      db.from("team_members").select("id, user_id, status").eq("team_id", teamId).in("status", ["ACTIVE", "DORMANT"]),
    ]);
    const voteList = (votesRes.data ?? []) as { vote: string; user_id: string | null; member_id: string | null }[];
    const teamMembers = (teamMembersRes.data ?? []) as { id: string; user_id: string | null; status: string }[];
    // member_id 기준 정규화 (경기 상세와 동일 로직)
    const memberVoteMap = new Map<string, string>();
    for (const v of voteList) {
      if (v.member_id) {
        memberVoteMap.set(v.member_id, v.vote);
      } else if (v.user_id) {
        const member = teamMembers.find((m) => m.user_id === v.user_id);
        if (member) memberVoteMap.set(member.id, v.vote);
      }
    }
    // 카운트 대상: EVENT(팀일정)는 DORMANT 포함, REGULAR/INTERNAL은 ACTIVE만 (경기 상세와 동일)
    const isEvent = upcomingRaw.match_type === "EVENT";
    const countableMemberIds = new Set(
      teamMembers.filter((m) => isEvent || m.status === "ACTIVE").map((m) => m.id)
    );
    const votes = [...memberVoteMap.entries()]
      .filter(([id]) => countableMemberIds.has(id))
      .map(([, vote]) => vote);
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

  type VoteMatchRow = {
    id: string;
    match_date: string;
    match_time: string | null;
    vote_deadline: string;
    opponent_name: string | null;
    match_type: string | null;
  };
  // 상단 "다가오는 경기" 카드와 중복되는 첫 번째 경기는 제외 + 최대 3개
  const voteMatchRows = ((activeVotesRes.data || []) as VoteMatchRow[])
    .filter((m) => !upcomingRaw || m.id !== upcomingRaw.id)
    .slice(0, 3);

  // 활성 팀원 목록 (투표 카운트 정규화용 — 다가오는 경기 카드와 동일 로직)
  const activeMembersForVotesRes = voteMatchRows.length > 0
    ? await db.from("team_members").select("id, user_id, status").eq("team_id", teamId).in("status", ["ACTIVE", "DORMANT"])
    : { data: [] as { id: string; user_id: string | null; status: string }[] };
  const activeMembersForVotes = (activeMembersForVotesRes.data ?? []) as { id: string; user_id: string | null; status: string }[];
  const activeOnlyIdSet = new Set(
    activeMembersForVotes.filter((m) => m.status === "ACTIVE").map((m) => m.id)
  );
  const allMemberIdSet = new Set(activeMembersForVotes.map((m) => m.id));

  const voteCountsByMatch: Record<string, { attend: number; absent: number; undecided: number }> = {};
  if (voteMatchRows.length > 0) {
    const matchIds = voteMatchRows.map((m) => m.id);
    const { data: attRows } = await db
      .from("match_attendance")
      .select("match_id, vote, user_id, member_id")
      .in("match_id", matchIds);
    const rows = (attRows ?? []) as { match_id: string; vote: string; user_id: string | null; member_id: string | null }[];
    for (const m of voteMatchRows) {
      const memberVoteMap = new Map<string, string>();
      for (const r of rows) {
        if (r.match_id !== m.id) continue;
        if (r.member_id) {
          memberVoteMap.set(r.member_id, r.vote);
        } else if (r.user_id) {
          const member = activeMembersForVotes.find((mb) => mb.user_id === r.user_id);
          if (member) memberVoteMap.set(member.id, r.vote);
        }
      }
      // EVENT(팀일정)는 DORMANT 포함, 그 외는 ACTIVE만 카운트
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

  // Check pending tasks
  const tasks: { label: string; href: string }[] = [];

  // 본인 team_members.id 미리 조회 (회비 미납 체크용 — payment_status는 team_members.id 기준)
  const { data: myTm } = await db
    .from("team_members")
    .select("id, role")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .maybeSingle();
  const myTeamMemberId = (myTm as { id?: string } | null)?.id ?? null;
  const myRole = (myTm as { role?: string } | null)?.role ?? "MEMBER";
  const isStaff = myRole === "PRESIDENT" || myRole === "STAFF";

  // KST 기준 이번 달 (YYYY-MM) + 오늘 일(day)
  const kstNowDate = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const currentMonth = `${kstNowDate.getUTCFullYear()}-${String(kstNowDate.getUTCMonth() + 1).padStart(2, "0")}`;
  const todayDay = kstNowDate.getUTCDate();
  // 회비 납부 cutoff: 매월 10일 이후부터 미납 알림 노출 (dues_settings에 due_day 컬럼이 없어 보수적 하드코드)
  const DUES_CUTOFF_DAY = 10;

  const taskChecks = await Promise.all([
    upcomingMatch
      ? db.from("match_attendance").select("vote").eq("match_id", upcomingMatch.id).eq("user_id", userId).maybeSingle()
      : Promise.resolve({ data: true }),
    recentMatch
      ? db.from("match_mvp_votes").select("id").eq("match_id", recentMatch.id).eq("voter_id", userId).maybeSingle()
      : Promise.resolve({ data: true }),
    // 프로필 완성도
    db.from("users").select("is_profile_complete").eq("id", userId).maybeSingle(),
    // 팀 회비 설정 존재 여부 (회비 미납·OCR 미처리 두 항목 공통, __PERIOD__ 메타 행 제외)
    db.from("dues_settings").select("id", { count: "exact", head: true }).eq("team_id", teamId).neq("member_type", "__PERIOD__"),
    // 본인 이번 달 납부 상태
    myTeamMemberId
      ? db.from("dues_payment_status").select("status").eq("team_id", teamId).eq("member_id", myTeamMemberId).eq("month", currentMonth).maybeSingle()
      : Promise.resolve({ data: null }),
    // 본인 활성 면제 (start_date <= 이번 달 말, end_date >= 이번 달 1일)
    myTeamMemberId
      ? db.from("member_dues_exemptions").select("id, start_date, end_date").eq("team_id", teamId).eq("member_id", myTeamMemberId).eq("is_active", true)
      : Promise.resolve({ data: [] }),
    // 회비 OCR 미처리 (운영진 전용): 이번 달 dues_records 건수 조회
    isStaff
      ? db.from("dues_records").select("id", { count: "exact", head: true }).eq("team_id", teamId).gte("recorded_at", `${currentMonth}-01T00:00:00+09:00`)
      : Promise.resolve({ count: 0 }),
    // 회비 OCR 기준 C — 이번 달 활성 멤버 수 (전체 ACTIVE/DORMANT)
    isStaff
      ? db.from("team_members").select("id", { count: "exact", head: true }).eq("team_id", teamId).in("status", ["ACTIVE", "DORMANT"])
      : Promise.resolve({ count: 0 }),
    // 회비 OCR 기준 C — 이번 달 PAID 인원수
    isStaff
      ? db.from("dues_payment_status").select("id", { count: "exact", head: true }).eq("team_id", teamId).eq("month", currentMonth).eq("status", "PAID")
      : Promise.resolve({ count: 0 }),
    // 가입 대기자 (운영진 전용)
    isStaff
      ? db.from("team_join_requests").select("id", { count: "exact", head: true }).eq("team_id", teamId).eq("status", "PENDING")
      : Promise.resolve({ count: 0 }),
  ]);

  // 1·2번: 기존 항목 (전체 회원)
  if (upcomingMatch && !taskChecks[0].data) {
    tasks.push({ label: "다음 경기 참석 투표 완료하기", href: `/matches/${upcomingMatch.id}?tab=vote` });
  }
  if (recentMatch && !taskChecks[1].data) {
    tasks.push({ label: "최근 경기 MVP 투표 완료하기", href: `/matches/${recentMatch.id}?tab=record` });
  }

  // 3번: 프로필 완성하기
  const profileRow = (taskChecks[2] as { data: { is_profile_complete?: boolean } | null }).data;
  if (profileRow && profileRow.is_profile_complete === false) {
    tasks.push({ label: "프로필 완성하기", href: "/settings" });
  }

  // 4번: 본인 회비 미납 (정의 B — dues_settings 있음 + 납부 cutoff 지남 + PAID/EXEMPT 아님 + 면제 없음)
  const hasDuesSettings = ((taskChecks[3] as { count: number | null }).count ?? 0) > 0;
  const myPaymentRow = (taskChecks[4] as { data: { status?: string } | null }).data;
  const myExemptions = ((taskChecks[5] as { data: { start_date: string; end_date: string | null }[] | null }).data ?? []) as { start_date: string; end_date: string | null }[];
  const monthStart = `${currentMonth}-01`;
  const lastDay = new Date(kstNowDate.getUTCFullYear(), kstNowDate.getUTCMonth() + 1, 0).getDate();
  const monthEnd = `${currentMonth}-${String(lastDay).padStart(2, "0")}`;
  const hasActiveExemption = myExemptions.some((ex) => ex.start_date <= monthEnd && (ex.end_date === null || ex.end_date >= monthStart));
  const myStatus = myPaymentRow?.status ?? null;
  const isPaidOrExempt = myStatus === "PAID" || myStatus === "EXEMPT" || hasActiveExemption;
  if (hasDuesSettings && myTeamMemberId && todayDay >= DUES_CUTOFF_DAY && !isPaidOrExempt) {
    tasks.push({ label: "이번 달 회비 납부 확인", href: "/dues?tab=status" });
  }

  // 5번: 회비 영수증 업로드 (운영진 전용, 기준 C)
  // 조건: dues_settings 있음 + cutoff 지남 + 이번 달 dues_records 0건 OR PAID 비율 50% 미만
  if (isStaff && hasDuesSettings && todayDay >= DUES_CUTOFF_DAY) {
    const monthRecordCount = (taskChecks[6] as { count: number | null }).count ?? 0;
    const memberCount = (taskChecks[7] as { count: number | null }).count ?? 0;
    const paidCount = (taskChecks[8] as { count: number | null }).count ?? 0;
    const paidRatio = memberCount > 0 ? paidCount / memberCount : 0;
    if (monthRecordCount === 0 || paidRatio < 0.5) {
      tasks.push({ label: "회비 영수증 업로드", href: "/dues?tab=bulk" });
    }
  }

  // 6번: 가입 대기자 승인 (운영진 전용)
  if (isStaff) {
    const pendingCount = (taskChecks[9] as { count: number | null }).count ?? 0;
    if (pendingCount > 0) {
      tasks.push({ label: `가입 대기자 ${pendingCount}명 승인`, href: "/members" });
    }
  }

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
