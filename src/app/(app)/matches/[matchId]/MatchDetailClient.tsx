"use client";

import { useMemo, useState, useCallback } from "react";
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
import { useRealtimeSubscription } from "@/lib/useRealtimeSubscription";
import { ChevronLeft, Check } from "lucide-react";
import { useConfirm } from "@/lib/ConfirmContext";
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
  { ssr: false, loading: () => <div className="py-8 text-center text-sm text-muted-foreground">전술판 불러오는 중...</div> }
);
const MatchRecordTab = dynamic(
  () => import("./MatchRecordTab").then((m) => m.MatchRecordTab),
  { ssr: false, loading: () => <div className="py-8 text-center text-sm text-muted-foreground">기록 불러오는 중...</div> }
);
const MatchDiaryTab = dynamic(
  () => import("./MatchDiaryTab").then((m) => m.MatchDiaryTab),
  { ssr: false, loading: () => <div className="py-8 text-center text-sm text-muted-foreground">일지 불러오는 중...</div> }
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InitialData = Record<string, any> | null;

export default function MatchDetailClient({
  matchId,
  userId,
  userRole,
  initialData,
  todayIso,
}: {
  matchId: string;
  userId: string;
  userRole?: Role;
  initialData?: InitialData;
  todayIso: string;
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
  } = useApi<{ team: { sport_type?: SportType; player_count?: number; uniform_primary?: string; uniform_secondary?: string; uniform_pattern?: string; uniforms?: { home?: { primary: string; secondary: string; pattern: string }; away?: { primary: string; secondary: string; pattern: string }; third?: { primary: string; secondary: string; pattern: string } | null } | null; default_formation_id?: string; stats_recording_staff_only?: boolean } }>("/api/teams", initialData?.team ?? { team: {} }, { skip: !!initialData?.team });

  const sportType: SportType = teamData.team?.sport_type ?? "SOCCER";
  const uniforms = teamData.team?.uniforms;
  const uniformPrimary = uniforms?.home?.primary ?? teamData.team?.uniform_primary ?? "hsl(var(--primary))";
  const uniformSecondary = uniforms?.home?.secondary ?? teamData.team?.uniform_secondary ?? "hsl(var(--muted-foreground))";
  const uniformPattern = uniforms?.home?.pattern ?? teamData.team?.uniform_pattern ?? "SOLID";
  const defaultFormationId = teamData.team?.default_formation_id ?? "";
  const statsRecordingStaffOnly = teamData.team?.stats_recording_staff_only ?? false;

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
  }, [voteData.attendance, guests, dormantIds]);

  /* ── Tab state ── */
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const validTabs = ["info", "vote", "tactics", "attendance", "record", "diary"] as const;
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
  // 팀 설정에서 stats_recording_staff_only 가 켜져 있으면 STAFF 이상만 기록 가능
  const canRecord = statsRecordingStaffOnly ? isStaffOrAbove(role) : true;
  const confirm = useConfirm();

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

  /** 참석 멤버만 (용병 제외) — MVP 투표, 출석 체크용 */
  const attendingMembers = useMemo(
    () => baseRoster.filter((m) => attendingIds.has(m.id)),
    [baseRoster, attendingIds]
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

      {/* ── Sticky Tab Bar ── */}
      <div className="sticky top-0 z-10 -mx-1 px-1 bg-background/90 backdrop-blur-md">
        <div className="flex border-b border-border/50" role="tablist" aria-label="경기 상세 탭">
          {([
            { key: "info", label: "정보" },
            { key: "vote", label: "투표" },
            ...(match.matchType !== "EVENT" ? [
              { key: "tactics" as const, label: "전술" },
              ...(canManageAttendance ? [{ key: "attendance" as const, label: "출석" }] : []),
              { key: "record" as const, label: "기록" },
              { key: "diary" as const, label: "일지" },
            ] : []),
          ] as const).map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="relative flex-1 py-3.5 text-center text-sm font-medium transition-all min-h-[48px]"
              style={{ color: activeTab === tab.key ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}
            >
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 rounded-full" style={{ backgroundColor: "hsl(16, 85%, 58%)" }} />
              )}
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
          uniforms={uniforms}
          internalTeams={internalTeams}
          refetchInternalTeams={refetchInternalTeams}
          comments={commentsData.comments}
          refetchComments={refetchComments}
          goals={goals}
          todayIso={todayIso}
          initialWeather={initialData?.weather ?? null}
        />
      </div>

      {/* ── Tab: 투표 ── */}
      <div className={activeTab === "vote" ? "" : "hidden"}>
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
        />
      </div>

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
          />
        </div>
      )}

      {/* ── Tab: 출석 체크 ── */}
      <div className={activeTab === "attendance" ? "" : "hidden"}>
        <section className="space-y-4 py-4">
          {canManageAttendance ? (
            <Card className="rounded-xl border-border/30">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <h3 className="text-base font-bold">출석 체크</h3>
                {attendingMembers.length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 px-3 text-sm font-medium text-primary"
                    onClick={async () => {
                      const ok = await confirm({
                        title: "전원 참석 처리",
                        description: `참석 투표한 ${attendingMembers.length}명 전원을 출석으로 처리합니다.`,
                        confirmLabel: "전원 참석 처리",
                        cancelLabel: "취소",
                      });
                      if (ok) {
                        await Promise.all(
                          attendingMembers.map((player) => handleAttendance(player, "PRESENT"))
                        );
                      }
                    }}
                  >
                    전원 참석 처리
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {attendingMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">참석 투표한 멤버가 없습니다</p>
                ) : (
                  <div className="space-y-2">
                    {attendingMembers.map((player) => {
                      const status = attendance[player.id];
                      return (
                        <Card key={player.id} className="border-0 bg-secondary shadow-none">
                          <CardContent className="flex items-center justify-between px-4 py-3">
                            <div className="flex items-center gap-2 min-w-0">
                              {status && (
                                <div className={cn(
                                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                                  status === "PRESENT" && "bg-[hsl(var(--success))]/20",
                                  status === "LATE" && "bg-[hsl(var(--warning))]/20",
                                  status === "ABSENT" && "bg-destructive/20",
                                )}>
                                  <Check className={cn(
                                    "h-3 w-3",
                                    status === "PRESENT" && "text-[hsl(var(--success))]",
                                    status === "LATE" && "text-[hsl(var(--warning))]",
                                    status === "ABSENT" && "text-destructive",
                                  )} />
                                </div>
                              )}
                              <span className="text-sm font-semibold truncate">{player.name}</span>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button type="button" variant={status === "PRESENT" ? "default" : "outline"} size="sm" onClick={() => handleAttendance(player, "PRESENT")}>참석</Button>
                              <Button type="button" variant={status === "LATE" ? "warning" : "outline"} size="sm" onClick={() => handleAttendance(player, "LATE")}>지각</Button>
                              <Button type="button" variant={status === "ABSENT" ? "destructive" : "outline"} size="sm" onClick={() => handleAttendance(player, "ABSENT")}>불참</Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
                {/* 출석 현황 요약 */}
                {attendingMembers.length > 0 && (() => {
                  const present = attendingMembers.filter((m) => attendance[m.id] === "PRESENT").length;
                  const late = attendingMembers.filter((m) => attendance[m.id] === "LATE").length;
                  const absent = attendingMembers.filter((m) => attendance[m.id] === "ABSENT").length;
                  const unchecked = attendingMembers.length - present - late - absent;
                  return (
                    <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground border-t border-border/30 pt-3">
                      <span>참석 <strong className="text-[hsl(var(--success))]">{present}</strong></span>
                      <span>지각 <strong className="text-[hsl(var(--warning))]">{late}</strong></span>
                      <span>불참 <strong className="text-destructive">{absent}</strong></span>
                      {unchecked > 0 && <span>미체크 <strong>{unchecked}</strong></span>}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-xl border-border/30">
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">출석 현황</p>
                {attendingMembers.length > 0 && (() => {
                  const present = attendingMembers.filter((m) => attendance[m.id] === "PRESENT").length;
                  const late = attendingMembers.filter((m) => attendance[m.id] === "LATE").length;
                  const absent = attendingMembers.filter((m) => attendance[m.id] === "ABSENT").length;
                  return (
                    <div className="mt-3 flex items-center justify-center gap-4 text-sm">
                      <span>참석 <strong className="text-[hsl(var(--success))]">{present}</strong></span>
                      <span>지각 <strong className="text-[hsl(var(--warning))]">{late}</strong></span>
                      <span>불참 <strong className="text-destructive">{absent}</strong></span>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}
        </section>
      </div>

      {/* ── Tab: 경기 기록 ── */}
      {activeTab === "record" && (
        <div>
          <MatchRecordTab
            matchId={matchId}
            userId={userId}
            match={match}
            goals={goals}
            votes={votes}
            guests={guests}
            canRecord={canRecord}
            attendingMembers={attendingMembers}
            fullRoster={fullRoster}
            refetchGoals={refetchGoals}
            refetchMvp={refetchMvp}
            internalTeams={internalTeams}
          />
        </div>
      )}

      {/* ── Tab: 일지 ── */}
      {activeTab === "diary" && (
        <div>
          <MatchDiaryTab
            matchId={matchId}
            match={match}
            diary={diary}
            score={score}
            canManage={canManage}
            fullRoster={fullRoster}
            voteCounts={voteCounts}
            refetchDiary={refetchDiary}
            aiSummary={initialData?.aiSummary ?? null}
          />
        </div>
      )}
    </div>
  );
}
