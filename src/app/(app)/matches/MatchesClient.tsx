"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useApi, apiMutate } from "@/lib/useApi";
import { isStaffOrAbove } from "@/lib/permissions";
import { useViewAsRole } from "@/lib/ViewAsRoleContext";
import type { Role } from "@/lib/types";
import { cn, formatTime, formatDateTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

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
  created_by: string;
  created_at: string;
};

type DbAttendance = {
  match_id: string;
  user_id: string;
  vote: AttendanceVote;
  users: { name: string };
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
  };
}

export default function MatchesClient({ userId, userRole }: { userId: string; userRole?: Role }) {
  const { effectiveRole } = useViewAsRole();
  const role = effectiveRole(userRole);

  const {
    data: matchesData,
    loading: matchesLoading,
    error: matchesError,
    refetch: refetchMatches,
  } = useApi<{ matches: DbMatch[] }>("/api/matches", { matches: [] });

  const {
    data: attendanceData,
    loading: attendanceLoading,
    refetch: refetchAttendance,
  } = useApi<{ attendance: DbAttendance[] }>("/api/attendance", { attendance: [] });

  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [matchDate, setMatchDate] = useState("");
  const [voteDeadline, setVoteDeadline] = useState("");

  const matches: Match[] = useMemo(
    () => (matchesData.matches ?? []).map(mapDbMatchToMatch),
    [matchesData.matches]
  );

  const attendance: AttendanceState = useMemo(() => {
    const state: AttendanceState = {};
    for (const row of attendanceData.attendance ?? []) {
      if (!state[row.match_id]) state[row.match_id] = {};
      state[row.match_id][row.user_id] = row.vote;
    }
    return state;
  }, [attendanceData.attendance]);

  const sortedMatches = useMemo(
    () => [...matches].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)),
    [matches]
  );

  async function handleCreate(formData: FormData) {
    setSubmitting(true);
    const body = {
      date: String(formData.get("date") || ""),
      time: String(formData.get("time") || ""),
      location: String(formData.get("location") || ""),
      opponent: String(formData.get("opponent") || ""),
      quarterCount: Number(formData.get("quarterCount") || 4),
      quarterDuration: Number(formData.get("quarterDuration") || 25),
      breakDuration: Number(formData.get("breakDuration") || 5),
      voteDeadline: String(formData.get("voteDeadline") || "") || undefined,
    };
    const { error } = await apiMutate("/api/matches", "POST", body);
    setSubmitting(false);
    if (!error) {
      await refetchMatches();
      setIsOpen(false);
    }
  }

  async function handleVote(matchId: string, vote: AttendanceVote) {
    const { error } = await apiMutate("/api/attendance", "POST", { matchId, vote });
    if (!error) {
      await refetchAttendance();
    }
  }

  if (matchesLoading || attendanceLoading) {
    return (
      <Card className="rounded-md p-6">
        <CardContent className="p-0">불러오는 중...</CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-5">
      <Card className="rounded-md">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-sky-400">Matches</p>
              <CardTitle className="mt-1 font-heading text-2xl font-bold uppercase">
                경기 일정 관리
              </CardTitle>
            </div>
            {isStaffOrAbove(role) && (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => setIsOpen((prev) => !prev)}
              >
                일정 등록하기
              </Button>
            )}
          </div>
        </CardHeader>

        {isOpen ? (
          <CardContent>
            <form
              className="grid gap-4 rounded-md border border-border bg-card p-5"
              action={(formData) => handleCreate(formData)}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="date">날짜</Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    required
                    value={matchDate}
                    onChange={(e) => {
                      const d = e.target.value;
                      setMatchDate(d);
                      if (d) {
                        const prev = new Date(d);
                        prev.setDate(prev.getDate() - 1);
                        const yyyy = prev.getFullYear();
                        const mm = String(prev.getMonth() + 1).padStart(2, "0");
                        const dd = String(prev.getDate()).padStart(2, "0");
                        setVoteDeadline(`${yyyy}-${mm}-${dd}T17:00`);
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">시간</Label>
                  <Input
                    id="time"
                    name="time"
                    type="time"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">장소</Label>
                  <Input
                    id="location"
                    name="location"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="opponent">상대팀</Label>
                  <Input
                    id="opponent"
                    name="opponent"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="quarterCount">쿼터 수</Label>
                  <Input
                    id="quarterCount"
                    name="quarterCount"
                    type="number"
                    min={1}
                    max={6}
                    defaultValue={4}
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
                    defaultValue={25}
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
                    defaultValue={5}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="voteDeadline">투표 마감일</Label>
                <Input
                  id="voteDeadline"
                  name="voteDeadline"
                  type="datetime-local"
                  value={voteDeadline}
                  onChange={(e) => setVoteDeadline(e.target.value)}
                />
              </div>
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
            <CardContent className="p-0 text-sm text-muted-foreground">
              등록된 경기 일정이 없습니다.
            </CardContent>
          </Card>
        )}
        {sortedMatches.map((match) => {
          const vote = attendance[match.id]?.[userId];
          return (
            <Card key={match.id} className="rounded-md">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <Badge variant={match.status === "COMPLETED" ? "secondary" : "default"}>
                      {match.status === "COMPLETED" ? "완료" : "예정"}
                    </Badge>
                    <CardTitle className="mt-2 font-heading text-xl font-bold uppercase">
                      {match.date} · {formatTime(match.time)}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {match.location} {match.opponent ? `· ${match.opponent}` : ""}
                    </p>
                    {match.voteDeadline && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        투표 마감: {formatDateTime(match.voteDeadline ?? "")}
                      </p>
                    )}
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/matches/${match.id}`}>
                      상세 보기
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-[1.2fr_1fr]">
                  <div className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
                    <p className="font-bold text-card-foreground">경기 정보</p>
                    <p className="mt-2">쿼터 {match.quarterCount} · {match.quarterDuration}분 경기</p>
                    <p>휴식 {match.breakDuration}분</p>
                  </div>
                  <div className="rounded-md border border-border bg-card p-4">
                    <p className="text-sm font-bold text-card-foreground">참석 투표</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {([
                        { value: "ATTEND" as const, label: "참석", activeVariant: "success" as const },
                        { value: "ABSENT" as const, label: "불참", activeVariant: "destructive" as const },
                        { value: "MAYBE" as const, label: "미정", activeVariant: "warning" as const },
                      ]).map((item) => (
                        <Button
                          key={item.value}
                          type="button"
                          variant={vote === item.value ? item.activeVariant : "secondary"}
                          size="sm"
                          onClick={() => handleVote(match.id, item.value)}
                        >
                          {item.label}
                        </Button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      내 투표: {vote ? attendanceLabels[vote] : "미선택"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
