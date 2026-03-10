"use client";

import Link from "next/link";
import { useApi } from "@/lib/useApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type UpcomingMatch = {
  id: string;
  match_date: string;
  match_time: string | null;
  opponent_name: string | null;
  location: string | null;
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

type DashboardData = {
  upcomingMatch: UpcomingMatch | null;
  recentResult: RecentResult | null;
  activeVotes: ActiveVote[];
  tasks: string[];
};

const emptyData: DashboardData = {
  upcomingMatch: null,
  recentResult: null,
  activeVotes: [],
  tasks: [],
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

export default function DashboardClient({ userId }: { userId: string }) {
  const { data, loading } = useApi<DashboardData>("/api/dashboard", emptyData);

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

  const { upcomingMatch, activeVotes, tasks, recentResult } = data;

  return (
    <div className="grid gap-4 stagger-children">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Next Match - Sky blue accent */}
        <Card>
          <CardHeader className="pb-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-sky-400">Next Match</p>
            <CardTitle className="font-heading text-2xl font-bold uppercase">다가오는 경기</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingMatch ? (
              <Card className="border-0 border-l-2 border-l-sky-500/40 bg-secondary hover:bg-secondary/70">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{formatDate(upcomingMatch.match_date)}</p>
                  <p className="mt-1 text-lg font-bold">
                    {upcomingMatch.match_time ?? "시간 미정"} · {upcomingMatch.location ?? "장소 미정"}
                  </p>
                  <p className="mt-1 text-sm text-foreground/70">
                    상대팀:{" "}
                    <span className="font-semibold text-foreground">
                      {upcomingMatch.opponent_name ?? "미정"}
                    </span>
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" asChild>
                      <Link href="/matches">일정 상세보기</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/matches">참석 투표하기</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-0 bg-secondary">
                <CardContent className="p-4 text-sm text-muted-foreground">
                  예정된 경기가 없습니다.
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Votes - Violet accent */}
        <Card>
          <CardHeader className="pb-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-violet-400">Votes</p>
            <CardTitle className="font-heading text-2xl font-bold uppercase">진행 중인 투표</CardTitle>
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
                      <Link href="/matches">참여 &rarr;</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="border-0 bg-secondary">
                <CardContent className="p-3 text-sm text-muted-foreground">
                  진행 중인 투표가 없습니다.
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
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
              <Card className="border-0 bg-secondary">
                <CardContent className="flex items-center gap-3 p-3 text-sm text-muted-foreground">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                  모든 할 일을 완료했습니다!
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Result - Green accent (primary) */}
        <Card>
          <CardHeader className="pb-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-emerald-400">Result</p>
            <CardTitle className="font-heading text-2xl font-bold uppercase">최근 경기 요약</CardTitle>
          </CardHeader>
          <CardContent>
            {recentResult ? (
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
            ) : (
              <Card className="border-0 bg-secondary">
                <CardContent className="p-4 text-sm text-muted-foreground">
                  최근 경기 결과가 없습니다.
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
