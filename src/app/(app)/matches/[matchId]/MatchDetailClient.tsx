"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { AttendingPlayer } from "@/components/AutoFormationBuilder";
import { useApi, apiMutate } from "@/lib/useApi";
import { isStaffOrAbove } from "@/lib/permissions";
import { useViewAsRole } from "@/lib/ViewAsRoleContext";
import type { Role, DetailedPosition } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ChevronLeft, Check, Info, Vote, LayoutGrid, UserCheck, FileEdit, MessageSquare } from "lucide-react";
import { useConfirm } from "@/lib/ConfirmContext";
import { useToast } from "@/lib/ToastContext";
import Link from "next/link";
import type { SportType } from "@/lib/types";

/* ── 공유 타입 & 매퍼 ── */
import type {
  MatchRow,
  GoalRow,
  MvpVoteRow,
  AttendanceRow,
  GuestRow,
  AttendanceVoteRow,
  DiaryRow,
  MemberRow,
} from "./matchDetailTypes";
import {
  emptyMatch,
  mapMatch,
  mapGoal,
  mapGuest,
  mapDiary,
  mapVotes,
  mapAttendance,
} from "./matchDetailTypes";

/* ── 탭 컴포넌트 ──
 * info/vote는 기본 진입 탭이라 eager 유지.
 * tactics/record/diary는 무거우므로 dynamic import + 조건부 렌더링으로
 * 초기 JS 번들·TBT를 줄임. */
import { MatchInfoTab } from "./MatchInfoTab";
import { MatchVoteTab } from "./MatchVoteTab";

