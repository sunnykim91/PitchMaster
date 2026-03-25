"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApi, apiMutate } from "@/lib/useApi";
import { isStaffOrAbove } from "@/lib/permissions";
import { useViewAsRole } from "@/lib/ViewAsRoleContext";
import { useToast } from "@/lib/ToastContext";
import type { Role, SportType } from "@/lib/types";
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
import { Calendar } from "lucide-react";

type MatchStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";
type AttendanceVote = "ATTEND" | "ABSENT" | "MAYBE";

type Match = {
  id: string;
  date: string;
  time: string;
  location: string;
  opponent?: string;
  quarterCount: number;
  quarterDuration: number;
  breakDuration: number;
  status: MatchStatus;
  voteDeadline?: string;
  score?: string | null;
  uniformType: "HOME" | "AWAY";
};

type DbMatch = {
  id: string;
  team_id: string;
  opponent_name: string;
  match_date: string;
  match_time: string;
  location: string;
  quarter_count: number;
  quarter_duration: number;
  break_duration: number;
  status: MatchStatus;
  vote_deadline: string | null;
  score?: string | null;
  uniform_type?: string | null;
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

const attendanceLabels: Record<AttendanceVote, string> = {
  ATTEND: "참석",
  ABSENT: "불참",
  MAYBE: "미정",
};

function mapDbMatchToMatch(db: DbMatch): Match {
  return {
    id: db.id,
    date: db.match_date,
    time: db.match_time,
    location: db.location,
    opponent: db.opponent_name || undefined,
    quarterCount: db.quarter_count,
    quarterDuration: db.quarter_duration,
    breakDuration: db.break_duration,
    status: db.status,
    voteDeadline: db.vote_deadline || undefined,
    score: db.score ?? null,
    uniformType: (db.uniform_type === "AWAY" ? "AWAY" : "HOME") as "HOME" | "AWAY",
  };
}

type TeamUniform = { primary: string | null; secondary: string | null; pattern: string | null };

export default function MatchesClient({ userId, userRole, initialMatches, sportType = "SOCCER", teamUniform }: { userId: string; userRole?: Role; initialMatches?: { matches: DbMatch[] }; sportType?: SportType; teamUniform?: TeamUniform }) {
  const { effectiveRole } = useViewAsRole();
  const role = effectiveRole(userRole);
  const { showToast } = useToast();
  const router = useRouter();

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

  const [isOpen, setIsOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [votingMatchId, setVotingMatchId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const today = new Date().toISOString().split("T")[0];
  const [matchDate, setMatchDate] = useState(today);
  const [matchTime, setMatchTime] = useState("09:00");
  const [location, setLocation] = useState("");
  const [voteDeadline, setVoteDeadline] = useState(() => {
    const prev = new Date(today + "T00:00:00");
    prev.setDate(prev.getDate() - 1);
    const yyyy = prev.getFullYear();
    const mm = String(prev.getMonth() + 1).padStart(2, "0");
    const dd = String(prev.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T17:00`;
  });
  const [playerCount, setPlayerCount] = useState(defaults.playerCount);

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
    if (isOpen) {
      window.addEventListener("keydown", handleEsc);
      return () => window.removeEventListener("keydown", handleEsc);
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
      location: String(formData.get("location") || ""),
      opponent: String(formData.get("opponent") || ""),
      quarterCount: Number(formData.get("quarterCount") || defaults.quarters),
      quarterDuration: Number(formData.get("quarterDuration") || defaults.duration),
      breakDuration: Number(formData.get("breakDuration") || defaults.breakTime),
      playerCount,
      voteDeadline: String(formData.get("voteDeadline") || "") || undefined,
    };
    const { error, data } = await apiMutate<{ id: string }>("/api/matches", "POST", body);
    setSubmitting(false);
    if (!error) {
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
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle className="mt-1 font-heading text-lg sm:text-2xl font-bold uppercase">
              경기 일정 관리
            </CardTitle>
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
                  <Label htmlFor="time">시간</Label>
                  <select
                    id="time"
                    name="time"
                    required
                    value={matchTime}
                    onChange={(e) => setMatchTime(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {Array.from({ length: 48 }, (_, i) => {
                      const h = String(Math.floor(i / 2)).padStart(2, "0");
                      const m = i % 2 === 0 ? "00" : "30";
                      return <option key={i} value={`${h}:${m}`}>{h}:{m}</option>;
                    })}
                  </select>
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
                <div className="space-y-2">
                  <Label htmlFor="opponent">상대팀</Label>
                  <Input
                    id="opponent"
                    name="opponent"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showAdvanced ? "상세 설정 접기 ▲" : "상세 설정 ▼"}
              </button>
              {showAdvanced && (
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
          return (
            <Card key={match.id} className="rounded-md hover:bg-secondary/60 hover:border-border cursor-pointer transition-all">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant={match.status === "COMPLETED" ? "secondary" : "default"}>
                        {match.status === "COMPLETED" ? "완료" : "예정"}
                      </Badge>
                      {match.status === "COMPLETED" && match.score && (() => {
                        const [our, opp] = match.score.split(":").map((s) => parseInt(s.trim(), 10));
                        const color = our > opp ? "text-[hsl(var(--win))]" : our === opp ? "text-muted-foreground" : "text-[hsl(var(--loss))]";
                        const label = our > opp ? "승" : our === opp ? "무" : "패";
                        return (
                          <span className="flex items-center gap-1.5">
                            <span className={cn("type-stat font-heading font-bold", color)}>{match.score}</span>
                            <span className={cn("rounded-full px-1.5 py-0.5 text-xs font-bold",
                              our > opp ? "bg-[hsl(var(--win)/0.15)] text-[hsl(var(--win))]" : our === opp ? "bg-muted text-muted-foreground" : "bg-[hsl(var(--loss)/0.15)] text-[hsl(var(--loss))]"
                            )}>{label}</span>
                          </span>
                        );
                      })()}
                    </div>
                    <CardTitle className="mt-2 font-heading text-lg sm:text-2xl font-bold uppercase">
                      {formatMatchDate(match.date)} · {formatTime(match.time)}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground truncate max-w-[280px] sm:max-w-none">
                      {match.location} {match.opponent ? `· ${match.opponent}` : ""}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <div
                        className="h-3 w-3 rounded-full border border-border/60 shrink-0"
                        style={{ backgroundColor: teamUniform ? (match.uniformType === "HOME" ? teamUniform.primary ?? "#2563eb" : teamUniform.secondary ?? "#f97316") : (match.uniformType === "HOME" ? "#2563eb" : "#f97316") }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {match.uniformType === "HOME" ? "홈" : "원정"} 유니폼
                      </span>
                    </div>
                    {match.voteDeadline && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        투표 마감: {formatDateTime(match.voteDeadline ?? "")}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {match.status !== "COMPLETED" && match.voteDeadline && new Date(match.voteDeadline) > new Date() && (
                      <Button
                        type="button"
                        size="sm"
                        className="bg-[hsl(var(--kakao))] text-[hsl(var(--kakao-foreground))] hover:bg-[hsl(var(--kakao))]/90 text-xs"
                        onClick={() => shareVoteLink({
                          matchId: match.id,
                          date: match.date,
                          time: match.time,
                          location: match.location,
                          opponent: match.opponent,
                        })}
                      >
                        투표 공유
                      </Button>
                    )}
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/matches/${match.id}`}>
                        상세 보기
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-xs text-muted-foreground">
                  쿼터 {match.quarterCount} · {match.quarterDuration}분 · 휴식 {match.breakDuration}분
                </p>
                <div className="grid gap-3">
                  {match.status !== "COMPLETED" && (
                  <div className="rounded-md border border-border bg-card p-4">
                    <p className="text-sm font-bold text-card-foreground">참석 투표</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {([
                        { value: "ATTEND" as const, label: "참석" },
                        { value: "ABSENT" as const, label: "불참" },
                        { value: "MAYBE" as const, label: "미정" },
                      ]).map((item) => {
                        const isSelected = vote === item.value;
                        return (
                          <button
                            key={item.value}
                            type="button"
                            disabled={votingMatchId === match.id}
                            className={cn(
                              "rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 active:scale-105 disabled:opacity-50",
                              isSelected ? voteStyles[item.value].active : voteStyles[item.value].inactive
                            )}
                            onClick={() => handleVote(match.id, item.value)}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        내 투표: {vote ? attendanceLabels[vote] : "미선택"}
                      </p>
                      <div className="flex gap-2 text-xs">
                        <span className="text-[hsl(var(--success))] font-semibold">참석 {attendCount}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-[hsl(var(--loss))] font-semibold">불참 {absentCount}</span>
                        {maybeCount > 0 && (
                          <>
                            <span className="text-muted-foreground">·</span>
                            <span className="text-[hsl(var(--warning))] font-semibold">미정 {maybeCount}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
