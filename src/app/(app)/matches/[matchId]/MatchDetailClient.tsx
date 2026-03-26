"use client";

import { useMemo, useState, useCallback } from "react";
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
import { useRealtimeSubscription } from "@/lib/useRealtimeSubscription";
import { ChevronLeft } from "lucide-react";
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

/* ── 탭 컴포넌트 ── */
import { MatchInfoTab } from "./MatchInfoTab";
import { MatchTacticsTab } from "./MatchTacticsTab";
import { MatchRecordTab } from "./MatchRecordTab";
import { MatchDiaryTab } from "./MatchDiaryTab";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InitialData = Record<string, any> | null;

export default function MatchDetailClient({
  matchId,
  userId,
  userRole,
  initialData,
}: {
  matchId: string;
  userId: string;
  userRole?: Role;
  initialData?: InitialData;
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

  // 실시간 동기화: 참석투표, 골 기록, MVP 투표
  useRealtimeSubscription({
    table: "match_attendance",
    filter: `match_id=eq.${matchId}`,
    events: ["INSERT", "UPDATE"],
    onchange: () => refetchAttendance(),
  });
  useRealtimeSubscription({
    table: "match_goals",
    filter: `match_id=eq.${matchId}`,
    events: ["INSERT", "UPDATE", "DELETE"],
    onchange: () => refetchGoals(),
  });
  useRealtimeSubscription({
    table: "match_mvp_votes",
    filter: `match_id=eq.${matchId}`,
    events: ["INSERT", "DELETE"],
    onchange: () => refetchMvp(),
  });

  const {
    data: diaryData,
    refetch: refetchDiary,
  } = useApi<{ diary: DiaryRow }>(`/api/diary?matchId=${matchId}`, initialData?.diary ?? { diary: null }, { skip: !!initialData?.diary });

  const {
    data: membersData,
  } = useApi<{ members: MemberRow[] }>("/api/members", initialData?.members ?? { members: [] }, { skip: !!initialData?.members });

  const {
    data: teamData,
  } = useApi<{ team: { sport_type?: SportType; player_count?: number; uniform_primary?: string; uniform_secondary?: string; uniform_pattern?: string } }>("/api/teams", initialData?.team ?? { team: {} }, { skip: !!initialData?.team });

  const sportType: SportType = teamData.team?.sport_type ?? "SOCCER";
  const uniformPrimary = teamData.team?.uniform_primary ?? "#2563eb";
  const uniformSecondary = teamData.team?.uniform_secondary ?? "#f97316";
  const uniformPattern = teamData.team?.uniform_pattern ?? "SOLID";

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

  /* ── Attending players for auto formation ── */
  const attendingPlayers = useMemo<AttendingPlayer[]>(() => {
    // 참석 투표한 선수 (연동 + 미연동 모두)
    const members: AttendingPlayer[] = voteData.attendance
      .filter((a) => a.vote === "ATTEND")
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
      };
    });
    return [...members, ...guestPlayers];
  }, [voteData.attendance, guests]);

  /* ── Tab state ── */
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const validTabs = ["info", "tactics", "record", "diary"] as const;
  type TabKey = (typeof validTabs)[number];
  const tabFromUrl = searchParams.get("tab") as TabKey | null;
  const [activeTab, setActiveTabState] = useState<TabKey>(
    tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : "info"
  );
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
  const canRecord = true; // 골/어시 기록은 모든 회원 가능

  const baseRoster = useMemo(
    () =>
      membersData.members.map((m) => ({
        id: m.users?.id ?? m.id,
        memberId: m.id,
        name: m.users?.name ?? m.pre_name ?? "미연동 멤버",
        role: (m.users?.preferred_positions?.[0] ?? "MF") as DetailedPosition,
        isLinked: m.users != null,
      })),
    [membersData.members],
  );

  /** 참석 투표한 멤버 ID 셋 (baseRoster의 id 기준) */
  const attendingIds = useMemo(() => {
    const ids = new Set<string>();
    for (const a of voteData.attendance.filter((v) => v.vote === "ATTEND")) {
      if (a.member_id) {
        const member = membersData.members.find((m) => m.id === a.member_id);
        if (member) ids.add(member.users?.id ?? member.id);
      } else if (a.user_id) {
        ids.add(a.user_id);
      }
    }
    return ids;
  }, [voteData.attendance, membersData.members]);

  /** 참석 멤버만 (용병 제외) — MVP 투표, 출석 체크용 */
  const attendingMembers = useMemo(
    () => baseRoster.filter((m) => attendingIds.has(m.id)),
    [baseRoster, attendingIds]
  );

  /** 전술판 roster: 참석 멤버 + 용병 */
  const roster = useMemo(() => {
    const guestRoster = guests.map((g) => ({
      id: g.id,
      name: g.name,
      role: ((g.position?.split(",")[0]) || "MF") as DetailedPosition,
    }));
    return [...attendingMembers, ...guestRoster];
  }, [attendingMembers, guests]);

  /** 전체 로스터 (골 기록 시 이름 해석용) */
  const fullRoster = useMemo(() => {
    const guestRoster = guests.map((g) => ({
      id: g.id,
      name: g.name,
      role: ((g.position?.split(",")[0]) || "MF") as DetailedPosition,
    }));
    return [...baseRoster, ...guestRoster];
  }, [baseRoster, guests]);

  const score = useMemo(() => {
    const ourGoals = goals.filter(
      (goal) => goal.scorerId !== "OPPONENT",
    ).length;
    const oppGoals = goals.filter(
      (goal) => goal.scorerId === "OPPONENT",
    ).length;
    return `${ourGoals} : ${oppGoals}`;
  }, [goals]);

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
    <div className="grid gap-5 stagger-children">
      {/* ── Back Navigation ── */}
      <div className="flex items-center gap-2 -mt-1 mb-1">
        <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" asChild>
          <Link href="/matches">
            <ChevronLeft className="h-4 w-4" />
            일정 목록
          </Link>
        </Button>
      </div>

      {/* ── Sticky Tab Bar ── */}
      <div className="sticky top-0 z-10 -mx-1 px-1 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex" role="tablist">
          {([
            { key: "info", label: "기본 정보" },
            { key: "tactics", label: "전술판" },
            { key: "record", label: "경기 기록" },
            { key: "diary", label: "일지" },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex-1 py-3 text-sm font-medium transition-colors border-b-2",
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab: 기본 정보 ── */}
      <div className={activeTab === "info" ? "" : "hidden"}>
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
          internalTeams={internalTeams}
          refetchInternalTeams={refetchInternalTeams}
        />
      </div>

      {/* ── Tab: 전술판 ── */}
      <div className={activeTab === "tactics" ? "" : "hidden"}>
        <MatchTacticsTab
          matchId={matchId}
          match={match}
          canManage={canManage}
          attendingPlayers={attendingPlayers}
          roster={roster}
          sportType={sportType}
          internalTeams={internalTeams}
          refetchInternalTeams={refetchInternalTeams}
        />
      </div>

      {/* ── Tab: 경기 기록 ── */}
      <div className={activeTab === "record" ? "" : "hidden"}>
        <MatchRecordTab
          matchId={matchId}
          userId={userId}
          match={match}
          goals={goals}
          votes={votes}
          attendance={attendance}
          guests={guests}
          canManageAttendance={canManageAttendance}
          canRecord={canRecord}
          attendingMembers={attendingMembers}
          fullRoster={fullRoster}
          refetchGoals={refetchGoals}
          refetchMvp={refetchMvp}
          refetchAttendance={refetchAttendance}
          internalTeams={internalTeams}
        />
      </div>

      {/* ── Tab: 일지 ── */}
      <div className={activeTab === "diary" ? "" : "hidden"}>
        <MatchDiaryTab
          matchId={matchId}
          match={match}
          diary={diary}
          score={score}
          canManage={canManage}
          fullRoster={fullRoster}
          voteCounts={voteCounts}
          refetchDiary={refetchDiary}
        />
      </div>
    </div>
  );
}
