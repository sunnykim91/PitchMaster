"use client";

import Link from "next/link";
import { History } from "lucide-react";
import { useApi } from "@/lib/useApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type OpponentStats = {
  opponentName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  recentScores: Array<{
    matchId: string;
    date: string;
    us: number;
    opp: number;
    result: "W" | "D" | "L";
  }>;
};

const EMPTY: OpponentStats = {
  opponentName: "",
  played: 0,
  won: 0,
  drawn: 0,
  lost: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  recentScores: [],
};

/**
 * 경기 상세 정보 탭에 노출되는 "이 상대팀과의 전적" 카드.
 * 같은 opponent_name 을 가진 과거 완료 경기 기준 집계.
 */
export function OpponentHistoryCard({
  opponentName,
  currentMatchId,
}: {
  opponentName: string;
  currentMatchId: string;
}) {
  const { data, loading } = useApi<OpponentStats>(
    `/api/team-stats/opponent?name=${encodeURIComponent(opponentName)}`,
    EMPTY,
  );

  if (loading) {
    return (
      <Card className="rounded-xl border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <History className="h-4 w-4 text-[hsl(var(--info))]" />
            상대팀 전적
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  // 현재 경기 제외한 과거 전적만 카운트 (완료 경기여도 self-match 일 수 있음)
  const pastScores = data.recentScores.filter((s) => s.matchId !== currentMatchId);
  // played/won/drawn/lost/goals 는 이미 합산된 값이므로 차감 보정 필요
  const currentMatchInList = data.recentScores.find((s) => s.matchId === currentMatchId);
  const adjusted = currentMatchInList
    ? {
        played: data.played - 1,
        won: data.won - (currentMatchInList.result === "W" ? 1 : 0),
        drawn: data.drawn - (currentMatchInList.result === "D" ? 1 : 0),
        lost: data.lost - (currentMatchInList.result === "L" ? 1 : 0),
        goalsFor: data.goalsFor - currentMatchInList.us,
        goalsAgainst: data.goalsAgainst - currentMatchInList.opp,
      }
    : {
        played: data.played,
        won: data.won,
        drawn: data.drawn,
        lost: data.lost,
        goalsFor: data.goalsFor,
        goalsAgainst: data.goalsAgainst,
      };

  if (adjusted.played === 0) {
    return (
      <Card className="rounded-xl border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <History className="h-4 w-4 text-[hsl(var(--info))]" />
            상대팀 전적
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-4">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{opponentName}</strong>과(와) 첫 대결이에요
          </p>
        </CardContent>
      </Card>
    );
  }

  const winRate = Math.round((adjusted.won / adjusted.played) * 100);
  const goalDiff = adjusted.goalsFor - adjusted.goalsAgainst;

  return (
    <Card className="rounded-xl border-border/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-bold">
          <History className="h-4 w-4 text-[hsl(var(--info))]" />
          {opponentName} 상대 전적
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 종합 성적 */}
        <div className="grid grid-cols-4 gap-2">
          <StatBox label="경기" value={adjusted.played} />
          <StatBox label="승" value={adjusted.won} tone="win" />
          <StatBox label="무" value={adjusted.drawn} />
          <StatBox label="패" value={adjusted.lost} tone="loss" />
        </div>

        <div className="flex items-center justify-between rounded-lg bg-secondary/30 px-3 py-2 text-xs">
          <span className="text-muted-foreground">
            득 <strong className="text-foreground">{adjusted.goalsFor}</strong> · 실{" "}
            <strong className="text-foreground">{adjusted.goalsAgainst}</strong> · 득실차{" "}
            <strong className={cn(goalDiff >= 0 ? "text-[hsl(var(--win))]" : "text-[hsl(var(--loss))]")}>
              {goalDiff >= 0 ? "+" : ""}{goalDiff}
            </strong>
          </span>
          <span className="text-muted-foreground">
            승률 <strong className="text-primary">{winRate}%</strong>
          </span>
        </div>

        {/* 최근 5경기 (현재 경기 제외) */}
        {pastScores.length > 0 && (
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              최근 5경기
            </p>
            <div className="space-y-1.5">
              {pastScores.slice(0, 5).map((s) => (
                <Link
                  key={s.matchId}
                  href={`/matches/${s.matchId}`}
                  className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2 text-sm transition-colors hover:bg-secondary/40"
                >
                  <span className="text-xs text-muted-foreground">{s.date.slice(5).replace("-", "/")}</span>
                  <span className="font-bold tabular-nums">
                    {s.us} : {s.opp}
                  </span>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-bold",
                      s.result === "W" && "bg-[hsl(var(--win))]/15 text-[hsl(var(--win))]",
                      s.result === "D" && "bg-secondary text-muted-foreground",
                      s.result === "L" && "bg-[hsl(var(--loss))]/15 text-[hsl(var(--loss))]",
                    )}
                  >
                    {s.result === "W" ? "승" : s.result === "D" ? "무" : "패"}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatBox({ label, value, tone }: { label: string; value: number; tone?: "win" | "loss" }) {
  const toneClass = tone === "win"
    ? "text-[hsl(var(--win))]"
    : tone === "loss"
      ? "text-[hsl(var(--loss))]"
      : "text-foreground";
  return (
    <div className="rounded-lg bg-secondary/40 p-3 text-center">
      <div className={cn("font-bold text-lg", toneClass)}>{value}</div>
      <div className="text-[10px] font-medium text-muted-foreground">{label}</div>
    </div>
  );
}
