"use client";

import Link from "next/link";
import { useApi } from "@/lib/useApi";
import { formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type UpcomingMatch = {
  id: string;
  match_date: string;
  match_time: string | null;
  opponent_name: string | null;
  location: string | null;
  voteCounts: { attend: number; absent: number; undecided: number };
};

type RecentResult = {
  id: string;
  date: string;
  score: string;
  opponent: string | null;
  mvp: string | null;
};

type ActiveVote = {
  id: string;
  title: string;
  due: string;
};

type TeamRecord = {
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  recent5: ("W" | "D" | "L")[];
};

type DashboardData = {
  upcomingMatch: UpcomingMatch | null;
  recentResult: RecentResult | null;
  activeVotes: ActiveVote[];
  tasks: string[];
  teamRecord: TeamRecord;
};

const emptyData: DashboardData = {
  upcomingMatch: null,
  recentResult: null,
  activeVotes: [],
  tasks: [],
  teamRecord: { wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, recent5: [] },
};

function CardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-1 h-7 w-40" />
      </CardHeader>
      <CardContent>
        <Card className="border-0 bg-secondary">
          <CardContent className="space-y-3 p-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-36" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-8 w-24 rounded-md" />
              <Skeleton className="h-8 w-24 rounded-md" />
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatDue(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function DashboardClient({ userId, initialData }: { userId: string; initialData?: DashboardData }) {
  const { data, loading, error } = useApi<DashboardData>("/api/dashboard", initialData ?? emptyData, { skip: !!initialData });

  if (error) {
    return <Card className="p-6"><span className="text-destructive">오류: {error}</span></Card>;
  }

  if (loading) {
    return (
      <div className="grid gap-4 stagger-children">
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  const { upcomingMatch, activeVotes, tasks, recentResult, teamRecord } = data;

  return (
    <div className="grid gap-4 stagger-children">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Next Match - Sky blue accent */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-sky-400">Next Match</p>
              <CardTitle className="mt-1 font-heading text-2xl font-bold uppercase">다가오는 경기</CardTitle>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" asChild>
              <Link href="/matches">전체 일정 &rarr;</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {upcomingMatch ? (
              <Card className="border-0 border-l-2 border-l-sky-500/40 bg-secondary hover:bg-secondary/70">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{formatDate(upcomingMatch.match_date)}</p>
                  <p className="mt-1 text-lg font-bold">
                    {upcomingMatch.match_time ? formatTime(upcomingMatch.match_time) : "시간 미정"} · {upcomingMatch.location ?? "장소 미정"}
                  </p>
                  <p className="mt-1 text-sm text-foreground/70">
                    상대팀:{" "}
                    <span className="font-semibold text-foreground">
                      {upcomingMatch.opponent_name ?? "미정"}
                    </span>
                  </p>
                  {upcomingMatch.voteCounts && (
                    <div className="mt-3 flex items-center gap-3 text-xs">
                      <span className="font-semibold text-emerald-400">참석 {upcomingMatch.voteCounts.attend}</span>
                      <span className="font-semibold text-rose-400">불참 {upcomingMatch.voteCounts.absent}</span>
                      <span className="font-semibold text-muted-foreground">미정 {upcomingMatch.voteCounts.undecided}</span>
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" asChild>
                      <Link href={`/matches/${upcomingMatch.id}`}>상세 보기</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 py-10 text-center">
                <span className="text-3xl">&#9917;</span>
                <p className="mt-3 text-sm font-semibold text-foreground/70">예정된 경기가 없어요</p>
                <p className="mt-1 text-xs text-muted-foreground">새 경기를 등록해보세요.</p>
                <Button size="sm" className="mt-4" asChild>
                  <Link href="/matches">경기 등록하기</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Votes - Violet accent */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-violet-400">Votes</p>
              <CardTitle className="mt-1 font-heading text-2xl font-bold uppercase">진행 중인 투표</CardTitle>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" asChild>
              <Link href="/matches">투표하기 &rarr;</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeVotes.length > 0 ? (
              activeVotes.map((vote) => (
                <Card
                  key={vote.id}
                  className="cursor-pointer border-0 border-l-2 border-l-violet-500/40 bg-secondary hover:bg-secondary/70"
                >
                  <CardContent className="flex items-center justify-between p-3">
                    <div>
                      <p className="text-sm font-semibold">{vote.title}</p>
                      <p className="text-xs text-muted-foreground">마감: {formatDue(vote.due)}</p>
                    </div>
                    <Button variant="link" size="sm" className="text-violet-400" asChild>
                      <Link href={`/matches/${vote.id}`}>참여 &rarr;</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 py-8 text-center">
                <span className="text-2xl">&#9989;</span>
                <p className="mt-2 text-sm text-muted-foreground">진행 중인 투표가 없습니다.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "경기 일정", href: "/matches", color: "text-sky-400", bg: "hover:bg-sky-500/5" },
          { label: "내 기록", href: "/records", color: "text-violet-400", bg: "hover:bg-violet-500/5" },
          { label: "회비 관리", href: "/dues", color: "text-blue-400", bg: "hover:bg-blue-500/5" },
          { label: "팀원 관리", href: "/members", color: "text-emerald-400", bg: "hover:bg-emerald-500/5" },
        ].map((nav) => (
          <Link
            key={nav.href}
            href={nav.href}
            className={`flex items-center justify-center gap-2 rounded-xl border border-border/30 bg-card py-3 text-sm font-semibold transition-colors ${nav.bg}`}
          >
            <span className={nav.color}>{nav.label}</span>
            <span className="text-muted-foreground">&rarr;</span>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        {/* Tasks - Amber accent */}
        <Card>
          <CardHeader className="pb-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-amber-400">Tasks</p>
            <CardTitle className="font-heading text-2xl font-bold uppercase">해야 할 일</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tasks.length > 0 ? (
              tasks.map((task) => (
                <Card key={task} className="border-0 bg-secondary hover:bg-secondary/70">
                  <CardContent className="flex items-center gap-3 p-3 text-sm text-foreground/80">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                    {task}
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="flex items-center gap-3 rounded-lg bg-emerald-500/5 px-4 py-3">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                <p className="text-sm text-emerald-400/80">모든 할 일을 완료했습니다!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Result - Green accent (primary) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-emerald-400">Result</p>
              <CardTitle className="mt-1 font-heading text-2xl font-bold uppercase">최근 경기 요약</CardTitle>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" asChild>
              <Link href="/records">전체 기록 &rarr;</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentResult ? (
              <div className="space-y-3">
                <Card className="border-0 border-l-2 border-l-emerald-500/40 bg-secondary hover:bg-secondary/70">
                  <CardContent className="p-4">
                    <div className="flex items-baseline justify-between">
                      <p className="text-xs text-muted-foreground">{formatDate(recentResult.date)}</p>
                      <p className="font-heading text-3xl font-bold text-emerald-400">
                        {recentResult.score}
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-foreground/70">
                      상대팀:{" "}
                      <span className="font-semibold text-foreground">
                        {recentResult.opponent ?? "미정"}
                      </span>
                    </p>
                    {recentResult.mvp && (
                      <p className="mt-2 text-sm text-foreground/70">
                        MVP: <span className="font-semibold text-foreground">{recentResult.mvp}</span>
                      </p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/matches/${recentResult.id}`}>상세 기록 보기</Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/records">팀 랭킹 보기</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* 시즌 전적 요약 */}
                {(teamRecord.wins + teamRecord.draws + teamRecord.losses) > 0 && (
                  <Card className="border-0 bg-secondary">
                    <CardContent className="p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">시즌 전적</p>
                      <div className="mt-2 flex items-center gap-3">
                        <span className="font-heading text-lg font-bold text-emerald-400">{teamRecord.wins}승</span>
                        <span className="font-heading text-lg font-bold text-muted-foreground">{teamRecord.draws}무</span>
                        <span className="font-heading text-lg font-bold text-red-400">{teamRecord.losses}패</span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          승률 {Math.round((teamRecord.wins / (teamRecord.wins + teamRecord.draws + teamRecord.losses)) * 100)}%
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>득점 {teamRecord.goalsFor} · 실점 {teamRecord.goalsAgainst} · 득실차 {teamRecord.goalsFor - teamRecord.goalsAgainst >= 0 ? "+" : ""}{teamRecord.goalsFor - teamRecord.goalsAgainst}</span>
                      </div>
                      {teamRecord.recent5.length > 0 && (
                        <div className="mt-3 flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground">최근:</span>
                          {teamRecord.recent5.map((r, i) => (
                            <span
                              key={i}
                              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                                r === "W" ? "bg-emerald-500/20 text-emerald-400"
                                : r === "D" ? "bg-muted text-muted-foreground"
                                : "bg-red-500/20 text-red-400"
                              }`}
                            >
                              {r === "W" ? "승" : r === "D" ? "무" : "패"}
                            </span>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 py-10 text-center">
                <span className="text-3xl">&#127942;</span>
                <p className="mt-3 text-sm font-semibold text-foreground/70">아직 완료된 경기가 없어요</p>
                <p className="mt-1 text-xs text-muted-foreground">경기를 진행하면 결과가 여기에 표시됩니다.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
