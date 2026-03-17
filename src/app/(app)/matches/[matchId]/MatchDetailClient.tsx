"use client";

import { useMemo, useRef, useState } from "react";
import TacticsBoard from "@/components/TacticsBoard";
import AutoFormationBuilder from "@/components/AutoFormationBuilder";
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
import { NativeSelect } from "@/components/ui/native-select";
import { cn, formatPhone, formatTime } from "@/lib/utils";
import { PhoneInput } from "@/components/ui/phone-input";
import { useRealtimeSubscription } from "@/lib/useRealtimeSubscription";
import { shareMatchResult } from "@/lib/kakaoShare";
import { recommendFormation, type PlayerInput } from "@/lib/formationAI";

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
] as const;

const WEATHER_OPTIONS = ["맑음", "흐림", "비", "눈", "바람"] as const;
const CONDITION_OPTIONS = ["최상", "좋음", "보통", "나쁨", "최악"] as const;

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
        const pos = userData?.preferred_positions?.[0] ?? "CAM";
        const id = a.user_id ?? a.member_id ?? a.id;
        return { id, name, preferredPosition: pos as AttendingPlayer["preferredPosition"] };
      });
    // 용병 추가
    const guestPlayers: AttendingPlayer[] = guests.map((g) => ({
      id: g.id,
      name: g.name,
      preferredPosition: ((g.position?.split(",")[0]) || "CAM") as AttendingPlayer["preferredPosition"],
    }));
    return [...members, ...guestPlayers];
  }, [voteData.attendance, guests]);

  const [tacticsKey, setTacticsKey] = useState(0);
  const [generatedSquads, setGeneratedSquads] = useState<GeneratedSquad[]>([]);

  /* ── Local UI state ── */
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [isGuestFormOpen, setIsGuestFormOpen] = useState(false);
  const [isDiaryEditing, setIsDiaryEditing] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const diaryFormRef = useRef<HTMLFormElement>(null);

  const { effectiveRole } = useViewAsRole();
  const role = effectiveRole(userRole);
  const canManageAttendance = isStaffOrAbove(role);
  const canManage = isStaffOrAbove(role);

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

  /** 전술판 roster: 참석 멤버 + 용병 */
  const roster = useMemo(() => {
    const attendingMembers = baseRoster.filter((m) => attendingIds.has(m.id));
    const guestRoster = guests.map((g) => ({
      id: g.id,
      name: g.name,
      role: ((g.position?.split(",")[0]) || "MF") as DetailedPosition,
    }));
    return [...attendingMembers, ...guestRoster];
  }, [baseRoster, attendingIds, guests]);

  /** 전체 로스터 (MVP 투표, 출석 체크용) */
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
    if (playerId === "OPPONENT") return "상대팀 득점";
    const special = SPECIAL_PLAYERS.find((s) => s.id === playerId);
    if (special) return special.name;
    // fullRoster: 전체 멤버 + 용병 (참석 여부 무관)
    return fullRoster.find((p) => p.id === playerId)?.name ?? "모름";
  }

  /* ── Goal handlers ── */

  async function handleAddGoal(formData: FormData) {
    const scorerId = String(formData.get("scorerId") || "");
    const assistId = String(formData.get("assistId") || "") || undefined;
    const quarter = Number(formData.get("quarter") || 1);
    const minute = Number(formData.get("minute") || 0);
    const isOwnGoal = Boolean(formData.get("isOwnGoal"));

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
    await apiMutate("/api/attendance", "POST", { matchId, vote, memberId });
    await refetchVote();
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
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">경기 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5 stagger-children">
      {/* ── 참석투표 관리 (운영진 이상, 진행 전 경기만) ── */}
      {canManage && match.status !== "COMPLETED" && (
        <Card>
          <CardHeader>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-blue-400">
              Attendance
            </p>
            <CardTitle className="mt-1 font-heading text-xl font-bold uppercase">
              참석 투표 관리
            </CardTitle>
            <p className="text-xs text-muted-foreground">멤버별 참석/불참/미정을 대리 설정할 수 있습니다.</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {baseRoster.map((member) => {
                const currentVote = memberVoteMap[member.memberId];
                return (
                  <div key={member.id} className="flex items-center justify-between rounded-lg bg-secondary px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{member.name}</span>
                      {!member.isLinked && (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">미연동</Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {([
                        { value: "ATTEND" as const, label: "참석", variant: "success" as const },
                        { value: "MAYBE" as const, label: "미정", variant: "warning" as const },
                        { value: "ABSENT" as const, label: "불참", variant: "destructive" as const },
                      ]).map((opt) => (
                        <Button
                          key={opt.value}
                          type="button"
                          variant={currentVote === opt.value ? opt.variant : "outline"}
                          size="sm"
                          className="text-xs"
                          onClick={() => handleProxyVote(member.memberId, opt.value)}
                        >
                          {opt.label}
                        </Button>
                      ))}
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
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-orange-400">
              Guests
            </p>
            <CardTitle className="mt-1 font-heading text-xl font-bold uppercase">
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
                      <Label className="text-xs font-semibold text-muted-foreground">
                        선호 포지션 (복수 선택)
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {(["GK","CB","LB","RB","CDM","CAM","LW","RW","ST"] as const).map((pos) => (
                          <label key={pos} className="flex items-center gap-1 text-xs">
                            <input type="checkbox" name="guestPositions" value={pos} className="rounded" />
                            {pos}
                          </label>
                        ))}
                      </div>
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
                      <p className="text-sm font-semibold">
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
                      className="text-xs text-destructive/70 hover:text-destructive transition"
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

      {/* ── AI 포메이션 추천 ── */}
      {canManage && attendingPlayers.length >= 5 && (() => {
        const aiPlayers: PlayerInput[] = attendingPlayers.map((p) => ({
          id: p.id,
          name: p.name,
          preferredPosition: p.preferredPosition,
        }));
        const rec = recommendFormation(aiPlayers, Math.min(attendingPlayers.length, 11));
        if (!rec) return null;
        return (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary">
                AI Recommendation
              </p>
              <CardTitle className="mt-1 font-heading text-xl font-bold uppercase">
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
                onClick={() => {
                  // Convert AI recommendation to GeneratedSquad for all quarters
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
        readOnly={!canManage}
        initialSquads={generatedSquads.length > 0 ? generatedSquads.map((sq) => ({
          id: `gen-${sq.quarter_number}`,
          match_id: matchId,
          quarter_number: sq.quarter_number,
          formation: sq.formation,
          positions: sq.positions,
        })) : undefined}
      />

      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        {/* ── 골/어시스트 기록 ── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-sky-400">
                Goals
              </p>
              <CardTitle className="mt-1 font-heading text-xl font-bold uppercase">
                골/어시스트 기록
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent>
            <form
              ref={formRef}
              className="grid gap-3"
              action={(formData) => handleAddGoal(formData)}
            >
              <Card className="border-0 bg-secondary shadow-none">
                <CardContent className="p-4">
                  {editingGoalId && (
                    <div className="mb-3 flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-500">
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
                        <option value="OPPONENT">상대팀 득점</option>
                        <optgroup label="팀 멤버">
                          {baseRoster.map((player) => (
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

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">
                        어시스트
                      </Label>
                      <NativeSelect name="assistId">
                        <option value="">없음</option>
                        <optgroup label="팀 멤버">
                          {baseRoster.map((player) => (
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

                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">
                        쿼터
                      </Label>
                      <Input
                        name="quarter"
                        type="number"
                        min={1}
                        max={6}
                        defaultValue={1}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">
                        시간(분)
                      </Label>
                      <Input
                        name="minute"
                        type="number"
                        min={0}
                        max={40}
                        defaultValue={0}
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <input
                        name="isOwnGoal"
                        type="checkbox"
                        className="h-4 w-4 rounded border border-primary accent-primary"
                      />
                      <Label className="text-xs text-muted-foreground">
                        자책골
                      </Label>
                    </div>
                  </div>

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

            <div className="mt-4 space-y-2">
              {goals.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  아직 기록된 골이 없습니다.
                </p>
              ) : (
                goals.map((goal) => (
                  <Card
                    key={goal.id}
                    className="border-0 bg-secondary shadow-none"
                  >
                    <CardContent className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold">
                          {resolvePlayerName(goal.scorerId)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Q{goal.quarter} {goal.minute}분
                          {goal.assistId
                            ? ` · 어시스트 ${resolvePlayerName(goal.assistId)}`
                            : ""}
                          {goal.isOwnGoal ? " · 자책골" : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditGoal(goal)}
                          className="text-xs text-muted-foreground hover:text-primary transition"
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteGoal(goal.id)}
                          className="text-xs text-destructive/70 hover:text-destructive transition"
                        >
                          삭제
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── 우측 컬럼 ── */}
        <div className="space-y-5">
          {/* ── MVP 투표 ── */}
          <Card>
            <CardHeader>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-sky-400">
                MVP
              </p>
              <CardTitle className="mt-1 font-heading text-xl font-bold uppercase">
                MVP 투표
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="space-y-2">
                {fullRoster.map((player) => (
                  <Button
                    key={player.id}
                    type="button"
                    variant={votes[userId] === player.id ? "default" : "outline"}
                    className="flex w-full items-center justify-between"
                    onClick={() => handleVote(player.id)}
                  >
                    <span className="font-semibold">{player.name}</span>
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
              <CardHeader>
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                  Attendance
                </p>
                <CardTitle className="mt-1 font-heading text-xl font-bold uppercase">
                  출석 체크
                </CardTitle>
              </CardHeader>

              <CardContent>
                <div className="space-y-2">
                  {fullRoster.map((player) => {
                    const status = attendance[player.id];
                    return (
                      <Card
                        key={player.id}
                        className="border-0 bg-secondary shadow-none"
                      >
                        <CardContent className="flex items-center justify-between px-4 py-3">
                          <span className="text-sm font-semibold">
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

          {/* ── 경기 결과 공유 ── */}
          <Card>
            <CardHeader>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                Share
              </p>
              <CardTitle className="mt-1 font-heading text-xl font-bold uppercase">
                경기 결과 공유
              </CardTitle>
            </CardHeader>

            <CardContent>
              <Card className="border-primary/20 bg-primary/5 shadow-none">
                <CardContent className="p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
                    PitchMaster
                  </p>
                  <p className="mt-2 font-heading text-2xl font-bold">
                    {score}
                  </p>
                  <p className="text-sm text-muted-foreground">
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
                  className="bg-[#FEE500] text-[#191919] hover:bg-[#FDD835]"
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
        </div>
      </section>

      {/* ── 경기 일지 ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-violet-400">
              Match Diary
            </p>
            <CardTitle className="mt-1 font-heading text-xl font-bold uppercase">
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
                          ? "border-emerald-500/30 text-emerald-400"
                          : diary.condition === "보통"
                          ? "border-amber-500/30 text-amber-400"
                          : "border-rose-500/30 text-rose-400"
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
    </div>
  );
}
