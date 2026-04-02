"use client";

import { memo, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn, formatTime } from "@/lib/utils";

type CalendarMatch = {
  id: string;
  date: string;       // YYYY-MM-DD
  time: string;
  endTime?: string | null;
  location: string;
  opponent?: string;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";
  score?: string | null;
  matchType: "REGULAR" | "INTERNAL" | "EVENT";
  endDate?: string | null;
  // 투표 집계
  attendCount?: number;
  absentCount?: number;
  maybeCount?: number;
};

interface MatchCalendarProps {
  matches: CalendarMatch[];
  myVotes?: Record<string, string>;  // matchId → vote value
  onVote?: (matchId: string, vote: string) => void;
  votingMatchId?: string | null;
}

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  // 월요일 시작 (0=월, 6=일)
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const days: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);
  // 6주 채우기
  while (days.length < 42) days.push(null);
  return days;
}

const VOTE_STYLES: Record<string, { active: string }> = {
  ATTEND: { active: "bg-[hsl(var(--success))] text-white" },
  MAYBE: { active: "bg-[hsl(var(--warning))] text-white" },
  ABSENT: { active: "bg-[hsl(var(--loss))] text-white" },
};

export const MatchCalendar = memo(function MatchCalendar({ matches, myVotes, onVote, votingMatchId }: MatchCalendarProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  // 이번 달 경기 맵 (날짜 → 경기 배열)
  const matchesByDate = useMemo(() => {
    const map = new Map<string, CalendarMatch[]>();
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    for (const m of matches) {
      // 시작일
      if (m.date.startsWith(prefix)) {
        const arr = map.get(m.date) ?? [];
        arr.push(m);
        map.set(m.date, arr);
      }
      // 종료일까지 (1박2일 등)
      if (m.endDate && m.endDate !== m.date) {
        const start = new Date(m.date);
        const end = new Date(m.endDate);
        const cur = new Date(start);
        // 최대 30일 제한 (안전장치)
        for (let i = 0; i < 30 && cur <= end; i++) {
          const ds = cur.toISOString().slice(0, 10);
          if (ds !== m.date && ds.startsWith(prefix)) {
            const arr = map.get(ds) ?? [];
            if (!arr.find((x) => x.id === m.id)) arr.push(m);
            map.set(ds, arr);
          }
          cur.setTime(cur.getTime() + 86400000);
        }
      }
    }
    return map;
  }, [matches, year, month]);

  const days = useMemo(() => getMonthDays(year, month), [year, month]);

  const selectedMatches = selectedDate ? (matchesByDate.get(selectedDate) ?? []) : [];

  function prevMonth() {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
    setSelectedDate(null);
  }
  function nextMonth() {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
    setSelectedDate(null);
  }

  return (
    <div className="space-y-3">
      {/* 월 네비게이션 */}
      <div className="flex items-center justify-between">
        <button type="button" onClick={prevMonth} className="rounded-lg p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-secondary transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h3 className="text-base font-bold">
          {year}년 {month + 1}월
        </h3>
        <button type="button" onClick={nextMonth} className="rounded-lg p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-secondary transition-colors">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 text-center">
        {WEEKDAYS.map((day, i) => (
          <span key={day} className={cn(
            "text-xs font-semibold py-2",
            i >= 5 ? "text-primary/70" : "text-muted-foreground"
          )}>
            {day}
          </span>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} className="aspect-square" />;

          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayMatches = matchesByDate.get(dateStr);
          const hasMatch = !!dayMatches && dayMatches.length > 0;
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const dow = i % 7; // 0=월 ... 6=일

          // 경기 결과에 따른 도트 색상
          let dotColor = "bg-primary"; // 예정
          if (hasMatch) {
            const m = dayMatches[0];
            if (m.matchType === "EVENT") {
              dotColor = "bg-[hsl(var(--accent))]";
            } else if (m.status === "COMPLETED" && m.score) {
              const [l, r] = m.score.split(":").map((s) => parseInt(s.trim(), 10));
              if (l > r) dotColor = "bg-[hsl(var(--win))]";
              else if (l < r) dotColor = "bg-[hsl(var(--loss))]";
              else dotColor = "bg-muted-foreground";
            }
          }

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => setSelectedDate(isSelected ? null : dateStr)}
              className={cn(
                "flex flex-col items-center justify-center rounded-lg transition-all text-sm relative py-3",
                isSelected && isToday ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background" :
                isSelected ? "bg-primary text-primary-foreground" :
                isToday ? "ring-2 ring-primary text-primary font-bold" :
                hasMatch && "bg-primary/8",
                !isSelected && !isToday && "hover:bg-secondary",
                dow >= 5 && !isSelected && !isToday && "text-primary/70",
              )}
            >
              {day}
              {hasMatch && (
                <span className={cn(
                  "absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-4 rounded-full",
                  isSelected ? "bg-primary-foreground" : dotColor
                )} />
              )}
            </button>
          );
        })}
      </div>

      {/* 선택된 날짜의 경기 */}
      {selectedDate && (
        <div className="space-y-2 pt-2 border-t border-border/30">
          <p className="text-xs font-semibold text-muted-foreground">
            {parseInt(selectedDate.split("-")[1])}월 {parseInt(selectedDate.split("-")[2])}일
          </p>
          {selectedMatches.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">이 날짜에 경기가 없습니다</p>
          )}
          {selectedMatches.map((m) => {
            const isCompleted = m.status === "COMPLETED";
            let resultBadge = null;
            if (isCompleted && m.score) {
              const [l, r] = m.score.split(":").map((s) => parseInt(s.trim(), 10));
              const label = l > r ? "승" : l < r ? "패" : "무";
              const variant = l > r ? "success" : l < r ? "destructive" : ("secondary" as const);
              resultBadge = <Badge variant={variant} className="text-xs">{label} {m.score}</Badge>;
            }

            const myVote = myVotes?.[m.id];
            return (
              <Card key={m.id} className={cn("rounded-xl overflow-hidden transition-all hover:border-border/80 relative", isCompleted && "opacity-70")}>
                <span className="absolute top-3 right-3 text-muted-foreground/20 text-lg">›</span>
                {/* 투표 현황 (예정 경기만) */}
                {!isCompleted && (m.attendCount !== undefined) && (
                  <div className="px-3 pt-3 flex items-center gap-3 text-xs">
                    <span className="text-[hsl(var(--success))]">참석 <strong>{m.attendCount}</strong></span>
                    <span className="text-[hsl(var(--loss))]">불참 <strong>{m.absentCount}</strong></span>
                    <span className="text-[hsl(var(--warning))]">미정 <strong>{m.maybeCount}</strong></span>
                  </div>
                )}
                {/* 경기 정보 */}
                <Link href={`/matches/${m.id}`} className="block px-3 py-2">
                  <p className="flex items-baseline gap-1.5">
                    <span className={cn("text-lg font-bold", isCompleted ? "text-muted-foreground" : "text-primary")}>
                      {formatTime(m.time)}
                      {m.endTime && <span className={isCompleted ? "text-muted-foreground/50" : "text-primary/50"}> ~ {formatTime(m.endTime)}</span>}
                    </span>
                    {isCompleted && m.score ? <span className="ml-1">{resultBadge}</span> : null}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5 pr-6">
                    📍 {m.location}
                    {m.opponent && ` · vs ${m.opponent}`}
                  </p>
                </Link>
                {/* 투표 버튼 (예정 경기 + onVote 있을 때) */}
                {!isCompleted && onVote && (
                  <div className="px-3 pb-3 flex items-center gap-2">
                    {(["ATTEND", "MAYBE", "ABSENT"] as const).map((v) => {
                      const label = v === "ATTEND" ? "참석" : v === "MAYBE" ? "미정" : "불참";
                      const isSelected = myVote === v;
                      return (
                        <button
                          key={v}
                          type="button"
                          disabled={votingMatchId === m.id}
                          className={cn(
                            "flex-1 rounded-lg py-1.5 text-sm font-semibold transition-all duration-200 active:scale-[0.97] disabled:opacity-50",
                            isSelected ? VOTE_STYLES[v].active : "border border-border text-muted-foreground hover:bg-secondary"
                          )}
                          onClick={(e) => { e.preventDefault(); onVote(m.id, v); }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
});
