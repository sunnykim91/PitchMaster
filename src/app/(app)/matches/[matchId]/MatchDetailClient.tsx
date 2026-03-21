"use client";

import { useMemo, useRef, useState, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import dynamic from "next/dynamic";

const TacticsBoardSkeleton = () => (
  <div className="flex flex-col items-center justify-center py-12 gap-3">
    <Skeleton className="h-48 w-full rounded-xl" />
    <p className="text-xs text-muted-foreground">전술판 불러오는 중...</p>
  </div>
);
const TacticsBoard = dynamic(() => import("@/components/TacticsBoard"), {
  ssr: false,
  loading: () => <TacticsBoardSkeleton />
});
const AutoFormationBuilder = dynamic(() => import("@/components/AutoFormationBuilder"), {
  ssr: false,
  loading: () => <TacticsBoardSkeleton />
});
import type { AttendingPlayer, GeneratedSquad } from "@/components/AutoFormationBuilder";
import { useApi, apiMutate } from "@/lib/useApi";
import { isStaffOrAbove } from "@/lib/permissions";
import { useViewAsRole } from "@/lib/ViewAsRoleContext";
import type { Role, DetailedPosition } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { NativeSelect } from "@/components/ui/native-select";
import { cn, formatPhone, formatTime } from "@/lib/utils";
import { PhoneInput } from "@/components/ui/phone-input";
import { useRealtimeSubscription } from "@/lib/useRealtimeSubscription";
import { shareMatchResult } from "@/lib/kakaoShare";
import { recommendFormation, type PlayerInput } from "@/lib/formationAI";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { Target } from "lucide-react";
import { useToast } from "@/lib/ToastContext";
import type { SportType } from "@/lib/types";

/* ── API response row types (snake_case from DB) ── */

type MatchRow = {
  id: string;
  match_date: string;
  match_time: string | null;
  location: string | null;
  opponent_name: string | null;
  quarter_count: number;
  quarter_duration: number;
  break_duration: number;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";
};

type GoalRow = {
  id: string;
  match_id: string;
  quarter_number: number;
  minute: number | null;
  scorer_id: string;
  assist_id: string | null;
  is_own_goal: boolean;
  recorded_by: string;
};

type MvpVoteRow = {
  match_id: string;
  voter_id: string;
  candidate_id: string;
};

type AttendanceRow = {
  user_id: string;
  actually_attended: boolean | null;
};

type GuestRow = {
  id: string;
  match_id: string;
  name: string;
  position: string | null;
  phone: string | null;
  note: string | null;
};

type AttendanceVoteRow = {
  id: string;
  match_id: string;
  user_id: string | null;
  member_id: string | null;
  vote: "ATTEND" | "ABSENT" | "MAYBE";
  users: { id: string; name: string; preferred_positions?: string[] } | null;
  member: { id: string; pre_name: string | null; user_id: string | null; users: { id: string; name: string; preferred_positions?: string[] } | null } | null;
};

type DiaryRow = {
  match_id: string;
  weather: string | null;
  condition: string | null;
  memo: string | null;
  photos: string[] | null;
} | null;

type MemberRow = {
  id: string;
  role: string;
  user_id: string | null;
  pre_name: string | null;
  users: {
    id: string;
    name: string;
    preferred_positions?: string[];
  } | null;
};

/* ── Client-side types (camelCase) ── */

type Match = {
  id: string;
  date: string;
  time: string;
  location: string;
  opponent?: string;
  quarterCount: number;
  quarterDuration: number;
  breakDuration: number;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";
};

type GoalEvent = {
  id: string;
  scorerId: string;
  assistId?: string;
  quarter: number;
  minute: number;
  isOwnGoal?: boolean;
};

type Guest = {
  id: string;
  name: string;
  position?: string;
  phone?: string;
  note?: string;
};

type MatchDiary = {
  weather?: string;
  condition?: string;
  memo?: string;
  photos?: string[];
};

type VoteState = Record<string, string>;

type AttendanceState = Record<string, "PRESENT" | "ABSENT" | "LATE">;

/** 기본 제공되는 특수 선택지 */
const SPECIAL_PLAYERS = [
  { id: "UNKNOWN", name: "모름" },
  { id: "OPPONENT", name: "실점 (상대팀)" },
] as const;

const WEATHER_OPTIONS = ["맑음", "흐림", "비", "눈", "바람"] as const;
const CONDITION_OPTIONS = ["최상", "좋음", "보통", "나쁨", "최악"] as const;

const voteStyles = {
  ATTEND: {
    active: "bg-[hsl(var(--success))] text-white shadow-[0_2px_8px_-2px_hsl(var(--success)/0.4)]",
    inactive: "bg-[hsl(var(--success)/0.08)] text-[hsl(var(--success))] border border-[hsl(var(--success)/0.2)] hover:bg-[hsl(var(--success)/0.15)]",
  },
  MAYBE: {
    active: "bg-[hsl(var(--warning))] text-background shadow-[0_2px_8px_-2px_hsl(var(--warning)/0.4)]",
    inactive: "bg-secondary/50 text-muted-foreground border border-border hover:bg-secondary",
  },
  ABSENT: {
    active: "bg-[hsl(var(--loss))] text-white shadow-[0_2px_8px_-2px_hsl(var(--loss)/0.4)]",
    inactive: "bg-secondary/50 text-muted-foreground border border-border hover:bg-secondary",
  },
};

const emptyMatch: Match = {
  id: "",
  date: "",
  time: "",
  location: "",
  opponent: "",
  quarterCount: 4,
  quarterDuration: 25,
  breakDuration: 5,
  status: "SCHEDULED",
};

/* ── Mappers: snake_case API → camelCase client ── */

function mapMatch(row: MatchRow): Match {
  return {
    id: row.id,
    date: row.match_date,
    time: row.match_time ?? "",
    location: row.location ?? "",
    opponent: row.opponent_name ?? undefined,
    quarterCount: row.quarter_count,
    quarterDuration: row.quarter_duration,
    breakDuration: row.break_duration,
    status: row.status,
  };
}

function mapGoal(row: GoalRow): GoalEvent {
  return {
    id: row.id,
    scorerId: row.scorer_id,
    assistId: row.assist_id ?? undefined,
    quarter: row.quarter_number,
    minute: row.minute ?? 0,
    isOwnGoal: row.is_own_goal,
  };
}

function mapGuest(row: GuestRow): Guest {
  return {
    id: row.id,
    name: row.name,
    position: row.position ?? undefined,
    phone: row.phone ?? undefined,
    note: row.note ?? undefined,
  };
}

function mapDiary(row: DiaryRow): MatchDiary {
  if (!row) return {};
  return {
    weather: row.weather ?? undefined,
    condition: row.condition ?? undefined,
    memo: row.memo ?? undefined,
    photos: row.photos ?? undefined,
  };
}

function mapVotes(rows: MvpVoteRow[]): VoteState {
  const state: VoteState = {};
  for (const v of rows) {
    state[v.voter_id] = v.candidate_id;
  }
  return state;
}

function mapAttendance(rows: AttendanceRow[]): AttendanceState {
  const state: AttendanceState = {};
  for (const a of rows) {
    if (a.actually_attended === true) {
      state[a.user_id] = "PRESENT";
    } else if (a.actually_attended === false) {
      state[a.user_id] = "ABSENT";
    }
    // null → not checked yet, skip
  }
  return state;
}

export default function MatchDetailClient({
  matchId,
  userId,
  userRole,
}: {
  matchId: string;
  userId: string;
  userRole?: Role;
}) {
  /* ── API fetches ── */
  const {
    data: matchesData,
    loading: matchesLoading,
    refetch: refetchMatches,
  } = useApi<{ matches: MatchRow[] }>("/api/matches", { matches: [] });

  const {
    data: goalsData,
    loading: goalsLoading,
    refetch: refetchGoals,
  } = useApi<{ goals: GoalRow[] }>(`/api/goals?matchId=${matchId}`, { goals: [] });

  const {
    data: mvpData,
    loading: mvpLoading,
    refetch: refetchMvp,
  } = useApi<{ votes: MvpVoteRow[] }>(`/api/mvp?matchId=${matchId}`, { votes: [] });

  const {
    data: attendanceData,
    loading: attendanceLoading,
    refetch: refetchAttendance,
  } = useApi<{ attendance: AttendanceRow[] }>(`/api/attendance-check?matchId=${matchId}`, { attendance: [] });

  const {
    data: guestsData,
    loading: guestsLoading,
    refetch: refetchGuests,
  } = useApi<{ guests: GuestRow[] }>(`/api/guests?matchId=${matchId}`, { guests: [] });

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
    loading: diaryLoading,
    refetch: refetchDiary,
  } = useApi<{ diary: DiaryRow }>(`/api/diary?matchId=${matchId}`, { diary: null });

  const {
    data: membersData,
    loading: membersLoading,
  } = useApi<{ members: MemberRow[] }>("/api/members", { members: [] });

  const {
    data: teamData,
  } = useApi<{ team: { sport_type?: SportType; player_count?: number } }>("/api/teams", { team: {} });

  const sportType: SportType = teamData.team?.sport_type ?? "SOCCER";

  const {
    data: voteData,
    loading: voteLoading,
    refetch: refetchVote,
  } = useApi<{ attendance: AttendanceVoteRow[] }>(
    `/api/attendance?matchId=${matchId}`,
    { attendance: [] },
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
        // member_id 기반이면 member에서 이름/포지션 가져옴
        const memberData = a.member;
        const userData = a.users ?? memberData?.users;
        const name = userData?.name ?? memberData?.pre_name ?? "멤버";
        const positions = (userData?.preferred_positions ?? []) as string[];
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

  const [tacticsKey, setTacticsKey] = useState(0);
  const [generatedSquads, setGeneratedSquads] = useState<GeneratedSquad[]>([]);

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
  const [showDetailForm, setShowDetailForm] = useState(false);

  /* ── Local UI state ── */
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [isGuestFormOpen, setIsGuestFormOpen] = useState(false);
  const [isDiaryEditing, setIsDiaryEditing] = useState(false);
  const [confirmGoalDelete, setConfirmGoalDelete] = useState<string | null>(null);
  const [showBulkAttendConfirm, setShowBulkAttendConfirm] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const diaryFormRef = useRef<HTMLFormElement>(null);

  const { effectiveRole } = useViewAsRole();
  const role = effectiveRole(userRole);
  const canManageAttendance = isStaffOrAbove(role);
  const canManage = isStaffOrAbove(role);
  const canRecord = true; // 골/어시 기록은 모든 회원 가능

  /* ── 경기 완료 처리 ── */
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [completing, setCompleting] = useState(false);
  const { showToast } = useToast();

  /** 경기 날짜가 오늘 이전 또는 오늘인지 확인 (KST 기준) */
  const isMatchDatePastOrToday = useMemo(() => {
    if (!match.date) return false;
    const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const todayStr = kstNow.toISOString().split("T")[0];
    return match.date <= todayStr;
  }, [match.date]);

  async function handleCompleteMatch() {
    setCompleting(true);
    try {
      await apiMutate("/api/matches", "PUT", { id: matchId, status: "COMPLETED" });
      showToast("경기가 완료 처리되었습니다.");
      await refetchMatches();
    } catch {
      showToast("경기 완료 처리에 실패했습니다.", "error");
    } finally {
      setCompleting(false);
      setShowCompleteConfirm(false);
    }
  }

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
        // member_id → baseRoster의 id (user_id 또는 team_members.id)
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

  /** 득점자/어시스트 ID → 화면 표시용 이름 */
  function resolvePlayerName(playerId: string | undefined): string {
    if (!playerId) return "";
    if (playerId === "OPPONENT") return "실점";
    if (playerId === "UNKNOWN") return "득점";
    const special = SPECIAL_PLAYERS.find((s) => s.id === playerId);
    if (special) return special.name;
    // fullRoster: 전체 멤버 + 용병 (참석 여부 무관)
    return fullRoster.find((p) => p.id === playerId)?.name ?? "모름";
  }

  /* ── Goal handlers ── */

  async function handleAddGoal(formData: FormData) {
    let scorerId = String(formData.get("scorerId") || "");
    const assistIdRaw = String(formData.get("assistId") || "");
    const assistId = assistIdRaw || undefined;
    const quarterRaw = Number(formData.get("quarter") ?? 1);
    const quarter = quarterRaw || 0; // 0 = 쿼터 미지정
    const minute = 0;
    let isOwnGoal = Boolean(formData.get("isOwnGoal"));

    // "자책골" 선택 시
    if (scorerId === "OWN_GOAL") {
      isOwnGoal = true;
      scorerId = "UNKNOWN";
    }
    // 득점자 미선택 시 → "UNKNOWN" (모름)
    if (!scorerId) {
      scorerId = "UNKNOWN";
    }

    if (editingGoalId) {
      await apiMutate("/api/goals", "PUT", {
        id: editingGoalId,
        scorerId,
        assistId,
        quarter,
        minute,
        isOwnGoal,
      });
      setEditingGoalId(null);
    } else {
      await apiMutate("/api/goals", "POST", {
        matchId,
        scorerId,
        assistId,
        quarter,
        minute,
        isOwnGoal,
      });
    }
    formRef.current?.reset();
    await refetchGoals();
  }

  function handleEditGoal(goal: GoalEvent) {
    setEditingGoalId(goal.id);
    requestAnimationFrame(() => {
      const form = formRef.current;
      if (!form) return;
      (form.elements.namedItem("scorerId") as HTMLSelectElement).value = goal.scorerId;
      (form.elements.namedItem("assistId") as HTMLSelectElement).value = goal.assistId ?? "";
      (form.elements.namedItem("quarter") as HTMLInputElement).value = String(goal.quarter);
      (form.elements.namedItem("minute") as HTMLInputElement).value = String(goal.minute);
      (form.elements.namedItem("isOwnGoal") as HTMLInputElement).checked = !!goal.isOwnGoal;
    });
  }

  async function handleDeleteGoal(goalId: string) {
    await apiMutate(`/api/goals?id=${goalId}`, "DELETE");
    if (editingGoalId === goalId) setEditingGoalId(null);
    await refetchGoals();
  }

  function handleCancelEdit() {
    setEditingGoalId(null);
    formRef.current?.reset();
  }

  /* ── MVP handler ── */

  async function handleVote(candidateId: string) {
    await apiMutate("/api/mvp", "POST", { matchId, candidateId });
    await refetchMvp();
  }

  /* ── 참석투표 대리 관리 (운영진 이상) ── */

  async function handleProxyVote(memberId: string, vote: "ATTEND" | "ABSENT" | "MAYBE") {
    const { error: err } = await apiMutate("/api/attendance", "POST", { matchId, vote, memberId });
    if (err) {
      showToast("투표에 실패했습니다. 다시 시도해주세요.", "error");
    } else {
      await refetchVote();
    }
  }

  /** 멤버별 현재 참석투표 상태 (member_id 기반) */
  const memberVoteMap = useMemo(() => {
    const map: Record<string, "ATTEND" | "ABSENT" | "MAYBE"> = {};
    for (const a of voteData.attendance) {
      if (a.member_id) {
        map[a.member_id] = a.vote;
      } else if (a.user_id) {
        // member_id가 없는 기존 데이터는 user_id로 baseRoster에서 매칭
        const member = membersData.members.find((m) => m.users?.id === a.user_id);
        if (member) map[member.id] = a.vote;
      }
    }
    return map;
  }, [voteData.attendance, membersData.members]);

  /* ── Attendance handler ── */

  async function handleAttendance(playerId: string, status: "PRESENT" | "ABSENT" | "LATE") {
    const attended = status === "PRESENT" || status === "LATE";
    await apiMutate("/api/attendance-check", "POST", {
      matchId,
      userId: playerId,
      attended,
    });
    await refetchAttendance();
  }

  /* ── 용병 관리 ── */

  async function handleAddGuest(formData: FormData) {
    const name = String(formData.get("guestName") || "").trim();
    if (!name) return;
    const positions = formData.getAll("guestPositions").map(String).filter(Boolean);
    const position = positions.length > 0 ? positions.join(",") : undefined;
    const phone = String(formData.get("guestPhone") || "") || undefined;
    const note = String(formData.get("guestNote") || "") || undefined;

    await apiMutate("/api/guests", "POST", {
      matchId,
      name,
      position,
      phone,
      note,
    });
    setIsGuestFormOpen(false);
    await refetchGuests();
  }

  async function handleRemoveGuest(guestId: string) {
    await apiMutate(`/api/guests?id=${guestId}`, "DELETE");
    await refetchGuests();
  }

  /* ── 경기 일지 ── */

  async function handleSaveDiary(formData: FormData) {
    const weather = String(formData.get("weather") || "") || undefined;
    const condition = String(formData.get("condition") || "") || undefined;
    const memo = String(formData.get("memo") || "") || undefined;

    await apiMutate("/api/diary", "POST", {
      matchId,
      weather,
      condition,
      memo,
    });
    setIsDiaryEditing(false);
    await refetchDiary();
  }

  const voteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(votes).forEach((id) => {
      counts[id] = (counts[id] ?? 0) + 1;
    });
    return counts;
  }, [votes]);

  async function handleShare() {
    const message = `PitchMaster 경기 결과\n${match.date} ${formatTime(match.time)}\n${match.location}\n스코어 ${score}`;
    await navigator.clipboard.writeText(message);
    setShareMessage("경기 결과 요약이 클립보드에 복사되었습니다.");
    setTimeout(() => setShareMessage(null), 2000);
  }

  function handleKakaoShare() {
    shareMatchResult({
      matchId,
      date: match.date,
      score,
      opponent: match.opponent,
      mvp: (() => {
        const topId = Object.entries(voteCounts).sort(([, a], [, b]) => b - a)[0]?.[0];
        return topId ? fullRoster.find((p) => p.id === topId)?.name : undefined;
      })(),
    });
  }

  function handleShareCardDownload() {
    const link = document.createElement("a");
    link.href = `/api/matches/${matchId}/share-card`;
    link.download = `match-${matchId}-card.png`;
    link.click();
  }

  /* ── Loading state ── */
  const isLoading = matchesLoading || membersLoading || goalsLoading || guestsLoading || mvpLoading || attendanceLoading || diaryLoading || voteLoading;

  if (isLoading) {
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
      {/* ── Sticky Tab Bar ── */}
      <div className="sticky top-0 z-10 -mx-1 bg-background/95 backdrop-blur-sm border-b border-border">
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
      {activeTab === "info" && (<>
      {/* ── 경기 완료 처리 (운영진 이상, SCHEDULED + 경기일 오늘 이전/오늘) ── */}
      {canManage && match.status === "SCHEDULED" && isMatchDatePastOrToday && (
        <Card className="border-[hsl(var(--success))]/20 bg-[hsl(var(--success))]/5">
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="text-sm font-semibold text-foreground">경기를 완료 처리하시겠습니까?</p>
              <p className="text-xs text-muted-foreground">완료 처리하면 전적과 기록에 반영됩니다.</p>
            </div>
            <Button
              size="sm"
              className="shrink-0"
              disabled={completing}
              onClick={() => setShowCompleteConfirm(true)}
            >
              {completing ? "처리 중..." : "경기 완료"}
            </Button>
          </CardContent>
        </Card>
      )}
      <ConfirmDialog
        open={showCompleteConfirm}
        title="경기 완료 처리"
        description="이 경기를 완료 상태로 변경합니다. 완료된 경기의 기록만 시즌 전적에 반영됩니다."
        confirmLabel="완료 처리"
        cancelLabel="취소"
        onConfirm={handleCompleteMatch}
        onCancel={() => setShowCompleteConfirm(false)}
      />
      <ConfirmDialog
        open={confirmGoalDelete !== null}
        title="골 기록 삭제"
        description="이 골 기록을 삭제하시겠습니까? 삭제된 기록은 복구할 수 없습니다."
        confirmLabel="삭제"
        cancelLabel="취소"
        onConfirm={async () => {
          if (confirmGoalDelete) {
            await handleDeleteGoal(confirmGoalDelete);
          }
          setConfirmGoalDelete(null);
        }}
        onCancel={() => setConfirmGoalDelete(null)}
      />
      <ConfirmDialog
        open={showBulkAttendConfirm}
        title="전원 참석 처리"
        description={`참석 투표한 ${attendingMembers.length}명 전원을 출석으로 처리합니다.`}
        confirmLabel="전원 참석 처리"
        cancelLabel="취소"
        onConfirm={async () => {
          await Promise.all(
            attendingMembers.map((player) =>
              handleAttendance(player.id, "PRESENT")
            )
          );
          setShowBulkAttendConfirm(false);
        }}
        onCancel={() => setShowBulkAttendConfirm(false)}
      />
      {/* ── 내 참석 투표 (모든 멤버, 진행 전 경기만) ── */}
      {match.status !== "COMPLETED" && (() => {
        const myMember = baseRoster.find((m) => m.id === userId);
        if (!myMember) return null;
        const myVote = memberVoteMap[myMember.memberId];
        return (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground">내 참석 투표</p>
                  <p className="mt-1 text-sm font-semibold">
                    {myVote === "ATTEND" ? "참석" : myVote === "ABSENT" ? "불참" : myVote === "MAYBE" ? "미정" : "미투표"}
                  </p>
                </div>
                <div className="flex gap-2">
                  {([
                    { value: "ATTEND" as const, label: "참석" },
                    { value: "MAYBE" as const, label: "미정" },
                    { value: "ABSENT" as const, label: "불참" },
                  ]).map((opt) => {
                    const isSelected = myVote === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={cn(
                          "rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 active:scale-105 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                          isSelected ? voteStyles[opt.value].active : voteStyles[opt.value].inactive
                        )}
                        onClick={() => handleProxyVote(myMember.memberId, opt.value)}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* ── 참석투표 관리 (운영진 이상, 진행 전 경기만) ── */}
      {canManage && match.status !== "COMPLETED" && (
        <Card>
          <CardHeader>
            <p className="type-overline text-[hsl(var(--info))]">
              Attendance
            </p>
            <CardTitle className="mt-1 font-heading text-lg sm:text-xl font-bold uppercase">
              참석 투표 관리
            </CardTitle>
            <p className="text-xs text-muted-foreground">멤버별 참석/불참/미정을 대리 설정할 수 있습니다.</p>
            {/* 투표 현황 카운터 */}
            {(() => {
              const attend = baseRoster.filter((m) => memberVoteMap[m.memberId] === "ATTEND").length;
              const absent = baseRoster.filter((m) => memberVoteMap[m.memberId] === "ABSENT").length;
              const maybe = baseRoster.filter((m) => memberVoteMap[m.memberId] === "MAYBE").length;
              const noVote = baseRoster.length - attend - absent - maybe;
              return (
                <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold">
                  <span className="text-[hsl(var(--success))]">참석 {attend}</span>
                  <span className="text-[hsl(var(--loss))]">불참 {absent}</span>
                  <span className="text-[hsl(var(--warning))]">미정 {maybe}</span>
                  <span className="text-muted-foreground">미투표 {noVote}</span>
                  <span className="text-muted-foreground/50">· 총 {baseRoster.length}명</span>
                </div>
              );
            })()}
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...baseRoster].sort((a, b) => {
                const voteA = memberVoteMap[a.memberId];
                const voteB = memberVoteMap[b.memberId];
                const order: Record<string, number> = { ATTEND: 0, MAYBE: 1, ABSENT: 2 };
                const orderA = voteA ? (order[voteA] ?? 3) : 4;
                const orderB = voteB ? (order[voteB] ?? 3) : 4;
                return orderA - orderB;
              }).map((member) => {
                const currentVote = memberVoteMap[member.memberId];
                return (
                  <div key={member.id} className="flex items-center justify-between rounded-lg bg-secondary px-4 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-semibold truncate">{member.name}</span>
                      {!member.isLinked && (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">미가입</Badge>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      {([
                        { value: "ATTEND" as const, label: "참석" },
                        { value: "MAYBE" as const, label: "미정" },
                        { value: "ABSENT" as const, label: "불참" },
                      ]).map((opt) => {
                        const isSelected = currentVote === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            className={cn(
                              "rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-105 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                              isSelected ? voteStyles[opt.value].active : voteStyles[opt.value].inactive
                            )}
                            onClick={() => handleProxyVote(member.memberId, opt.value)}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 용병(게스트) 관리 (운영진 이상) ── */}
      {canManage && (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <p className="type-overline text-[hsl(var(--accent))]">
              Guests
            </p>
            <CardTitle className="mt-1 font-heading text-lg sm:text-xl font-bold uppercase">
              용병 관리
            </CardTitle>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => setIsGuestFormOpen((prev) => !prev)}
          >
            {isGuestFormOpen ? "닫기" : "용병 등록"}
          </Button>
        </CardHeader>

        <CardContent>
          {isGuestFormOpen && (
            <form
              className="mb-4"
              action={(formData) => handleAddGuest(formData)}
            >
              <Card className="border-0 bg-secondary shadow-none">
                <CardContent className="p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">
                        이름 *
                      </Label>
                      <Input name="guestName" required placeholder="홍길동" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <fieldset>
                        <legend className="text-xs font-semibold text-muted-foreground mb-1">선호 포지션 (복수 선택)</legend>
                        <div className="flex flex-wrap gap-2">
                          {(["GK","CB","LB","RB","CDM","CAM","LW","RW","ST"] as const).map((pos) => (
                            <label key={pos} className="flex items-center gap-1 text-xs cursor-pointer">
                              <input type="checkbox" name="guestPositions" value={pos} className="rounded" id={`guest-pos-${pos}`} />
                              {pos}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">
                        연락처
                      </Label>
                      <PhoneInput name="guestPhone" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">
                        메모
                      </Label>
                      <Input name="guestNote" placeholder="소속팀, 실력 등" />
                    </div>
                  </div>
                  <Button type="submit" className="mt-3 w-full" size="sm">
                    등록
                  </Button>
                </CardContent>
              </Card>
            </form>
          )}

          {guests.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              등록된 용병이 없습니다. 용병을 등록하면 전술판과 골 기록에서 선택할 수 있습니다.
            </p>
          ) : (
            <div className="space-y-2">
              {guests.map((guest) => (
                <Card
                  key={guest.id}
                  className="border-0 bg-secondary shadow-none"
                >
                  <CardContent className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold truncate">
                        {guest.name}
                        {guest.position && (
                          <Badge variant="outline" className="ml-2 text-[10px]">
                            {guest.position}
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {[guest.phone ? formatPhone(guest.phone) : "", guest.note].filter(Boolean).join(" · ") || "용병"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveGuest(guest.id)}
                      className="min-h-[36px] min-w-[36px] rounded px-2 text-xs text-destructive/70 hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      삭제
                    </button>
                  </CardContent>
                </Card>
              ))}
              <p className="text-xs text-muted-foreground">
                총 {guests.length}명의 용병이 등록되었습니다.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      )}
      </>)}

      {/* ── Tab: 전술판 ── */}
      {activeTab === "tactics" && (<>
      {/* ── AI 포메이션 추천 ── */}
      {canManage && attendingPlayers.length >= 5 && (() => {
        const aiPlayers: PlayerInput[] = attendingPlayers.map((p) => ({
          id: p.id,
          name: p.name,
          preferredPositions: p.preferredPositions ?? [p.preferredPosition],
        }));
        const maxPlayers = sportType === "FUTSAL" ? 5 : 11;
        const rec = recommendFormation(aiPlayers, Math.min(attendingPlayers.length, maxPlayers), sportType);
        if (!rec) return null;
        return (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary">
                AI Recommendation
              </p>
              <CardTitle className="mt-1 font-heading text-lg sm:text-xl font-bold uppercase">
                AI 포메이션 추천
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground/80">{rec.reason}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {rec.formation.slots.map((slot) => {
                  const playerId = rec.assignments[slot.id];
                  const player = aiPlayers.find((p) => p.id === playerId);
                  return (
                    <Badge key={slot.id} variant={player ? "default" : "secondary"} className="text-xs">
                      {slot.label}: {player?.name ?? "미배정"}
                    </Badge>
                  );
                })}
              </div>
              <Button
                type="button"
                size="sm"
                className="mt-4"
                onClick={async () => {
                  const squads: GeneratedSquad[] = Array.from(
                    { length: match.quarterCount },
                    (_, i) => ({
                      quarter_number: i + 1,
                      formation: rec.formation.id,
                      positions: Object.fromEntries(
                        rec.formation.slots.map((slot) => [
                          slot.id,
                          {
                            playerId: rec.assignments[slot.id] ?? "",
                            x: slot.x,
                            y: slot.y,
                          },
                        ])
                      ),
                    })
                  );
                  // API에 저장 (나갔다 들어와도 유지)
                  for (const sq of squads) {
                    await apiMutate("/api/squads", "POST", {
                      matchId,
                      quarterNumber: sq.quarter_number,
                      formation: sq.formation,
                      positions: sq.positions,
                    });
                  }
                  setGeneratedSquads(squads);
                  setTacticsKey((k) => k + 1);
                }}
              >
                AI 추천 적용하기
              </Button>
            </CardContent>
          </Card>
        );
      })()}

      {canManage && (
        <AutoFormationBuilder
          matchId={matchId}
          quarterCount={match.quarterCount}
          attendingPlayers={attendingPlayers}
          sportType={sportType}
          onGenerated={(squads) => {
            setGeneratedSquads(squads);
            setTacticsKey((k) => k + 1);
          }}
        />
      )}

      <TacticsBoard
        key={tacticsKey}
        matchId={matchId}
        roster={roster}
        quarterCount={match.quarterCount}
        sportType={sportType}
        readOnly={!canManage}
        initialSquads={generatedSquads.length > 0 ? generatedSquads.map((sq) => ({
          id: `gen-${sq.quarter_number}`,
          match_id: matchId,
          quarter_number: sq.quarter_number,
          formation: sq.formation,
          positions: sq.positions,
        })) : undefined}
      />
      </>)}

      {/* ── Tab: 경기 기록 ── */}
      {activeTab === "record" && (<>
      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
        {/* ── 스코어보드 ── */}
        <Card className="card-featured">
          <div className="text-center">
            <p className="type-overline">경기 스코어</p>
            <div className="mt-3 flex items-center justify-center gap-6">
              <div>
                <p className="type-overline">우리팀</p>
                <p className="type-score text-foreground">
                  {goals.filter((g) => g.scorerId !== "OPPONENT" && !g.isOwnGoal).length}
                </p>
              </div>
              <span className="text-2xl text-muted-foreground/40">:</span>
              <div>
                <p className="type-overline">상대팀</p>
                <p className="type-score text-muted-foreground/60">
                  {goals.filter((g) => g.scorerId === "OPPONENT" || g.isOwnGoal).length}
                </p>
              </div>
            </div>
            {canRecord && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDetailForm(true)}
                  className="rounded-full bg-[hsl(var(--success))] px-5 py-2 text-xs font-bold text-white shadow-[0_2px_8px_-2px_hsl(var(--success)/0.4)] transition-all hover:bg-[hsl(var(--success))]/90 active:scale-95"
                >
                  + 득점
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const formData = new FormData();
                    formData.set("scorerId", "OPPONENT");
                    formData.set("assistId", "");
                    formData.set("quarter", "0");
                    formData.set("minute", "0");
                    formData.set("isOwnGoal", "");
                    await handleAddGoal(formData);
                  }}
                  className="rounded-full bg-[hsl(var(--loss))] px-5 py-2 text-xs font-bold text-white shadow-[0_2px_8px_-2px_hsl(var(--loss)/0.4)] transition-all hover:bg-[hsl(var(--loss))]/90 active:scale-95"
                >
                  + 실점
                </button>
              </div>
            )}
          </div>
        </Card>

        {/* ── 상세 골 기록 (접기/펼치기) ── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-heading text-lg sm:text-xl font-bold uppercase">
              상세 기록
            </CardTitle>
            <button
              type="button"
              onClick={() => setShowDetailForm((prev) => !prev)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showDetailForm ? "접기 ▲" : "펼치기 ▼"}
            </button>
          </CardHeader>

          <CardContent>
            {showDetailForm && (
            <form
              ref={formRef}
              className="mb-4 grid gap-3"
              action={(formData) => handleAddGoal(formData)}
            >
              <Card className="border-0 bg-secondary shadow-none">
                <CardContent className="p-4">
                  {editingGoalId && (
                    <div className="mb-3 flex items-center gap-2 rounded-lg bg-[hsl(var(--warning)/0.1)] px-3 py-2 text-xs font-bold text-[hsl(var(--warning))]">
                      <span>기록 수정 중</span>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                      >
                        취소
                      </button>
                    </div>
                  )}

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">
                        득점자
                      </Label>
                      <NativeSelect name="scorerId">
                        <option value="">득점자 선택</option>
                        <optgroup label="참석 멤버">
                          {attendingMembers.map((player) => (
                            <option key={player.id} value={player.id}>
                              {player.name}
                            </option>
                          ))}
                        </optgroup>
                        {guests.length > 0 && (
                          <optgroup label="용병">
                            {guests.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.name}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        <optgroup label="기타">
                          <option value="OWN_GOAL">자책골</option>
                          {SPECIAL_PLAYERS.map((sp) => (
                            <option key={sp.id} value={sp.id}>
                              {sp.name}
                            </option>
                          ))}
                        </optgroup>
                      </NativeSelect>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">
                        어시스트
                      </Label>
                      <NativeSelect name="assistId">
                        <option value="">어시스트 선택</option>
                        <optgroup label="참석 멤버">
                          {attendingMembers.map((player) => (
                            <option key={player.id} value={player.id}>
                              {player.name}
                            </option>
                          ))}
                        </optgroup>
                        {guests.length > 0 && (
                          <optgroup label="용병">
                            {guests.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.name}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        <optgroup label="기타">
                          {SPECIAL_PLAYERS.map((sp) => (
                            <option key={sp.id} value={sp.id}>
                              {sp.name}
                            </option>
                          ))}
                        </optgroup>
                      </NativeSelect>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground">쿼터 (선택사항)</Label>
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          const input = e.currentTarget.parentElement?.querySelector("input[name=quarter]") as HTMLInputElement;
                          if (input) input.value = "0";
                          e.currentTarget.parentElement?.querySelectorAll("button").forEach((btn) => btn.classList.remove("bg-primary", "text-white"));
                          e.currentTarget.classList.add("bg-primary", "text-white");
                        }}
                        className="h-8 rounded-lg bg-primary px-3 text-xs font-bold text-white transition-colors hover:bg-primary/90"
                      >
                        선택 안함
                      </button>
                      {Array.from({ length: match.quarterCount }, (_, i) => i + 1).map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={(e) => {
                            const input = e.currentTarget.parentElement?.querySelector("input[name=quarter]") as HTMLInputElement;
                            if (input) input.value = String(q);
                            e.currentTarget.parentElement?.querySelectorAll("button").forEach((btn) => btn.classList.remove("bg-primary", "text-white"));
                            e.currentTarget.classList.add("bg-primary", "text-white");
                          }}
                          className="h-8 w-8 rounded-lg bg-secondary text-xs font-bold text-muted-foreground transition-colors hover:bg-secondary/80"
                        >
                          Q{q}
                        </button>
                      ))}
                      <input name="quarter" type="hidden" defaultValue="0" />
                    </div>
                  </div>
                  <input name="minute" type="hidden" value="0" />

                  <div className="mt-3 flex gap-2">
                    <Button type="submit" className="flex-1" size="sm">
                      {editingGoalId ? "수정 완료" : "기록 추가"}
                    </Button>
                    {editingGoalId && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCancelEdit}
                      >
                        취소
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </form>
            )}

            <div className="space-y-2">
              {goals.length === 0 ? (
                <EmptyState icon={Target} title="아직 기록이 없습니다" description="위의 +득점 버튼으로 골을 기록하세요" />
              ) : (
                goals.map((goal) => {
                  const label = goal.scorerId === "OPPONENT"
                    ? <span className="text-[hsl(var(--loss))]">실점</span>
                    : goal.isOwnGoal
                    ? <span className="text-[hsl(var(--warning))]">자책골</span>
                    : goal.scorerId === "UNKNOWN"
                    ? <span className="text-[hsl(var(--success))]">득점</span>
                    : <span className="text-[hsl(var(--success))]">{resolvePlayerName(goal.scorerId)}</span>;
                  return (
                  <div
                    key={goal.id}
                    className="card-list-item flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {goal.quarter > 0 ? `Q${goal.quarter}` : ""}
                        {goal.assistId
                          ? `${goal.quarter > 0 ? " · " : ""}A: ${resolvePlayerName(goal.assistId)}`
                          : ""}
                      </p>
                    </div>
                    {canRecord && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => { handleEditGoal(goal); setShowDetailForm(true); }}
                          className="min-h-[36px] min-w-[36px] rounded px-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmGoalDelete(goal.id)}
                          className="min-h-[36px] min-w-[36px] rounded px-2 text-xs text-destructive/70 hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                          삭제
                        </button>
                      </div>
                    )}
                  </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
        </div>

        {/* ── 우측 컬럼 ── */}
        <div className="space-y-5">
          {/* ── MVP 투표 ── */}
          <Card>
            <CardHeader>
              <p className="type-overline text-[hsl(var(--info))]">
                MVP
              </p>
              <CardTitle className="mt-1 font-heading text-lg sm:text-xl font-bold uppercase">
                MVP 투표
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="space-y-2">
                {attendingMembers.map((player) => (
                  <Button
                    key={player.id}
                    type="button"
                    variant={votes[userId] === player.id ? "default" : "outline"}
                    className="flex w-full items-center justify-between"
                    onClick={() => handleVote(player.id)}
                  >
                    <span className="font-semibold truncate">{player.name}</span>
                    <Badge
                      variant={
                        votes[userId] === player.id ? "secondary" : "outline"
                      }
                      className="ml-2"
                    >
                      {voteCounts[player.id] ?? 0}표
                    </Badge>
                  </Button>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                참석자만 1인 1표로 투표할 수 있습니다.
              </p>
            </CardContent>
          </Card>

          {/* ── 출석 체크 (staff only) ── */}
          {canManageAttendance && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <p className="type-overline">
                    Attendance
                  </p>
                  <CardTitle className="mt-1 font-heading text-lg sm:text-xl font-bold uppercase">
                    출석 체크
                  </CardTitle>
                </div>
                {attendingMembers.length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowBulkAttendConfirm(true)}
                  >
                    전원 참석 처리
                  </Button>
                )}
              </CardHeader>

              <CardContent>
                <div className="space-y-2">
                  {attendingMembers.map((player) => {
                    const status = attendance[player.id];
                    return (
                      <Card
                        key={player.id}
                        className="border-0 bg-secondary shadow-none"
                      >
                        <CardContent className="flex items-center justify-between px-4 py-3">
                          <span className="text-sm font-semibold truncate">
                            {player.name}
                          </span>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant={
                                status === "PRESENT" ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() =>
                                handleAttendance(player.id, "PRESENT")
                              }
                            >
                              참석
                            </Button>
                            <Button
                              type="button"
                              variant={
                                status === "LATE" ? "warning" : "outline"
                              }
                              size="sm"
                              onClick={() =>
                                handleAttendance(player.id, "LATE")
                              }
                            >
                              지각
                            </Button>
                            <Button
                              type="button"
                              variant={
                                status === "ABSENT" ? "destructive" : "outline"
                              }
                              size="sm"
                              onClick={() =>
                                handleAttendance(player.id, "ABSENT")
                              }
                            >
                              불참
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  스태프 이상 권한만 출석을 관리할 수 있습니다.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
      </>)}

      {/* ── Tab: 일지 ── */}
      {activeTab === "diary" && (<>
      {/* ── 경기 결과 공유 ── */}
      <Card>
        <CardHeader>
          <p className="type-overline">
            Share
          </p>
          <CardTitle className="mt-1 font-heading text-lg sm:text-xl font-bold uppercase">
            경기 결과 공유
          </CardTitle>
        </CardHeader>

        <CardContent>
          <Card className="border-primary/20 bg-primary/5 shadow-none">
            <CardContent className="p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
                PitchMaster
              </p>
              <p className="mt-2 type-score text-foreground">
                {score}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {match.opponent ? `vs ${match.opponent}` : "친선 경기"}
              </p>
              <p className="text-xs text-muted-foreground">
                {match.date} {formatTime(match.time)}
              </p>
            </CardContent>
          </Card>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="bg-[hsl(var(--kakao))] text-[hsl(var(--kakao-foreground))] hover:bg-[hsl(var(--kakao))]/90"
              onClick={handleKakaoShare}
            >
              카카오톡 공유
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleShare}
            >
              결과 요약 복사
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleShareCardDownload}
            >
              카드 이미지 저장
            </Button>
          </div>

          {shareMessage ? (
            <p className="mt-2 text-xs text-primary">{shareMessage}</p>
          ) : null}
        </CardContent>
      </Card>

      {/* ── 경기 일지 ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <p className="type-overline text-[hsl(var(--info))]">
              Match Diary
            </p>
            <CardTitle className="mt-1 font-heading text-lg sm:text-xl font-bold uppercase">
              경기 일지
            </CardTitle>
          </div>
          {canManage && !isDiaryEditing && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setIsDiaryEditing(true)}
            >
              {diary.memo || diary.weather || diary.condition ? "수정" : "작성하기"}
            </Button>
          )}
        </CardHeader>

        <CardContent>
          {isDiaryEditing ? (
            <form
              ref={diaryFormRef}
              action={(formData) => handleSaveDiary(formData)}
            >
              <Card className="border-0 bg-secondary shadow-none">
                <CardContent className="p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">
                        날씨
                      </Label>
                      <NativeSelect name="weather" defaultValue={diary.weather ?? ""}>
                        <option value="">선택 안 함</option>
                        {WEATHER_OPTIONS.map((w) => (
                          <option key={w} value={w}>{w}</option>
                        ))}
                      </NativeSelect>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">
                        팀 컨디션
                      </Label>
                      <NativeSelect name="condition" defaultValue={diary.condition ?? ""}>
                        <option value="">선택 안 함</option>
                        {CONDITION_OPTIONS.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </NativeSelect>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      메모
                    </Label>
                    <Textarea
                      name="memo"
                      defaultValue={diary.memo ?? ""}
                      placeholder="오늘 경기에 대한 기록, 느낀 점, 특이사항 등을 자유롭게 적어주세요."
                      rows={4}
                    />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button type="submit" className="flex-1" size="sm">
                      저장
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsDiaryEditing(false)}
                    >
                      취소
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
          ) : diary.memo || diary.weather || diary.condition ? (
            <Card className="border-0 bg-secondary shadow-none">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-2">
                  {diary.weather && (
                    <Badge variant="outline" className="text-xs">
                      {diary.weather === "맑음" ? "☀️" : diary.weather === "흐림" ? "☁️" : diary.weather === "비" ? "🌧️" : diary.weather === "눈" ? "🌨️" : "💨"} {diary.weather}
                    </Badge>
                  )}
                  {diary.condition && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        diary.condition === "최상" || diary.condition === "좋음"
                          ? "border-[hsl(var(--success)/0.3)] text-[hsl(var(--success))]"
                          : diary.condition === "보통"
                          ? "border-[hsl(var(--warning)/0.3)] text-[hsl(var(--warning))]"
                          : "border-[hsl(var(--loss)/0.3)] text-[hsl(var(--loss))]"
                      )}
                    >
                      컨디션: {diary.condition}
                    </Badge>
                  )}
                </div>
                {diary.memo && (
                  <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed">
                    {diary.memo}
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <p className="text-sm text-muted-foreground">
              아직 작성된 경기 일지가 없습니다. 날씨, 컨디션, 느낀 점 등을 기록해보세요.
            </p>
          )}
        </CardContent>
      </Card>
      </>)}
    </div>
  );
}
