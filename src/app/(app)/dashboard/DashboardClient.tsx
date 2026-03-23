"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, Check, Copy, Link2, Trophy, Users, Vote } from "lucide-react";
import { useApi, apiMutate } from "@/lib/useApi";
import { isStaffOrAbove } from "@/lib/permissions";
import { useViewAsRole } from "@/lib/ViewAsRoleContext";
import type { Role } from "@/lib/types";
import { cn, formatTime, formatDateKo, formatDue } from "@/lib/utils";
import { voteStyles } from "@/lib/voteStyles";
import { toKoreanError } from "@/lib/errorMessages";
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

function CardSkeleton() {
  return (
    <div className="grid gap-4 stagger-children">
      {/* Hero match card */}
      <div className="card-featured">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-5 w-20" />
        </div>
        <div className="mt-4 space-y-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-3 w-40" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-8 w-16 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-full" />
          </div>
          <Skeleton className="mt-2 h-1.5 w-full rounded-full" />
        </div>
      </div>

      {/* 2-col grid: votes + tasks */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <Skeleton className="h-7 w-40" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-14 rounded-md" />
            <Skeleton className="h-14 rounded-md" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <Skeleton className="h-7 w-32" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-10 rounded-md" />
            <Skeleton className="h-10 rounded-md" />
            <Skeleton className="h-10 rounded-md" />
          </CardContent>
        </Card>
      </div>

      {/* Season record card */}
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-7 w-28" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-md" />
            ))}
          </div>
          <Skeleton className="h-16 rounded-md" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardClient({ userId, userRole, initialData, inviteCode }: { userId: string; userRole?: Role; initialData?: DashboardData; inviteCode?: string }) {
  const { data, loading, error, refetch } = useApi<DashboardData>("/api/dashboard", initialData ?? emptyData, { skip: !!initialData });
  const { showToast } = useToast();
  const [voting, setVoting] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const { effectiveRole } = useViewAsRole();
  const role = effectiveRole(userRole);

  async function handleQuickVote(matchId: string, memberId: string, vote: "ATTEND" | "ABSENT" | "MAYBE") {
    if (data.upcomingMatch?.myVote === vote) return;
    setVoting(true);
    const { error: err } = await apiMutate("/api/attendance", "POST", { matchId, vote, memberId });
    if (err) {
      showToast("투표에 실패했습니다. 다시 시도해주세요.", "error");
    } else {
      showToast(vote === "ATTEND" ? "참석으로 투표했습니다." : vote === "ABSENT" ? "불참으로 투표했습니다." : "미정으로 투표했습니다.");
      await refetch();
    }
    setVoting(false);
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <span className="text-destructive">오류: {toKoreanError(error)}</span>
          <Button variant="outline" size="sm" onClick={refetch}>다시 시도</Button>
        </div>
      </Card>
    );
  }

  if (loading) {
    return <CardSkeleton />;
  }

  const { upcomingMatch, activeVotes, tasks, recentResult, teamRecord } = data;

  // Attendance bar percentages
  const voteCounts = upcomingMatch?.voteCounts ?? { attend: 0, absent: 0, undecided: 0 };
  const voteTotal = voteCounts.attend + voteCounts.absent + voteCounts.undecided;
  const attendPercent = voteTotal > 0 ? (voteCounts.attend / voteTotal) * 100 : 0;
  const absentPercent = voteTotal > 0 ? (voteCounts.absent / voteTotal) * 100 : 0;

  // Team record totals
  const recordTotal = teamRecord.wins + teamRecord.draws + teamRecord.losses;

  // Onboarding wizard: show only for brand-new teams with no data
  const showWizard = !upcomingMatch && activeVotes.length === 0 && !recentResult && recordTotal === 0;

  async function handleCopyInviteCode() {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setInviteCopied(true);
      showToast("초대 코드가 복사되었습니다.");
      setTimeout(() => setInviteCopied(false), 2000);
    } catch {
      showToast("복사에 실패했습니다. 설정에서 확인해주세요.", "error");
    }
  }

  return (
    <div className="grid gap-3 stagger-children min-w-0">
      {/* ── Onboarding Wizard (new teams only) ── */}
      {showWizard && (
        <Card className="card-featured">
          <CardContent className="pt-6">
            <h2 className="text-lg font-bold text-foreground">팀이 생성되었습니다! 🎉</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              아래 3단계를 완료하면 PitchMaster를 바로 활용할 수 있어요.
            </p>

            <div className="mt-4 space-y-3">
              {/* Step 1: Invite */}
              <div className="flex items-start gap-3 rounded-xl bg-secondary/50 p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                  1
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">팀원 초대하기</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    초대 코드를 팀원에게 공유하면 바로 가입할 수 있습니다.
                  </p>
                  {inviteCode ? (
                    <Button size="sm" className="mt-2" onClick={handleCopyInviteCode}>
                      {inviteCopied ? (
                        <>
                          <Check className="mr-1 h-3.5 w-3.5" />
                          복사됨
                        </>
                      ) : (
                        <>
                          <Copy className="mr-1 h-3.5 w-3.5" />
                          초대 코드 복사
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button size="sm" className="mt-2" asChild>
                      <Link href="/settings">초대 코드 확인 &rarr;</Link>
                    </Button>
                  )}
                </div>
              </div>

              {/* Step 2: Pre-register members */}
              <div className="flex items-start gap-3 rounded-xl bg-secondary/50 p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                  2
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">팀원 미리 등록</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    가입 전 팀원 이름을 미리 등록하면 출석/회비 관리가 편해집니다.
                  </p>
                  <Button size="sm" variant="outline" className="mt-2" asChild>
                    <Link href="/members">회원 관리 &rarr;</Link>
                  </Button>
                </div>
              </div>

              {/* Step 3: Create first match */}
              <div className="flex items-start gap-3 rounded-xl bg-secondary/50 p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                  3
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">첫 경기 등록</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    경기를 등록하면 팀원에게 참석 투표를 받을 수 있습니다.
                  </p>
                  <Button size="sm" variant="outline" className="mt-2" asChild>
                    <Link href="/matches">일정 등록 &rarr;</Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
            <p className="type-overline">{formatDateKo(upcomingMatch.match_date)}</p>
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
                      aria-pressed={upcomingMatch.myVote === opt.value}
                      className={cn(
                        "rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 active:scale-105 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
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
              <div className="flex h-1.5 overflow-hidden rounded-full bg-secondary/50">
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
                  <Link href="/matches">일정 등록하기</Link>
                </Button>
              }
            />
          </div>
        )}
      </div>

      {/* ── Invite card (staff/president only) ── */}
      {isStaffOrAbove(role) && inviteCode && (
        <Card className="border-[hsl(var(--accent))]/20 bg-[hsl(var(--accent))]/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 shrink-0 text-[hsl(var(--accent))]" />
              <p className="text-sm font-semibold text-foreground">팀원을 초대하세요</p>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground truncate">초대 코드를 공유하면 바로 가입</p>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 gap-1 text-xs border-[hsl(var(--accent))]/30 text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent))]/10"
              onClick={() => {
                const inviteUrl = `${window.location.origin}/team?code=${inviteCode}`;
                navigator.clipboard.writeText(inviteUrl).then(() => {
                  setInviteCopied(true);
                  showToast("초대 링크가 복사되었습니다.");
                  setTimeout(() => setInviteCopied(false), 2000);
                });
              }}
            >
              {inviteCopied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
              {inviteCopied ? "복사됨!" : "초대 링크 복사"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Bento section: votes + tasks + season record ── */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {/* Votes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="mt-1 font-heading text-lg sm:text-2xl font-bold uppercase">참석 투표</CardTitle>
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
                description="경기 일정이 등록되면 여기서 참석 투표를 할 수 있습니다."
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
            <CardTitle className="font-heading text-lg sm:text-2xl font-bold uppercase">미완료 항목</CardTitle>
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

        {/* Recent Result + Season Record (통합) */}
        <Card className="md:col-span-2 lg:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="mt-1 font-heading text-lg sm:text-2xl font-bold uppercase">시즌 전적</CardTitle>
          </div>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" asChild>
            <Link href="/records">전체 기록 &rarr;</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recordTotal === 0 && !recentResult ? (
            <EmptyState
              icon={Trophy}
              title="아직 전적이 없습니다"
              description="경기를 진행하면 시즌 전적이 집계됩니다"
            />
          ) : (
            <>
              {/* 시즌 전적 스탯 */}
              {recordTotal > 0 && (
                <div className="mb-4">
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { label: "승", value: String(teamRecord.wins), color: "text-[hsl(var(--win))]" },
                      { label: "무", value: String(teamRecord.draws), color: "text-[hsl(var(--draw))]" },
                      { label: "패", value: String(teamRecord.losses), color: "text-[hsl(var(--loss))]" },
                      { label: "승률", value: `${Math.round((teamRecord.wins / recordTotal) * 100)}%`, color: "text-primary" },
                    ].map((stat) => (
                      <div key={stat.label} className="card-stat text-center px-1 py-2">
                        <div className={`text-base font-bold font-[family-name:var(--font-display)] whitespace-nowrap ${stat.color}`}>{stat.value}</div>
                        <div className="type-overline mt-0.5">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>득점 {teamRecord.goalsFor} · 실점 {teamRecord.goalsAgainst} · 득실차 {teamRecord.goalsFor - teamRecord.goalsAgainst >= 0 ? "+" : ""}{teamRecord.goalsFor - teamRecord.goalsAgainst}</span>
                    {teamRecord.recent5.length > 0 && (
                      <div className="flex items-center gap-1">
                        {teamRecord.recent5.map((r, i) => (
                          <span
                            key={i}
                            className={cn(
                              "flex h-6 w-6 items-center justify-center rounded text-xs font-bold",
                              r === "W" && "bg-[hsl(var(--win)/0.15)] text-[hsl(var(--win))]",
                              r === "D" && "bg-secondary text-muted-foreground",
                              r === "L" && "bg-[hsl(var(--loss)/0.15)] text-[hsl(var(--loss))]"
                            )}
                          >
                            {r === "W" ? "승" : r === "D" ? "무" : "패"}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 최근 경기 결과 */}
              {recentResult && (
                <Card className="mt-3 border-0 border-l-2 border-l-primary/40 bg-secondary hover:bg-secondary/70 cursor-pointer transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-baseline justify-between">
                      <p className="text-xs text-muted-foreground">{formatDateKo(recentResult.date)}</p>
                      {(() => {
                        const parts = recentResult.score?.split(":").map((s: string) => parseInt(s.trim(), 10));
                        const scoreColor = parts && parts.length === 2
                          ? parts[0] > parts[1] ? "text-[hsl(var(--win))]" : parts[0] < parts[1] ? "text-[hsl(var(--loss))]" : "text-muted-foreground"
                          : "text-primary";
                        return <p className={cn("type-stat", scoreColor)}>{recentResult.score}</p>;
                      })()}
                    </div>
                    <p className="mt-1 truncate text-sm text-foreground/70">
                      vs <span className="font-semibold text-foreground">{recentResult.opponent ?? "미정"}</span>
                      {recentResult.mvp && <> · MVP <span className="font-semibold text-foreground">{recentResult.mvp}</span></>}
                    </p>
                    <div className="mt-3">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/matches/${recentResult.id}`}>상세 기록 보기</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </CardContent>
      </Card>
      </div>

      {/* Quick Navigation — PC only */}
      <div className="hidden lg:grid grid-cols-4 gap-2">
        {[
          { label: "경기 일정", href: "/matches", color: "text-primary", bg: "hover:bg-primary/5" },
          { label: "내 기록", href: "/records", color: "text-[hsl(var(--accent))]", bg: "hover:bg-[hsl(var(--accent)/0.05)]" },
          { label: "회비 관리", href: "/dues", color: "text-[hsl(var(--info))]", bg: "hover:bg-[hsl(var(--info)/0.05)]" },
          { label: "회원 관리", href: "/members", color: "text-[hsl(var(--success))]", bg: "hover:bg-[hsl(var(--success)/0.05)]" },
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
    </div>
  );
}