const MatchTacticsTab = dynamic(
  () => import("./MatchTacticsTab").then((m) => m.MatchTacticsTab),
  { ssr: false, loading: () => <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground"><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round"/></svg>전술판 불러오는 중...</div> }
);
const MatchRecordTab = dynamic(
  () => import("./MatchRecordTab").then((m) => m.MatchRecordTab),
  { ssr: false, loading: () => <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground"><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round"/></svg>기록 불러오는 중...</div> }
);
const MatchDiaryTab = dynamic(
  () => import("./MatchDiaryTab").then((m) => m.MatchDiaryTab),
  { ssr: false, loading: () => <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground"><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round"/></svg>후기 불러오는 중...</div> }
);
const MatchAttendanceTab = dynamic(
  () => import("./MatchAttendanceTab").then((m) => m.MatchAttendanceTab),
  { ssr: false, loading: () => <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground"><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round"/></svg>출석 불러오는 중...</div> }
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InitialData = Record<string, any> | null;

export default function MatchDetailClient({
  matchId,
  userId,
  userRole,
  initialData,
  todayIso,
  enableAi = false,
}: {
  matchId: string;
  userId: string;
  userRole?: Role;
  initialData?: InitialData;
  todayIso: string;
  enableAi?: boolean;
}) {
  /* ── API fetches (SSR initialData가 있으면 skip) ── */
  const {
    data: matchesData,
    loading: matchesLoading,
    refetch: refetchMatches,
  } = useApi<{ matches: MatchRow[] }>("/api/matches", initialData?.matches ?? { matches: [] }, { skip: !!initialData?.matches });

  const {
    data: goalsData,
    refetch: refetchGoals,
  } = useApi<{ goals: GoalRow[] }>(`/api/goals?matchId=${matchId}`, initialData?.goals ?? { goals: [] }, { skip: !!initialData?.goals });

  const {
    data: mvpData,
    refetch: refetchMvp,
  } = useApi<{ votes: MvpVoteRow[] }>(`/api/mvp?matchId=${matchId}`, initialData?.mvp ?? { votes: [] }, { skip: !!initialData?.mvp });

  const {
    data: attendanceData,
    refetch: refetchAttendance,
  } = useApi<{ attendance: AttendanceRow[] }>(`/api/attendance-check?matchId=${matchId}`, initialData?.attendanceCheck ?? { attendance: [] }, { skip: !!initialData?.attendanceCheck });

  const {
    data: guestsData,
    refetch: refetchGuests,
  } = useApi<{ guests: GuestRow[] }>(`/api/guests?matchId=${matchId}`, initialData?.guests ?? { guests: [] }, { skip: !!initialData?.guests });

  // 자체전 팀 편성 데이터
  const {
    data: internalTeamsData,
    refetch: refetchInternalTeams,
  } = useApi<{ teams: { player_id: string; side: "A" | "B" }[] }>(`/api/internal-teams?matchId=${matchId}`, initialData?.internalTeams ?? { teams: [] }, { skip: !!initialData?.internalTeams });

  // 댓글
  const {
    data: commentsData,
    refetch: refetchComments,
  } = useApi<{ comments: { id: string; user_id: string; content: string; created_at: string; users: { name: string } | null }[] }>(
    `/api/match-comments?matchId=${matchId}`,
    initialData?.comments ?? { comments: [] },
    { skip: !!initialData?.comments },
  );

  const {
    data: diaryData,
    refetch: refetchDiary,
  } = useApi<{ diary: DiaryRow }>(`/api/diary?matchId=${matchId}`, initialData?.diary ?? { diary: null }, { skip: !!initialData?.diary });

  const {
    data: membersData,
  } = useApi<{ members: MemberRow[] }>("/api/members", initialData?.members ?? { members: [] }, { skip: !!initialData?.members });

  // team 데이터는 SSR initialData 가 비어있는 케이스가 있어 skip 강제 해제 — client 에서 실제 값 덮어쓰기 보장.
  // (일정 목록은 서버에서 teamUniform prop 직접 전달해 정상이지만 여기는 useApi 경유)
  const {
    data: teamData,
  } = useApi<{ team: { sport_type?: SportType; player_count?: number; uniform_primary?: string; uniform_secondary?: string; uniform_pattern?: string; uniforms?: { home?: { primary: string; secondary: string; pattern: string }; away?: { primary: string; secondary: string; pattern: string }; third?: { primary: string; secondary: string; pattern: string } | null } | null; default_formation_id?: string; stats_recording_staff_only?: boolean; mvp_vote_staff_only?: boolean; player_rating_enabled?: boolean } }>(
    "/api/teams",
    initialData?.team ?? { team: {} },
    // SSR initialData 의 team.sport_type 이 실제로 채워진 경우만 skip — 빈 객체({})면 client fetch
    { skip: !!initialData?.team?.team?.sport_type },
  );

  // 경기 sport_type 우선 → 팀 sport_type fallback (기존 경기 호환)
  const matchRow = matchesData.matches.find((m) => m.id === matchId);
  const matchSportType = (matchRow?.sport_type as SportType | null | undefined) ?? null;
  const sportType: SportType = matchSportType ?? teamData.team?.sport_type ?? "SOCCER";
  // AI 코치 분석 + AI Full Plan: 축구·풋살 모두 활성 (풋살 포메이션 4종 formations.ts 등록 완료).
  const effectiveEnableAi = enableAi;
  // 경기 후기 자동 생성 — 25차에 LLM 제거되고 템플릿(generateMatchSummaryFromTemplate)으로 전환됨.
  // 41차에 enableAiSummary=false 로 막혔으나 템플릿은 비용·지연 0 이라 막을 이유 없음.
  // false 일 땐 MatchDiaryTab 의 자동 트리거 useEffect 가 즉시 return → 후기 영역 자체가 안 뜸 (45차 사고).
  const enableAiSummary = true;
  const uniforms = teamData.team?.uniforms;
  // fallback 색을 중립 회색으로 — 기존 hsl(var(--primary))=coral(주황), hsl(var(--muted-foreground))=회색
  // 은 팀 유니폼과 쉽게 혼동됨 (사용자가 주황+회색 본 원인).
  const uniformPrimary = uniforms?.home?.primary ?? teamData.team?.uniform_primary ?? "#9ca3af";
  const uniformSecondary = uniforms?.home?.secondary ?? teamData.team?.uniform_secondary ?? "#6b7280";
  const uniformPattern = uniforms?.home?.pattern ?? teamData.team?.uniform_pattern ?? "SOLID";
  const defaultFormationId = teamData.team?.default_formation_id ?? "";
  const statsRecordingStaffOnly = teamData.team?.stats_recording_staff_only ?? false;
  const mvpVoteStaffOnly = teamData.team?.mvp_vote_staff_only ?? false;
  const playerRatingEnabled = teamData.team?.player_rating_enabled ?? false;

  const {
    data: voteData,
    refetch: refetchVote,
  } = useApi<{ attendance: AttendanceVoteRow[] }>(
    `/api/attendance?matchId=${matchId}`,
    initialData?.vote ?? { attendance: [] },
    { skip: !!initialData?.vote },
  );

  /* ── Map API data to client types ── */
  const match = useMemo(() => {
    const row = matchesData.matches.find((m) => m.id === matchId);
    return row ? mapMatch(row) : emptyMatch;
  }, [matchesData.matches, matchId]);

  const goals = useMemo(
    () => goalsData.goals.map(mapGoal),
    [goalsData.goals],
  );

  const votes = useMemo(
    () => mapVotes(mvpData.votes),
    [mvpData.votes],
  );

  const attendance = useMemo(
    () => mapAttendance(attendanceData.attendance),
    [attendanceData.attendance],
  );

  /* ── 현재 사용자의 team_members.id 매핑 (역할 가이드용) ── */
  const currentMemberId = useMemo(() => {
    const self = membersData.members.find((m) => m.users?.id === userId);
    return self?.id;
  }, [membersData.members, userId]);

  /* ── 본인 참석 여부 — 실제 출석 체크(PRESENT/LATE) 또는 참석 투표(ATTEND) ──
   * 경기 전·출석 체크 전에는 status가 비어 있으므로 vote도 함께 본다.
   * attendingPlayers가 vote === "ATTEND" 기준으로 만들어지는 것과 일관 유지. */
  const currentMemberAttended = useMemo(() => {
    const byUser = attendance[userId];
    const byMember = currentMemberId ? attendance[currentMemberId] : undefined;
    const status = byUser ?? byMember;
    if (status === "PRESENT" || status === "LATE") return true;
    return voteData.attendance.some(
      (a) =>
        a.vote === "ATTEND" &&
        ((a.user_id && a.user_id === userId) ||
          (a.member_id && currentMemberId && a.member_id === currentMemberId))
    );
  }, [attendance, voteData.attendance, userId, currentMemberId]);

  const guests = useMemo(
    () => guestsData.guests.map(mapGuest),
    [guestsData.guests],
  );

  const internalTeams = useMemo(
    () => internalTeamsData.teams.map((t) => ({ playerId: t.player_id, side: t.side })),
    [internalTeamsData.teams],
  );

  const diary = useMemo(
    () => mapDiary(diaryData.diary),
    [diaryData.diary],
  );

  /* ── 휴면 회원 ID 셋 (자동 편성/전술판에서 제외용) ── */
  const dormantIds = useMemo(() => {
    const ids = new Set<string>();
    for (const m of membersData.members) {
      if (m.status === "DORMANT") {
        ids.add(m.users?.id ?? m.id);
        ids.add(m.id);
      }
    }
    return ids;
  }, [membersData.members]);

  /* ── Attending players for auto formation ── */
  const attendingPlayers = useMemo<AttendingPlayer[]>(() => {
    // 참석 투표한 선수 (연동 + 미연동 모두, 휴면 회원 제외)
    const members: AttendingPlayer[] = voteData.attendance
      .filter((a) => a.vote === "ATTEND")
      .filter((a) => !dormantIds.has(a.user_id ?? "") && !dormantIds.has(a.member_id ?? ""))
      .map((a) => {
        const memberData = a.member;
        const userData = a.users ?? memberData?.users;
        const name = userData?.name ?? memberData?.pre_name ?? "멤버";
        const coachPos = memberData?.coach_positions;
        const playerPos = userData?.preferred_positions ?? [];
        const positions = (coachPos && coachPos.length > 0 ? coachPos : playerPos) as string[];
        const pos = positions[0] ?? "CAM";
        const id = a.user_id ?? a.member_id ?? a.id;
        return {
          id, name,
          preferredPosition: pos as AttendingPlayer["preferredPosition"],
          preferredPositions: positions.length > 0 ? positions as AttendingPlayer["preferredPosition"][] : undefined,
          isGuest: false,
          // 양쪽 ID 모두 보존 — 전술판이 user_id/member_id 어느 쪽으로 저장됐어도 매칭 가능
          userId: a.user_id ?? undefined,
          memberId: a.member_id ?? undefined,
        };
      });
    // 용병 추가
    const guestPlayers: AttendingPlayer[] = guests.map((g) => {
      const positions = g.position?.split(",").map((p: string) => p.trim()).filter(Boolean) ?? [];
      return {
        id: g.id,
        name: g.name,
        preferredPosition: (positions[0] || "CAM") as AttendingPlayer["preferredPosition"],
        preferredPositions: positions.length > 0 ? positions as AttendingPlayer["preferredPosition"][] : undefined,
        isGuest: true,
      };
    });
    return [...members, ...guestPlayers];
  }, [voteData.attendance, guests, dormantIds]);

  /* ── Vote 운영진 패널 state (탭 unmount 후에도 검색/필터/정렬 유지하려고 부모에서 보유) ── */
  const [voteSearch, setVoteSearch] = useState("");
  const [voteFilter, setVoteFilter] = useState<"all" | "unvoted">("all");
  const [voteSortBy, setVoteSortBy] = useState<"none" | "name-asc" | "name-desc" | "time-asc" | "time-desc">("none");

  /* ── Tab state ──
   * SSR HTML 과 hydration 첫 렌더가 항상 일치하도록 useState 초기값은 고정 "info".
   * URL ?tab= 동기화는 mount 후 useEffect 에서 1회 수행 → hydration mismatch 회피.
   * (이전엔 useState 초기값에서 searchParams.get 을 직접 읽었는데, 진짜 조건부 렌더로 바뀌면서
   *  SSR/CSR 초기 mount 컴포넌트가 달라질 위험이 생김.) */
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const validTabs = ["info", "vote", "tactics", "attendance", "record", "diary"] as const;
  type TabKey = (typeof validTabs)[number];
  const [activeTab, setActiveTabState] = useState<TabKey>("info");
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab") as TabKey | null;
    if (tabFromUrl && validTabs.includes(tabFromUrl) && tabFromUrl !== activeTab) {
      setActiveTabState(tabFromUrl);
    }
    // 의도: URL ?tab 변경 시 동기화. activeTab 자체는 deps 에서 제외 (사용자 클릭으로 변경된 직후 useEffect 가 다시 덮어쓰지 않게).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const setActiveTab = useCallback((tab: TabKey) => {
    setActiveTabState(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  const { effectiveRole } = useViewAsRole();
  const role = effectiveRole(userRole);
  const canManageAttendance = isStaffOrAbove(role);
  const canManage = isStaffOrAbove(role);
  // 팀 설정에서 stats_recording_staff_only 가 켜져 있으면 STAFF 이상만 기록 가능
  const canRecord = statsRecordingStaffOnly ? isStaffOrAbove(role) : true;
  // MVP 투표 권한: mvp_vote_staff_only 켜져 있으면 STAFF 이상만 가능
  const canVoteMvp = mvpVoteStaffOnly ? isStaffOrAbove(role) : true;
  // 운영진 즉시 확정 권한은 mvp_vote_staff_only=ON 일 때만 작동.
  // OFF 면 운영진도 일반 회원처럼 1인 1표 (70% 룰 적용).
  const isStaffVoter = mvpVoteStaffOnly && isStaffOrAbove(role);
  const confirm = useConfirm();
  const { showToast } = useToast();
  const [loadingAllPresent, setLoadingAllPresent] = useState(false);

  // 휴면 데이터 — DORMANT 멤버를 exemptions 맵으로 변환
  // EVENT(팀일정)는 휴면회원도 투표 가능 → exemptions 비워 둠
  const exemptions = useMemo<Record<string, { type: string; reason: string | null; endDate: string | null }>>(() => {
    const map: Record<string, { type: string; reason: string | null; endDate: string | null }> = {};
    if (match.matchType === "EVENT") return map;
    for (const m of membersData.members) {
      if (m.status === "DORMANT") {
        map[m.users?.id ?? m.id] = {
          type: m.dormant_type ?? "DORMANT",
          reason: m.dormant_reason ?? null,
          endDate: m.dormant_until ?? null,
        };
      }
    }
    return map;
  }, [membersData.members, match.matchType]);

  /* ── Attendance handler (출석 탭용) ── */
  const handleAttendance = useCallback(async (player: { id: string; memberId?: string; isLinked?: boolean }, status: "PRESENT" | "ABSENT" | "LATE") => {
    await apiMutate("/api/attendance-check", "POST", {
      matchId,
      ...(player.isLinked !== false ? { userId: player.id } : { memberId: player.memberId }),
      status,
    });
    await refetchAttendance();
  }, [matchId, refetchAttendance]);

  const baseRoster = useMemo(
    () =>
      membersData.members.map((m) => {
        const coachPos = (m.coach_positions ?? []) as DetailedPosition[];
        const playerPrefs = (m.users?.preferred_positions ?? []) as DetailedPosition[];
        // 감독 지정 포지션 우선, 없으면 선수 본인 선호 (자동 배치와 동일 기준)
        const prefs = coachPos.length > 0 ? coachPos : playerPrefs;
        return {
          id: m.users?.id ?? m.id,
          memberId: m.id,
          name: m.users?.name ?? m.pre_name ?? "미연동 멤버",
          role: (prefs[0] ?? "MF") as DetailedPosition,
          preferredPositions: prefs.length > 0 ? prefs : undefined,
          isLinked: m.users != null,
        };
      }),
    [membersData.members],
  );

  /** 참석 투표한 멤버 ID 셋 (baseRoster의 id 기준, 휴면 회원 제외) */
  const attendingIds = useMemo(() => {
    const ids = new Set<string>();
    for (const a of voteData.attendance.filter((v) => v.vote === "ATTEND")) {
      if (a.member_id) {
        if (dormantIds.has(a.member_id)) continue;
        const member = membersData.members.find((m) => m.id === a.member_id);
        if (member) ids.add(member.users?.id ?? member.id);
      } else if (a.user_id) {
        if (dormantIds.has(a.user_id)) continue;
        ids.add(a.user_id);
      }
    }
    return ids;
  }, [voteData.attendance, membersData.members, dormantIds]);

  /** 참석 투표(vote=ATTEND) 멤버 — 출석 체크 UI / 전술판 roster 용 */
  const attendingMembers = useMemo(
    () => baseRoster.filter((m) => attendingIds.has(m.id)),
    [baseRoster, attendingIds]
  );

  /**
   * 실제 참석 멤버 — attendance_status=PRESENT/LATE — MVP 후보용.
   * baseRoster.id 가 user_id 우선이라 attendingIds 와 동일하게 user_id 변환 필수.
   */
  const presentMemberIds = useMemo(() => {
    const ids = new Set<string>();
    for (const a of voteData.attendance) {
      if (a.attendance_status !== "PRESENT" && a.attendance_status !== "LATE") continue;
      if (a.member_id) {
        if (dormantIds.has(a.member_id)) continue;
        const member = membersData.members.find((m) => m.id === a.member_id);
        if (member) ids.add(member.users?.id ?? member.id);
      } else if (a.user_id) {
        if (dormantIds.has(a.user_id)) continue;
        ids.add(a.user_id);
      }
    }
    return ids;
  }, [voteData.attendance, membersData.members, dormantIds]);

  const presentMembers = useMemo(
    () => baseRoster.filter((m) => presentMemberIds.has(m.id)),
    [baseRoster, presentMemberIds]
  );

  /** 전술판 roster: 참석 멤버 + 용병 */
  const roster = useMemo(() => {
    const guestRoster = guests.map((g) => {
      const positions = (g.position?.split(",").map((s) => s.trim()).filter(Boolean) ?? []) as DetailedPosition[];
      return {
        id: g.id,
        name: g.name,
        role: (positions[0] || "MF") as DetailedPosition,
        preferredPositions: positions.length > 0 ? positions : undefined,
      };
    });
    return [...attendingMembers, ...guestRoster];
  }, [attendingMembers, guests]);

  /** 전체 로스터 (골 기록 시 이름 해석용) */
  const fullRoster = useMemo(() => {
    const guestRoster = guests.map((g) => {
      const positions = (g.position?.split(",").map((s) => s.trim()).filter(Boolean) ?? []) as DetailedPosition[];
      return {
        id: g.id,
        name: g.name,
        role: (positions[0] || "MF") as DetailedPosition,
        preferredPositions: positions.length > 0 ? positions : undefined,
      };
    });
    return [...baseRoster, ...guestRoster];
  }, [baseRoster, guests]);

  const score = useMemo(() => {
    if (match.matchType === "INTERNAL") {
      const aGoals = goals.filter((g) => g.side === "A").length;
      const bGoals = goals.filter((g) => g.side === "B").length;
      return `${aGoals} : ${bGoals}`;
    }
    const ourGoals = goals.filter((g) => g.scorerId !== "OPPONENT" && !g.isOwnGoal).length
      + goals.filter((g) => g.scorerId === "OPPONENT" && g.isOwnGoal).length;
    const oppGoals = goals.filter((g) => g.scorerId === "OPPONENT" && !g.isOwnGoal).length
      + goals.filter((g) => g.scorerId !== "OPPONENT" && g.isOwnGoal).length;
    return `${ourGoals} : ${oppGoals}`;
  }, [goals, match.matchType]);

  /** 멤버별 현재 참석투표 상태 (member_id 기반) */
  const memberVoteMap = useMemo(() => {
    const map: Record<string, "ATTEND" | "ABSENT" | "MAYBE"> = {};
    for (const a of voteData.attendance) {
      if (a.member_id) {
        map[a.member_id] = a.vote;
      } else if (a.user_id) {
        const member = membersData.members.find((m) => m.users?.id === a.user_id);
        if (member) map[member.id] = a.vote;
      }
    }
    return map;
  }, [voteData.attendance, membersData.members]);

  /** 멤버별 투표 시간 */
  const memberVoteTimeMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const a of voteData.attendance) {
      const votedAt = a.voted_at ?? "";
      if (a.member_id) {
        map[a.member_id] = votedAt;
      } else if (a.user_id) {
        const member = membersData.members.find((m) => m.users?.id === a.user_id);
        if (member) map[member.id] = votedAt;
      }
    }
    return map;
  }, [voteData.attendance, membersData.members]);

  const voteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(votes).forEach((id) => {
      counts[id] = (counts[id] ?? 0) + 1;
    });
    return counts;
  }, [votes]);

  /* ── 참석투표 대리 관리 (운영진 이상) ── */
  const handleProxyVote = useCallback(async (memberId: string, vote: "ATTEND" | "ABSENT" | "MAYBE") => {
    await apiMutate("/api/attendance", "POST", { matchId, vote, memberId });
    await refetchVote();
  }, [matchId, refetchVote]);

  /* ── 용병 삭제 ── */
  const handleRemoveGuest = useCallback(async (guestId: string) => {
    await apiMutate(`/api/guests?id=${guestId}`, "DELETE");
    await refetchGuests();
  }, [refetchGuests]);

  /* ── Loading state: only block on primary match data ── */
  if (matchesLoading) {
    return (
      <div className="grid gap-5 stagger-children">
        <Card><CardHeader><Skeleton className="h-3 w-20" /><Skeleton className="mt-2 h-8 w-48" /></CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-20 w-full rounded-lg" />
            <div className="flex gap-2"><Skeleton className="h-10 w-24" /><Skeleton className="h-10 w-24" /><Skeleton className="h-10 w-24" /></div>
          </CardContent>
        </Card>
        <Card><CardContent className="p-4 space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </CardContent></Card>
        <Card><CardContent className="p-4 space-y-3">
          <Skeleton className="h-4 w-32" />
          {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="grid gap-5 stagger-children min-w-0 overflow-x-hidden">
      {/* ── Back Navigation ── */}
      <div className="flex items-center gap-2 -mt-1 mb-1">
        <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" asChild>
          <Link href="/matches">
            <ChevronLeft className="h-4 w-4" />
            일정 목록
          </Link>
        </Button>
      </div>

      {/* ── Sticky Tab Bar — 7탭 모두 균등 분할 (370px도 fit) ── */}
      <div className="sticky top-0 z-10 -mx-1 px-1 bg-background/90 backdrop-blur-md">
        <div className="flex border-b border-border/50" role="tablist" aria-label="경기 상세 탭">
          {([
            { key: "info", label: "정보", Icon: Info },
            { key: "vote", label: "투표", Icon: Vote },
            ...(match.matchType !== "EVENT" ? ([
              { key: "tactics" as const, label: "전술", Icon: LayoutGrid },
              ...(canManageAttendance ? [{ key: "attendance" as const, label: "출석", Icon: UserCheck }] : []),
              { key: "record" as const, label: "기록", Icon: FileEdit },
              { key: "diary" as const, label: "후기", Icon: MessageSquare },
            ] as const) : []),
          ] as const).map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="relative flex-1 min-w-0 py-2.5 px-0.5 text-center text-[11.5px] font-medium transition-all min-h-[52px] flex flex-col items-center justify-center gap-0.5"
              style={{ color: activeTab === tab.key ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}
            >
              <tab.Icon className="h-[18px] w-[18px]" />
              <span className="truncate max-w-full">{tab.label}</span>
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full" style={{ backgroundColor: "hsl(var(--primary))" }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab: 기본 정보 ──
       * 진짜 조건부 렌더 (이전엔 className=hidden 으로 항상 mount).
       * 사용자가 다른 탭만 보면 MatchInfoTab(656줄) 코드 hydration 안 됨 → 첫 진입 부담 감소. */}
      {activeTab === "info" && (
        <MatchInfoTab
          matchId={matchId}
          userId={userId}
          match={match}
          canManage={canManage}
          baseRoster={baseRoster}
          memberVoteMap={memberVoteMap}
          memberVoteTimeMap={memberVoteTimeMap}
          guests={guests}
          refetchVote={refetchVote}
          refetchGuests={refetchGuests}
          refetchMatches={refetchMatches}
          handleProxyVote={handleProxyVote}
          handleRemoveGuest={handleRemoveGuest}
          uniformPrimary={uniformPrimary}
          uniformSecondary={uniformSecondary}
          uniformPattern={uniformPattern}
          uniforms={uniforms}
          internalTeams={internalTeams}
          refetchInternalTeams={refetchInternalTeams}
          comments={commentsData.comments}
          refetchComments={refetchComments}
          goals={goals}
          sportType={sportType}
          todayIso={todayIso}
          initialWeather={initialData?.weather ?? null}
        />
      )}

      {/* ── Tab: 투표 ──
       * 진짜 조건부 렌더. 멤버는 운영진 전용 코드 hydration X.
       * 단 검색/필터/정렬 state 는 부모에서 보유 → 탭 이동해도 운영진 입력 유지. */}
      {activeTab === "vote" && (
        <MatchVoteTab
          matchId={matchId}
          userId={userId}
          match={match}
          canManage={canManage}
          baseRoster={baseRoster}
          memberVoteMap={memberVoteMap}
          memberVoteTimeMap={memberVoteTimeMap}
          guestCount={guests.length}
          refetchVote={refetchVote}
          handleProxyVote={handleProxyVote}
          exemptions={exemptions}
          voteSearch={voteSearch}
          setVoteSearch={setVoteSearch}
          voteFilter={voteFilter}
          setVoteFilter={setVoteFilter}
          voteSortBy={voteSortBy}
          setVoteSortBy={setVoteSortBy}
        />
      )}

      {/* ── Tab: 전술판 ── */}
      {activeTab === "tactics" && (
        <div className="min-w-0">
          <MatchTacticsTab
            matchId={matchId}
            match={match}
            canManage={canManage}
            attendingPlayers={attendingPlayers}
            roster={roster}
            sportType={sportType}
            defaultFormationId={defaultFormationId}
            internalTeams={internalTeams}
            refetchInternalTeams={refetchInternalTeams}
            guests={guests}
            refetchGuests={refetchGuests}
            handleRemoveGuest={handleRemoveGuest}
            enableAi={effectiveEnableAi}
            currentUserId={userId}
            currentMemberId={currentMemberId}
            currentMemberAttended={currentMemberAttended}
            teamSettings={{
              uniformPrimary,
              uniformSecondary,
              uniformPattern: uniformPattern as "SOLID" | "STRIPES_VERTICAL" | "STRIPES_HORIZONTAL" | "STRIPES_DIAGONAL",
              uniforms: uniforms ?? null,
            }}
          />
        </div>
      )}

      {/* ── Tab: 출석 체크 ──
       * 진짜 조건부 + dynamic import. 출석 탭 안 보면 코드 다운로드·hydration 모두 X. */}
      {activeTab === "attendance" && (
        <MatchAttendanceTab
          attendingMembers={attendingMembers}
          attendance={attendance}
          canManageAttendance={canManageAttendance}
          handleAttendance={handleAttendance}
        />
      )}

      {/* ── Tab: 경기 기록 ── */}
      {activeTab === "record" && (
        <div>
          <MatchRecordTab
            matchId={matchId}
            userId={userId}
            match={match}
            goals={goals}
            guests={guests}
            canRecord={canRecord}
            attendingMembers={attendingMembers}
            fullRoster={fullRoster}
            refetchGoals={refetchGoals}
            internalTeams={internalTeams}
          />
        </div>
      )}

      {/* ── Tab: 일지 ── */}
      {activeTab === "diary" && (
        <div>
          <MatchDiaryTab
            matchId={matchId}
            userId={userId}
            match={match}
            diary={diary}
            score={score}
            canManage={canManage}
            fullRoster={fullRoster}
            voteCounts={voteCounts}
            votes={votes}
            canVoteMvp={canVoteMvp}
            isStaffVoter={isStaffVoter}
            attendeeCount={presentMembers.length}
            attendingMembers={attendingMembers}
            mvpCandidates={presentMembers}
            refetchDiary={refetchDiary}
            refetchMvp={refetchMvp}
            aiSummary={initialData?.aiSummary ?? null}
            canRegenerateAi={enableAiSummary}
            aiSummaryRegenerateCount={initialData?.aiSummaryRegenerateCount ?? 0}
            playerRatingEnabled={playerRatingEnabled}
            canRatePlayers={isStaffOrAbove(role)}
          />
        </div>
      )}
    </div>
  );
}
