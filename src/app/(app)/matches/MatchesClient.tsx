"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useApi, apiMutate } from "@/lib/useApi";
import { isStaffOrAbove } from "@/lib/permissions";
import { useViewAsRole } from "@/lib/ViewAsRoleContext";
import { useToast } from "@/lib/ToastContext";
import type { Role, SportType } from "@/lib/types";
import { GA } from "@/lib/analytics";
import { SPORT_DEFAULTS } from "@/lib/types";
import { cn, formatTime, formatDateTime, formatMatchDate } from "@/lib/utils";
import { voteStyles } from "@/lib/voteStyles";
import { toKoreanError } from "@/lib/errorMessages";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealtimeSubscription } from "@/lib/useRealtimeSubscription";
import { shareVoteLink } from "@/lib/kakaoShare";
import { EmptyState } from "@/components/EmptyState";
import { MatchCalendar } from "@/components/MatchCalendar";
import { Calendar, Share2 } from "lucide-react";

type MatchStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";
type AttendanceVote = "ATTEND" | "ABSENT" | "MAYBE";

type Match = {
  id: string;
  date: string;
  time: string;
  endTime?: string | null;
  endDate?: string | null;
  location: string;
  opponent?: string;
  quarterCount: number;
  quarterDuration: number;
  breakDuration: number;
  status: MatchStatus;
  voteDeadline?: string;
  score?: string | null;
  uniformType: "HOME" | "AWAY";
  matchType: "REGULAR" | "INTERNAL" | "EVENT";
  statsIncluded: boolean;
};

type DbMatch = {
  id: string;
  team_id: string;
  opponent_name: string;
  match_date: string;
  match_time: string;
  match_end_time: string | null;
  match_end_date: string | null;
  location: string;
  quarter_count: number;
  quarter_duration: number;
  break_duration: number;
  status: MatchStatus;
  vote_deadline: string | null;
  score?: string | null;
  uniform_type?: string | null;
  match_type?: string | null;
  stats_included?: boolean | null;
  created_by: string;
  created_at: string;
};

type DbAttendance = {
  match_id: string;
  user_id: string | null;
  member_id: string | null;
  vote: AttendanceVote;
  users: { name: string } | null;
};

type AttendanceState = Record<string, Record<string, AttendanceVote>>;

function mapDbMatchToMatch(db: DbMatch): Match {
  return {
    id: db.id,
    date: db.match_date,
    time: db.match_time,
    endTime: db.match_end_time,
    endDate: db.match_end_date,
    location: db.location,
    opponent: db.opponent_name || undefined,
    quarterCount: db.quarter_count,
    quarterDuration: db.quarter_duration,
    breakDuration: db.break_duration,
    status: db.status,
    voteDeadline: db.vote_deadline || undefined,
    score: db.score ?? null,
    uniformType: (db.uniform_type === "AWAY" ? "AWAY" : "HOME") as "HOME" | "AWAY",
    matchType: (db.match_type === "INTERNAL" ? "INTERNAL" : db.match_type === "EVENT" ? "EVENT" : "REGULAR") as "REGULAR" | "INTERNAL" | "EVENT",
    statsIncluded: db.stats_included ?? true,
  };
}

type TeamUniform = { primary: string | null; secondary: string | null; pattern: string | null };

