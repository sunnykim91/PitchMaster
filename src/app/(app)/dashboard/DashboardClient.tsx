"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Calendar, Trophy, Vote } from "lucide-react";
import { useApi, apiMutate } from "@/lib/useApi";
import { cn, formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/lib/ToastContext";
import { EmptyState } from "@/components/EmptyState";

type UpcomingMatch = {
  id: string;
  match_date: string;
  match_time: string | null;
  opponent_name: string | null;
  location: string | null;
  voteCounts: { attend: number; absent: number; undecided: number };
  myVote: "ATTEND" | "ABSENT" | "MAYBE" | null;
  myMemberId: string | null;
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

const voteStyles = {
  ATTEND: {
    active: "bg-[hsl(var(--success))] text-white shadow-[0_2px_8px_-2px_hsl(var(--success)/0.4)]",
    inactive: "bg-[hsl(var(--success)/0.08)] text-[hsl(var(--success))] border border-[hsl(var(--success)/0.2)] hover:bg-[hsl(var(--success)/0.15)]",
  },
  MAYBE: {
    active: "bg-[hsl(var(--warning))] text-[hsl(240_6%_6%)] shadow-[0_2px_8px_-2px_hsl(var(--warning)/0.4)]",
    inactive: "bg-white/[0.04] text-muted-foreground border border-white/[0.06] hover:bg-white/[0.08]",
  },
  ABSENT: {
    active: "bg-[hsl(var(--loss))] text-white shadow-[0_2px_8px_-2px_hsl(var(--loss)/0.4)]",
    inactive: "bg-white/[0.04] text-muted-foreground border border-white/[0.06] hover:bg-white/[0.08]",
  },
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
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-3 w-40" />
            <div className="flex items-center gap-3 pt-1">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-12" />
            </div>
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-9 w-24 rounded-md" />
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
  const { data, loading, error, refetch } = useApi<DashboardData>("/api/dashboard", initialData ?? emptyData, { skip: !!initialData });
  const { showToast } = useToast();
  const [voting, setVoting] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("pm_guide_dismissed");
    if (!dismissed) setShowGuide(true);
  }, []);

  function dismissGuide() {
    localStorage.setItem("pm_guide_dismissed", "1");
    setShowGuide(false);
  }

  async function handleQuickVote(matchId: string, memberId: string, vote: "ATTEND" | "ABSENT" | "MAYBE") {
    setVoting(true);
    try {
      await apiMutate("/api/attendance", "POST", { matchId, vote, memberId });
      showToast(vote === "ATTEND" ? "참석으로 투표했습니다." : vote === "ABSENT" ? "불참으로 투표했습니다." : "미정으로 투표했습니다.");
      await refetch();
    } catch {
      showToast("투표에 실패했습니다.", "error");
    } finally {
      setVoting(false);
    }
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <span className="text-destructive">오류: {error}</span>
          <Button variant="outline" size="sm" onClick={refetch}>다시 시도</Button>
        </div>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="grid gap-4 stagger-children">
        <CardSkeleton />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-md" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  const { upcomingMatch, activeVotes, tasks, recentResult, teamRecord } = data;

  // Attendance bar percentages
  const voteCounts = upcomingMatch?.voteCounts ?? { attend: 0, absent: 0, undecided: 0 };
  const voteTotal = voteCounts.attend + voteCounts.absent + voteCounts.undecided;
  const attendPercent = voteTotal > 0 ? (voteCounts.attend / voteTotal) * 100 : 0;
  const absentPercent = voteTotal > 0 ? (voteCounts.absent / voteTotal) * 100 : 0;

  // Team record totals
  const recordTotal = teamRecord.wins + teamRecord.draws + teamRecord.losses;

  return (
    <>
    {showGuide && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
        <div className="mx-4 w-full max-w-md space-y-4 rounded-2xl bg-card p-6 shadow-2xl animate-scale-in">
          <h2 className="text-lg font-bold text-foreground">PitchMaster 시작 가이드</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">1</span>
              <div>
                <p className="text-sm font-semibold">일정 등록</p>
                <p className="text-xs text-muted-foreground">경기 날짜와 장소를 등록하면 팀원에게 참석 투표 링크가 공유됩니다.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">2</span>
              <div>
                <p className="text-sm font-semibold">회비 관리</p>
                <p className="text-xs text-muted-foreground">통장 캡쳐를 올리면 이름과 금액이 자동으로 인식됩니다.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">3</span>
              <div>
                <p className="text-sm font-semibold">팀원 초대</p>
                <p className="text-xs text-muted-foreground">사이드바의 초대 코드를 팀원에게 공유하면 바로 가입할 수 있습니다.</p>
              </div>
            </div>
          </div>
          <Button className="w-full" onClick={dismissGuide}>
            시작하기
          </Button>
        </div>
      </div>
    )}
    <div className="grid gap-4 stagger-children">
      {/* ── Hero: Next Match (full width) ── */}
      <div className="card-featured">
        <div className="flex items-center justify-between">
          <CardTitle className="font-heading text-lg sm:text-2xl font-bold uppercase">다가오는 경기</CardTitle>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" asChild>
            <Link href="/matches">전체 일정 &rarr;</Link>
          </Button>
        </div>
        {upcomingMatch ? (
          <div className="mt-4">
            <p className="type-overline">{formatDate(upcomingMatch.match_date)}</p>
            <p className="mt-2 type-score text-foreground">
              {upcomingMatch.match_time ? formatTime(upcomingMatch.match_time) : "시간 미정"}
            </p>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {upcomingMatch.location ?? "장소 미정"}
            </p>
            <p className="mt-2 truncate text-sm text-foreground/70">
              상대팀:{" "}
              <span className="font-semibold text-foreground">
                {upcomingMatch.opponent_name ?? "미정"}
              </span>
            </p>

            {/* Vote buttons */}
            {upcomingMatch.myMemberId && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground mr-1">내 투표:</span>
                {([
                  { value: "ATTEND" as const, label: "참석" },
                  { value: "MAYBE" as const, label: "미정" },
                  { value: "ABSENT" as const, label: "불참" },
                ]).map((opt) => {
                  const isSelected = upcomingMatch.myVote === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={voting}
                      className={cn(
                        "rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 active:scale-105 disabled:opacity-50",
                        isSelected ? voteStyles[opt.value].active : voteStyles[opt.value].inactive
                      )}
                      onClick={() => handleQuickVote(upcomingMatch.id, upcomingMatch.myMemberId!, opt.value)}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Attendance visual bar */}
            <div className="mt-4">
              <div className="flex h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
                <div className="rounded-full bg-[hsl(var(--success))] transition-all duration-500" style={{ width: `${attendPercent}%` }} />
                <div className="bg-[hsl(var(--loss))] transition-all duration-500" style={{ width: `${absentPercent}%` }} />
              </div>
              <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                <span>참석 <strong className="text-[hsl(var(--success))]">{voteCounts.attend}</strong></span>
                <span>불참 <strong className="text-[hsl(var(--loss))]">{voteCounts.absent}</strong></span>
                <span>미정 <strong>{voteCounts.undecided}</strong></span>
              </div>
            </div>

            <div className="mt-4">
              <Button size="sm" asChild>
                <Link href={`/matches/${upcomingMatch.id}`}>상세 보기</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState
              icon={Calendar}
              title="예정된 경기가 없습니다"
              description="새 경기를 등록해보세요."
              action={
                <Button size="sm" asChild>
                  <Link href="/matches">경기 등록하기</Link>
                </Button>
              }
            />
          </div>
        )}
      </div>

      {/* ── Team Record Stats Row (4-column) ── */}
      {recordTotal > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "승", value: teamRecord.wins, color: "text-[hsl(var(--win))]" },
            { label: "무", value: teamRecord.draws, color: "text-[hsl(var(--draw))]" },
            { label: "패", value: teamRecord.losses, color: "text-[hsl(var(--loss))]" },
            { label: "승률", value: `${recordTotal > 0 ? Math.round((teamRecord.wins / recordTotal) * 100) : 0}%`, color: "text-primary" },
          ].map((stat) => (
            <div key={stat.label} className="card-stat text-center">
              <div className={`type-stat ${stat.color}`}>{stat.value}</div>
              <div className="type-overline mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Navigation */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "경기 일정", href: "/matches", color: "text-primary", bg: "hover:bg-primary/5" },
          { label: "내 기록", href: "/records", color: "text-[hsl(var(--accent))]", bg: "hover:bg-[hsl(var(--accent)/0.05)]" },
          { label: "회비 관리", href: "/dues", color: "text-[hsl(var(--info))]", bg: "hover:bg-[hsl(var(--info)/0.05)]" },
          { label: "팀원 관리", href: "/members", color: "text-[hsl(var(--success))]", bg: "hover:bg-[hsl(var(--success)/0.05)]" },
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

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Votes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="mt-1 font-heading text-lg sm:text-2xl font-bold uppercase">진행 중인 투표</CardTitle>
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
                  className="cursor-pointer border-0 border-l-2 border-l-primary/40 bg-secondary hover:bg-secondary/70 transition-colors"
                >
                  <CardContent className="flex items-center justify-between p-3">
                    <div>
                      <p className="truncate text-sm font-semibold">{vote.title}</p>
                      <p className="truncate text-xs text-muted-foreground">마감: {formatDue(vote.due)}</p>
                    </div>
                    <Button variant="link" size="sm" className="text-primary" asChild>
                      <Link href={`/matches/${vote.id}`}>참여 &rarr;</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : (
              <EmptyState
                icon={Vote}
                title="진행 중인 투표가 없습니다"
                description="경기 일정을 등록하면 투표가 생성됩니다."
                action={
                  <Button size="sm" asChild>
                    <Link href="/matches">일정 등록하기</Link>
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-lg sm:text-2xl font-bold uppercase">해야 할 일</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tasks.length > 0 ? (
              tasks.map((task) => (
                <Card key={task} className="border-0 bg-secondary hover:bg-secondary/70">
                  <CardContent className="flex items-center gap-3 p-3 text-sm text-foreground/80">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--accent))]" />
                    {task}
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="flex items-center gap-3 rounded-lg bg-[hsl(var(--success)/0.05)] px-4 py-3">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--success))]" />
                <p className="text-sm text-[hsl(var(--success)/0.8)]">모든 할 일을 완료했습니다!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Result + Season Record */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="mt-1 font-heading text-lg sm:text-2xl font-bold uppercase">최근 경기 요약</CardTitle>
          </div>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" asChild>
            <Link href="/records">전체 기록 &rarr;</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentResult ? (
            <div className="space-y-3">
              <Card className="border-0 border-l-2 border-l-primary/40 bg-secondary hover:bg-secondary/70 cursor-pointer transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-baseline justify-between">
                    <p className="text-xs text-muted-foreground">{formatDate(recentResult.date)}</p>
                    <p className="type-score text-primary">
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

              {/* Season record with goals and recent 5 */}
              {recordTotal > 0 && (
                <Card className="border-0 bg-secondary">
                  <CardContent className="p-4">
                    <p className="type-overline">시즌 전적</p>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>득점 {teamRecord.goalsFor} · 실점 {teamRecord.goalsAgainst} · 득실차 {teamRecord.goalsFor - teamRecord.goalsAgainst >= 0 ? "+" : ""}{teamRecord.goalsFor - teamRecord.goalsAgainst}</span>
                    </div>
                    {teamRecord.recent5.length > 0 && (
                      <div className="mt-3 flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground">최근:</span>
                        <div className="flex items-center gap-1">
                          {teamRecord.recent5.map((r, i) => (
                            <span
                              key={i}
                              className={cn(
                                "flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-bold",
                                r === "W" && "bg-[hsl(var(--win)/0.15)] text-[hsl(var(--win))]",
                                r === "D" && "bg-white/[0.06] text-muted-foreground",
                                r === "L" && "bg-[hsl(var(--loss)/0.15)] text-[hsl(var(--loss))]"
                              )}
                            >
                              {r === "W" ? "승" : r === "D" ? "무" : "패"}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <EmptyState
              icon={Trophy}
              title="아직 완료된 경기가 없습니다"
              description="경기를 진행하면 결과가 여기에 표시됩니다."
            />
          )}
        </CardContent>
      </Card>
    </div>
    </>
  );
}