export default function MatchesClient({ userId, userRole, initialMatches, sportType = "SOCCER", teamUniform }: { userId: string; userRole?: Role; initialMatches?: { matches: DbMatch[] }; sportType?: SportType; teamUniform?: TeamUniform }) {
  const { effectiveRole } = useViewAsRole();
  const role = effectiveRole(userRole);
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    data: matchesData,
    loading: matchesLoading,
    error: matchesError,
    refetch: refetchMatches,
  } = useApi<{ matches: DbMatch[] }>("/api/matches", initialMatches ?? { matches: [] }, { skip: !!initialMatches });

  const {
    data: attendanceData,
    loading: attendanceLoading,
    refetch: refetchAttendance,
  } = useApi<{ attendance: DbAttendance[] }>("/api/attendance", { attendance: [] });

  // 실시간 참석 투표 동기화
  useRealtimeSubscription({
    table: "match_attendance",
    events: ["INSERT", "UPDATE"],
    onchange: () => refetchAttendance(),
  });

  const defaults = SPORT_DEFAULTS[sportType];
  const isFutsal = sportType === "FUTSAL";

  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [isOpen, setIsOpen] = useState(searchParams.get("create") === "true");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [votingMatchId, setVotingMatchId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [now, setNow] = useState<number>(0);
  useEffect(() => { setNow(Date.now()); }, []);
  const today = now ? new Date(now).toISOString().split("T")[0] : "";
  const [matchDate, setMatchDate] = useState(today);
  // today가 설정되면 matchDate 동기화
  useEffect(() => { if (today && !matchDate) setMatchDate(today); }, [today, matchDate]);
  const [matchTime, setMatchTime] = useState("09:00");
  const [matchEndTime, setMatchEndTime] = useState("11:00");
  const [location, setLocation] = useState("");
  const [voteDeadline, setVoteDeadline] = useState("");

  // matchDate 변경 시 투표 마감일 자동 계산 (경기 전날 17시)
  useEffect(() => {
    if (!matchDate) return;
    const prev = new Date(matchDate + "T00:00:00");
    prev.setDate(prev.getDate() - 1);
    const yyyy = prev.getFullYear();
    const mm = String(prev.getMonth() + 1).padStart(2, "0");
    const dd = String(prev.getDate()).padStart(2, "0");
    setVoteDeadline(`${yyyy}-${mm}-${dd}T17:00`);
  }, [matchDate]);
  const [playerCount, setPlayerCount] = useState(defaults.playerCount);
  const [matchType, setMatchType] = useState<"REGULAR" | "INTERNAL" | "EVENT">("REGULAR");
  const [statsIncluded, setStatsIncluded] = useState(true);

  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    const handleBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    if (isOpen) {
      window.addEventListener("keydown", handleEsc);
      window.addEventListener("beforeunload", handleBeforeUnload);
      return () => { window.removeEventListener("keydown", handleEsc); window.removeEventListener("beforeunload", handleBeforeUnload); };
    }
  }, [isOpen]);

  // 자주 사용하는 장소 목록 (기존 경기에서 추출)
  const recentLocations = useMemo(() => {
    const locs = (matchesData.matches ?? [])
      .map((m) => m.location)
      .filter((l): l is string => !!l && l.trim() !== "");
    // 빈도순 정렬, 중복 제거
    const counts = new Map<string, number>();
    locs.forEach((l) => counts.set(l, (counts.get(l) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([loc]) => loc);
  }, [matchesData.matches]);

  const matches: Match[] = useMemo(
    () => (matchesData.matches ?? []).map(mapDbMatchToMatch),
    [matchesData.matches]
  );

  const attendance: AttendanceState = useMemo(() => {
    const state: AttendanceState = {};
    for (const row of attendanceData.attendance ?? []) {
      if (!state[row.match_id]) state[row.match_id] = {};
      // 연동 멤버는 user_id, 미연동 멤버는 member_id로 키 설정
      const key = row.user_id ?? row.member_id;
      if (key) state[row.match_id][key] = row.vote;
    }
    return state;
  }, [attendanceData.attendance]);

  const sortedMatches = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return [...matches].sort((a, b) => {
      const aIsPast = a.date < today || a.status === "COMPLETED";
      const bIsPast = b.date < today || b.status === "COMPLETED";
      // 다가오는 경기 먼저, 지난 경기는 뒤로
      if (aIsPast !== bIsPast) return aIsPast ? 1 : -1;
      // 다가오는 경기: 가까운 날짜 먼저
      if (!aIsPast) return (a.date + a.time).localeCompare(b.date + b.time);
      // 지난 경기: 최근 날짜 먼저
      return (b.date + b.time).localeCompare(a.date + a.time);
    });
  }, [matches]);

  async function handleCreate(formData: FormData) {
    const errors: Record<string, string> = {};
    if (!String(formData.get("date") || "").trim()) errors.matchDate = "경기 날짜를 선택해주세요.";
    if (!String(formData.get("location") || "").trim()) errors.location = "장소를 입력해주세요.";
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    setSubmitting(true);
    const body = {
      date: String(formData.get("date") || ""),
      time: String(formData.get("time") || ""),
      endTime: String(formData.get("endTime") || "") || undefined,
      location: String(formData.get("location") || ""),
      opponent: matchType === "INTERNAL" ? null : String(formData.get("opponent") || ""),
      quarterCount: matchType === "EVENT" ? 1 : Number(formData.get("quarterCount") || defaults.quarters),
      quarterDuration: matchType === "EVENT" ? 0 : Number(formData.get("quarterDuration") || defaults.duration),
      breakDuration: matchType === "EVENT" ? 0 : Number(formData.get("breakDuration") || defaults.breakTime),
      playerCount,
      voteDeadline: String(formData.get("voteDeadline") || "") || undefined,
      matchType,
      statsIncluded: matchType === "EVENT" ? false : statsIncluded,
      endDate: matchType === "EVENT" ? (String(formData.get("endDate") || "") || undefined) : undefined,
    };
    const { error, data } = await apiMutate<{ id: string }>("/api/matches", "POST", body);
    setSubmitting(false);
    if (!error) {
      GA.matchCreate(body.matchType ?? "REGULAR");
      showToast("경기 일정이 등록되었습니다.");
      if (data?.id) {
        router.push(`/matches/${data.id}`);
      } else {
        await refetchMatches();
        setIsOpen(false);
      }
    } else {
      showToast(toKoreanError(error), "error");
    }
  }

  async function handleVote(matchId: string, vote: AttendanceVote) {
    setVotingMatchId(matchId);
    const { error } = await apiMutate("/api/attendance", "POST", { matchId, vote });
    setVotingMatchId(null);
    if (!error) {
      GA.voteComplete(vote, "match_list");
      await refetchAttendance();
      showToast("참석 의사를 저장했습니다.");
    } else {
      showToast(toKoreanError(error), "error");
    }
  }

  if (matchesError) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <span className="text-destructive">오류: {toKoreanError(matchesError)}</span>
          <Button variant="outline" size="sm" onClick={refetchMatches}>다시 시도</Button>
        </div>
      </Card>
    );
  }

  if (matchesLoading || attendanceLoading) {
    return (
      <div className="grid gap-5">
        <Card className="rounded-md">
          <CardHeader>
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-1 h-7 w-32" />
          </CardHeader>
        </Card>
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="rounded-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-10 rounded-full" />
                    <Skeleton className="h-6 w-44" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-8 w-20 rounded-md" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-[1.2fr_1fr]">
                  <Skeleton className="h-16 rounded-md" />
                  <Skeleton className="h-16 rounded-md" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <Card className="rounded-md">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CardTitle className="font-heading text-lg sm:text-2xl font-bold uppercase">
                경기 일정
              </CardTitle>
              <div className="flex rounded-lg bg-secondary/50 p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-semibold transition-colors",
                    viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  목록
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("calendar")}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-semibold transition-colors",
                    viewMode === "calendar" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  캘린더
                </button>
              </div>
            </div>
            {isStaffOrAbove(role) && (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => { setIsOpen((prev) => !prev); setFormErrors({}); }}
              >
                일정 등록하기
              </Button>
            )}
          </div>
        </CardHeader>

        {isOpen ? (
          <CardContent ref={formRef}>
            <form
              className="grid gap-4 rounded-md border border-border bg-card p-5"
              action={(formData) => handleCreate(formData)}
            >
              {/* 경기 유형 — 최상단 */}
              <div className="space-y-2">
                <Label>경기 유형</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMatchType("REGULAR")}
                    className={cn(
                      "flex-1 min-h-[40px] rounded-lg border px-3 text-sm font-medium transition-colors",
                      matchType === "REGULAR"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/30"
                    )}
                  >
                    일반 경기
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatchType("INTERNAL")}
                    className={cn(
                      "flex-1 min-h-[40px] rounded-lg border px-3 text-sm font-medium transition-colors",
                      matchType === "INTERNAL"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/30"
                    )}
                  >
                    자체전
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMatchType("EVENT"); setStatsIncluded(false); }}
                    className={cn(
                      "flex-1 min-h-[40px] rounded-lg border px-3 text-sm font-medium transition-colors",
                      matchType === "EVENT"
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border text-muted-foreground hover:border-accent/30"
                    )}
                  >
                    팀 일정
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="date">날짜 <span className="text-destructive">*</span></Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    required
                    autoFocus
                    value={matchDate}
                    onChange={(e) => {
                      const d = e.target.value;
                      setMatchDate(d);
                      setFormErrors((prev) => ({ ...prev, matchDate: "" }));
                      if (d) {
                        const prev = new Date(d);
                        prev.setDate(prev.getDate() - 1);
                        const yyyy = prev.getFullYear();
                        const mm = String(prev.getMonth() + 1).padStart(2, "0");
                        const dd = String(prev.getDate()).padStart(2, "0");
                        setVoteDeadline(`${yyyy}-${mm}-${dd}T17:00`);
                      }
                    }}
                    className={formErrors.matchDate ? "border-destructive" : ""}
                  />
                  {formErrors.matchDate && <p className="text-xs text-destructive mt-1">{formErrors.matchDate}</p>}
                </div>
                <div className="space-y-2">
                  <Label>시간</Label>
                  <div className="flex items-center gap-2">
                    <select
                      id="time"
                      name="time"
                      required
                      value={matchTime}
                      onChange={(e) => {
                        const val = e.target.value;
                        setMatchTime(val);
                        // 종료시간 자동 계산: +2시간
                        const [hh, mm] = val.split(":").map(Number);
                        const endH = String((hh + 2) % 24).padStart(2, "0");
                        setMatchEndTime(`${endH}:${String(mm).padStart(2, "0")}`);
                      }}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {Array.from({ length: 48 }, (_, i) => {
                        const h = String(Math.floor(i / 2)).padStart(2, "0");
                        const m = i % 2 === 0 ? "00" : "30";
                        return <option key={i} value={`${h}:${m}`}>{h}:{m}</option>;
                      })}
                    </select>
                    <span className="text-muted-foreground shrink-0">~</span>
                    <select
                      id="endTime"
                      name="endTime"
                      value={matchEndTime}
                      onChange={(e) => setMatchEndTime(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {Array.from({ length: 48 }, (_, i) => {
                        const h = String(Math.floor(i / 2)).padStart(2, "0");
                        const m = i % 2 === 0 ? "00" : "30";
                        return <option key={i} value={`${h}:${m}`}>{h}:{m}</option>;
                      })}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="voteDeadline">투표 마감 <span className="text-xs font-normal text-muted-foreground">(기본: 경기 전날 17시)</span></Label>
                  <Input
                    id="voteDeadline"
                    name="voteDeadline"
                    type="datetime-local"
                    value={voteDeadline}
                    onChange={(e) => setVoteDeadline(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">이 시간까지 참석 여부를 알려주세요</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">장소</Label>
                  <Input
                    id="location"
                    name="location"
                    required
                    value={location}
                    onChange={(e) => { setLocation(e.target.value); setFormErrors((prev) => ({ ...prev, location: "" })); }}
                    placeholder={recentLocations[0] ?? "예: 어린이대공원축구장"}
                    className={formErrors.location ? "border-destructive" : ""}
                  />
                  {formErrors.location && <p className="text-xs text-destructive mt-1">{formErrors.location}</p>}
                  {recentLocations.length > 0 && !location && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-xs text-muted-foreground mr-0.5">최근 장소:</span>
                      {recentLocations.slice(0, 5).map((loc) => (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => setLocation(loc)}
                          className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
                        >
                          {loc}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {matchType === "EVENT" ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="opponent">일정 제목</Label>
                      <Input id="opponent" name="opponent" placeholder="예: 연말 회식, MT, 유니폼 주문" />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="multiDay"
                        className="h-4 w-4 rounded border-border accent-primary"
                        onChange={(e) => {
                          const endDateInput = document.getElementById("endDate") as HTMLInputElement;
                          if (endDateInput) endDateInput.disabled = !e.target.checked;
                        }}
                      />
                      <Label htmlFor="multiDay" className="text-sm text-muted-foreground cursor-pointer">
                        1박 이상 일정
                      </Label>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate">종료일</Label>
                      <Input id="endDate" name="endDate" type="date" disabled />
                    </div>
                  </>
                ) : matchType === "REGULAR" ? (
                  <div className="space-y-2">
                    <Label htmlFor="opponent">상대팀</Label>
                    <Input id="opponent" name="opponent" />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="statsIncluded"
                      checked={statsIncluded}
                      onChange={(e) => setStatsIncluded(e.target.checked)}
                      className="h-4 w-4 rounded border-border accent-primary"
                    />
                    <Label htmlFor="statsIncluded" className="text-sm text-muted-foreground cursor-pointer">
                      개인 기록 통계에 반영
                    </Label>
                  </div>
                )}
              </div>
              {matchType !== "EVENT" && (
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showAdvanced ? "상세 설정 접기 ▲" : "상세 설정 ▼"}
              </button>
              )}
              {showAdvanced && matchType !== "EVENT" && (
                <div className="grid gap-3 animate-slide-down">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="quarterCount">쿼터 수</Label>
                      <Input
                        id="quarterCount"
                        name="quarterCount"
                        type="number"
                        min={1}
                        max={12}
                        defaultValue={defaults.quarters}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quarterDuration">쿼터 시간 (분)</Label>
                      <Input
                        id="quarterDuration"
                        name="quarterDuration"
                        type="number"
                        min={10}
                        max={40}
                        defaultValue={defaults.duration}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="breakDuration">휴식 시간 (분)</Label>
                      <Input
                        id="breakDuration"
                        name="breakDuration"
                        type="number"
                        min={0}
                        max={15}
                        defaultValue={defaults.breakTime}
                      />
                    </div>
                  </div>
                  {isFutsal && (
                    <div className="space-y-2">
                      <Label htmlFor="playerCount">참가 인원 (명)</Label>
                      <Input
                        id="playerCount"
                        name="playerCount"
                        type="number"
                        min={3}
                        max={8}
                        value={playerCount}
                        onChange={(e) => setPlayerCount(Number(e.target.value))}
                      />
                    </div>
                  )}
                </div>
              )}
              <Button type="submit" variant="default" disabled={submitting}>
                {submitting ? "저장 중..." : "일정 저장"}
              </Button>
            </form>
          </CardContent>
        ) : null}
      </Card>

      {viewMode === "calendar" ? (
        <Card className="rounded-md">
          <CardContent className="p-4">
            <MatchCalendar
              matches={sortedMatches.map((m) => {
                const matchVotes = Object.values(attendance[m.id] ?? {});
                return {
                  id: m.id,
                  date: m.date,
                  time: m.time,
                  endTime: m.endTime,
                  endDate: m.endDate,
                  location: m.location,
                  opponent: m.opponent,
                  status: m.status,
                  score: m.score,
                  matchType: m.matchType,
                  attendCount: matchVotes.filter((v) => v === "ATTEND").length,
                  absentCount: matchVotes.filter((v) => v === "ABSENT").length,
                  maybeCount: matchVotes.filter((v) => v === "MAYBE").length,
                };
              })}
              myVotes={Object.fromEntries(
                sortedMatches.map((m) => [m.id, attendance[m.id]?.[userId] ?? ""])
                  .filter(([, v]) => v)
              )}
              onVote={handleVote}
              votingMatchId={votingMatchId}
            />
          </CardContent>
        </Card>
      ) : (
      <section className="grid gap-4">
        {sortedMatches.length === 0 && (
          <Card className="rounded-md p-6">
            <CardContent className="p-0">
              <EmptyState
                icon={Calendar}
                title="등록된 일정이 없습니다"
                description="새 일정을 등록해보세요."
                action={
                  isStaffOrAbove(role) ? (
                    <Button size="sm" onClick={() => setIsOpen(true)}>
                      일정 등록하기
                    </Button>
                  ) : undefined
                }
              />
            </CardContent>
          </Card>
        )}
        {sortedMatches.map((match) => {
          const vote = attendance[match.id]?.[userId];
          const matchVotes = Object.values(attendance[match.id] ?? {});
          const attendCount = matchVotes.filter((v) => v === "ATTEND").length;
          const absentCount = matchVotes.filter((v) => v === "ABSENT").length;
          const maybeCount = matchVotes.filter((v) => v === "MAYBE").length;
          const isCompleted = match.status === "COMPLETED";
          return (
            <Card key={match.id} className={cn("rounded-xl overflow-hidden transition-all hover:border-border/80", isCompleted && "opacity-70")}>
              {/* 메인: 클릭 → 상세 */}
              <Link href={`/matches/${match.id}`} className="block p-4">
                {/* 1줄: 시간+날짜 (좌) | 스코어 or 투표현황 + 꺽쇠 (우) */}
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-baseline gap-2 min-w-0">
                    <span className={cn("text-lg font-bold", isCompleted ? "text-muted-foreground" : "text-primary")}>
                      {formatTime(match.time)}
                      {match.endTime && <span className={isCompleted ? "text-muted-foreground/50" : "text-primary/50"}> ~ {formatTime(match.endTime)}</span>}
                    </span>
                    <span className="text-sm text-muted-foreground">{formatMatchDate(match.date)}</span>
                  </p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isCompleted && match.score ? (() => {
                      const [left, right] = match.score.split(":").map((s) => parseInt(s.trim(), 10));
                      const color = match.matchType === "INTERNAL" ? "text-foreground"
                        : left > right ? "text-[hsl(var(--win))]" : left === right ? "text-muted-foreground" : "text-[hsl(var(--loss))]";
                      const bgColor = left > right ? "bg-[hsl(var(--win))]/15 text-[hsl(var(--win))]" : left === right ? "bg-muted text-muted-foreground" : "bg-[hsl(var(--loss))]/15 text-[hsl(var(--loss))]";
                      const label = match.matchType === "INTERNAL" ? "" : left > right ? "승" : left === right ? "무" : "패";
                      return (
                        <>
                          <span className={cn("text-xl font-heading font-bold", color)}>{match.score}</span>
                          {label && <span className={cn("rounded px-1.5 py-0.5 text-xs font-bold", bgColor)}>{label}</span>}
                        </>
                      );
                    })() : null}
                    <span className="text-muted-foreground/20 text-lg">›</span>
                  </div>
                </div>

                {/* 2줄: 장소 · 상대 | 유니폼 dot (우측) */}
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground truncate min-w-0">
                    <span className="mr-1">📍</span>
                    {match.location}
                    {match.matchType === "EVENT" ? (match.opponent ? `  ·  ${match.opponent}` : "")
                      : match.matchType === "INTERNAL" ? "  ·  자체전"
                      : match.opponent ? `  ·  vs ${match.opponent}` : ""}
                  </p>
                  {match.matchType !== "EVENT" && (
                    <span
                      className="h-5 w-5 rounded-full border border-border/60 shrink-0"
                      style={{ backgroundColor: teamUniform ? (match.uniformType === "HOME" ? teamUniform.primary ?? "hsl(var(--primary))" : teamUniform.secondary ?? "hsl(var(--muted-foreground))") : (match.uniformType === "HOME" ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))") }}
                    />
                  )}
                </div>

                {/* 3줄: 예정 경기만 투표 현황 텍스트 */}
                {!isCompleted && (
                  <div className="mt-2 flex items-center gap-3 text-sm">
                    <span className="text-[hsl(var(--success))]">참석 <strong>{attendCount}</strong></span>
                    <span className="text-[hsl(var(--loss))]">불참 <strong>{absentCount}</strong></span>
                    <span className="text-[hsl(var(--warning))]">미정 <strong>{maybeCount}</strong></span>
                  </div>
                )}

                {match.matchType === "EVENT" && (
                  <p className="mt-1 text-xs font-semibold text-accent">팀 일정</p>
                )}
              </Link>

              {/* 투표 버튼 + 공유 — 예정 경기만 */}
              {!isCompleted && (
                <div className="px-4 pb-3">
                  <div className="flex items-center gap-2">
                    {([
                      { value: "ATTEND" as const, label: "참석" },
                      { value: "MAYBE" as const, label: "미정" },
                      { value: "ABSENT" as const, label: "불참" },
                    ]).map((item) => {
                      const isSelected = vote === item.value;
                      return (
                        <button
                          key={item.value}
                          type="button"
                          disabled={votingMatchId === match.id}
                          className={cn(
                            "flex-1 rounded-lg py-1.5 text-sm font-semibold transition-all duration-200 active:scale-[0.97] disabled:opacity-50",
                            isSelected ? voteStyles[item.value].active : "border border-border text-muted-foreground hover:bg-secondary"
                          )}
                          onClick={() => handleVote(match.id, item.value)}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      className="shrink-0 rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                      onClick={() => shareVoteLink({
                        matchId: match.id,
                        date: match.date,
                        time: match.time,
                        location: match.location,
                        opponent: match.opponent,
                      })}
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </section>
      )}
    </div>
  );
}
