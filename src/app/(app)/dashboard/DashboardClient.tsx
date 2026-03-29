"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Cake, Calendar, Check, Copy, DollarSign, Link2, Trophy, Users, Vote } from "lucide-react";
import { GA } from "@/lib/analytics";
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
import { shareTeamInvite } from "@/lib/kakaoShare";

type UpcomingMatch = {
  id: string;
  match_date: string;
  match_time: string | null;
  opponent_name: string | null;
  location: string | null;
  voteCounts: { attend: number; absent: number; undecided: number };
  myVote: "ATTEND" | "ABSENT" | "MAYBE" | null;
  myMemberId: string | null;
  uniform_type?: string | null;
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

type TeamUniform = {
  uniformPrimary: string | null;
  uniformSecondary: string | null;
  uniformPattern: string | null;
};

type BirthdayMember = {
  name: string;
  birthDate: string;
  profileImageUrl: string | null;
};

type DashboardData = {
  upcomingMatch: UpcomingMatch | null;
  recentResult: RecentResult | null;
  activeVotes: ActiveVote[];
  tasks: string[];
  teamRecord: TeamRecord;
  teamUniform?: TeamUniform | null;
  birthdayMembers?: BirthdayMember[];
  hasDuesSettings?: boolean;
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

export default function DashboardClient({ userId, userRole, initialData, inviteCode, teamName }: { userId: string; userRole?: Role; initialData?: DashboardData; inviteCode?: string; teamName?: string }) {
  const { data, loading, error, refetch } = useApi<DashboardData>("/api/dashboard", initialData ?? emptyData, { skip: !!initialData });
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  // Optimistic UI: null = 서버 데이터 사용, 값 있으면 즉시 반영된 낙관적 상태
  const [optimisticVote, setOptimisticVote] = useState<"ATTEND" | "ABSENT" | "MAYBE" | null | undefined>(undefined);
  const [optimisticCounts, setOptimisticCounts] = useState<{ attend: number; absent: number; undecided: number } | null>(null);
  // 연속 클릭 방지용 (300ms)
  const [pendingVote, setPendingVote] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const { effectiveRole } = useViewAsRole();
  const role = effectiveRole(userRole);

  // 팀 생성 후 환영 토스트
  useEffect(() => {
    if (searchParams.get("welcome") === "created") {
      const team = searchParams.get("team") ?? "";
      showToast(`${team} 팀이 생성되었습니다! 초대 코드를 팀원에게 공유해보세요.`, "success");
      window.history.replaceState(null, "", "/dashboard");
    }
  }, [searchParams]);

  async function handleQuickVote(matchId: string, _memberId: string, vote: "ATTEND" | "ABSENT" | "MAYBE") {
    // 현재 표시 중인 투표(낙관적 or 서버) 기준으로 중복 클릭 방지
    const currentVote = optimisticVote !== undefined ? optimisticVote : data.upcomingMatch?.myVote;
    if (currentVote === vote) return;
    if (pendingVote) return;

    // 이전 상태 저장 (롤백용) — optimisticVote 타입과 동일하게 유지
    const prevVote: "ATTEND" | "ABSENT" | "MAYBE" | null | undefined =
      optimisticVote !== undefined ? optimisticVote : (data.upcomingMatch?.myVote ?? null);
    const prevCounts = optimisticCounts ?? data.upcomingMatch?.voteCounts ?? { attend: 0, absent: 0, undecided: 0 };

    // 즉시 UI 반영 (낙관적 업데이트)
    const newCounts = { ...prevCounts };
    if (prevVote === "ATTEND") newCounts.attend = Math.max(0, newCounts.attend - 1);
    else if (prevVote === "ABSENT") newCounts.absent = Math.max(0, newCounts.absent - 1);
    else if (prevVote === "MAYBE") newCounts.undecided = Math.max(0, newCounts.undecided - 1);
    if (vote === "ATTEND") newCounts.attend += 1;
    else if (vote === "ABSENT") newCounts.absent += 1;
    else if (vote === "MAYBE") newCounts.undecided += 1;

    setOptimisticVote(vote);
    setOptimisticCounts(newCounts);

    // 연속 클릭 방지 (300ms)
    setPendingVote(true);
    setTimeout(() => setPendingVote(false), 300);

    // 백그라운드 API 호출
    const { error: err } = await apiMutate("/api/attendance", "POST", { matchId, vote });
    if (err) {
      // 실패 시 롤백
      setOptimisticVote(prevVote);
      setOptimisticCounts(prevCounts);
      showToast("투표에 실패했습니다. 다시 시도해주세요.", "error");
    } else {
      GA.voteComplete(vote, "dashboard");
      showToast(vote === "ATTEND" ? "참석으로 투표했습니다." : vote === "ABSENT" ? "불참으로 투표했습니다." : "미정으로 투표했습니다.");
      // 성공 시 백그라운드 refetch 후 낙관적 상태 초기화
      await refetch();
      setOptimisticVote(undefined);
      setOptimisticCounts(null);
    }
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

  const { upcomingMatch, activeVotes, tasks, recentResult, teamRecord, birthdayMembers } = data;

  // 낙관적 상태가 있으면 우선 사용
  const displayVote = optimisticVote !== undefined ? optimisticVote : upcomingMatch?.myVote;
  // Attendance bar percentages
  const voteCounts = optimisticCounts ?? upcomingMatch?.voteCounts ?? { attend: 0, absent: 0, undecided: 0 };
  const voteTotal = voteCounts.attend + voteCounts.absent + voteCounts.undecided;
  const attendPercent = voteTotal > 0 ? (voteCounts.attend / voteTotal) * 100 : 0;
  const absentPercent = voteTotal > 0 ? (voteCounts.absent / voteTotal) * 100 : 0;

  // 출석 바 스타일 메모이제이션 (인라인 객체 재생성 방지)
  const attendBarStyle = useMemo(() => ({ width: `${attendPercent}%` }), [attendPercent]);
  const absentBarStyle = useMemo(() => ({ width: `${absentPercent}%` }), [absentPercent]);

  // Team record totals
  const recordTotal = teamRecord.wins + teamRecord.draws + teamRecord.losses;

  // Onboarding wizard: show only for brand-new teams with no data
  const showWizard = !upcomingMatch && activeVotes.length === 0 && !recentResult && recordTotal === 0;

  async function handleCopyInviteCode() {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setInviteCopied(true);
      GA.inviteSent("copy_code");
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
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    초대 코드를 팀원에게 공유하면 바로 가입할 수 있습니다.
                  </p>
                  {inviteCode ? (
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="secondary" onClick={handleCopyInviteCode}>
                        {inviteCopied ? <><Check className="mr-1 h-3.5 w-3.5" />복사됨</> : <><Copy className="mr-1 h-3.5 w-3.5" />코드 복사</>}
                      </Button>
                      <Button size="sm" onClick={() => shareTeamInvite({ teamName: teamName || "우리 팀", inviteCode: inviteCode! })}>
                        카카오톡으로 초대
                      </Button>
                    </div>
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
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    가입 전 팀원 이름을 미리 등록하면 출석/회비 관리가 편해집니다.
                  </p>
                  <Button size="sm" variant="outline" className="mt-2" asChild>
                    <Link href="/members">회원 관리 &rarr;</Link>
                  </Button>
                </div>
              </div>

              {/* Step 3: Create first match — 강조 CTA */}
              <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  3
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">첫 경기를 등록하세요!</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    경기를 등록하면 팀원에게 자동으로 참석 투표 알림이 갑니다.
                  </p>
                  <Button size="sm" className="mt-2" asChild>
                    <Link href="/matches">지금 바로 등록하기 &rarr;</Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Birthday Card ── */}
      {birthdayMembers && birthdayMembers.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-[hsl(var(--accent))]/20 bg-gradient-to-r from-[hsl(var(--accent))]/5 via-primary/5 to-[hsl(var(--info))]/5">
          {/* Confetti decoration */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div className="absolute -top-1 left-[10%] h-2 w-2 rotate-45 rounded-sm bg-primary/20" />
            <div className="absolute -top-0.5 left-[30%] h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]/25" />
            <div className="absolute top-1 right-[20%] h-2 w-2 rotate-12 rounded-sm bg-[hsl(var(--info))]/20" />
            <div className="absolute top-2 right-[40%] h-1.5 w-1.5 rounded-full bg-primary/15" />
            <div className="absolute bottom-1 left-[25%] h-1.5 w-1.5 rotate-45 rounded-sm bg-[hsl(var(--accent))]/20" />
            <div className="absolute bottom-2 right-[15%] h-2 w-2 rounded-full bg-[hsl(var(--info))]/15" />
          </div>

          <div className="relative px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-[hsl(var(--accent))]/20">
                <Cake className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground">
                  {birthdayMembers.length === 1
                    ? `${birthdayMembers[0].name}님, 생일 축하합니다!`
                    : `${birthdayMembers.map((m) => m.name).join(", ")}님, 생일 축하합니다!`}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  오늘은 우리 팀원의 특별한 날이에요
                </p>
              </div>
            </div>
          </div>
        </div>
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
            {(() => {
              const uniformType = upcomingMatch.uniform_type ?? "HOME";
              const isHome = uniformType !== "AWAY";
              const bgColor = data.teamUniform
                ? (isHome ? data.teamUniform.uniformPrimary : data.teamUniform.uniformSecondary) ?? (isHome ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))")
                : (isHome ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))");
              return (
                <div className="mt-1.5 flex items-center gap-1.5">
                  <div
                    className="h-4 w-4 rounded-full border border-border/60 shrink-0"
                    style={{ backgroundColor: bgColor }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {isHome ? "홈" : "원정"} 유니폼
                  </span>
                </div>
              );
            })()}
            <p className="mt-2 truncate text-sm text-muted-foreground">
              상대팀:{" "}
              <span className="font-semibold text-foreground">
                {upcomingMatch.opponent_name ?? "미정"}
              </span>
            </p>

            {/* Vote buttons */}
            {upcomingMatch.myMemberId && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground mr-1">내 투표:</span>
                {([
                  { value: "ATTEND" as const, label: "참석" },
                  { value: "MAYBE" as const, label: "미정" },
                  { value: "ABSENT" as const, label: "불참" },
                ]).map((opt) => {
                  const isSelected = displayVote === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={pendingVote}
                      aria-pressed={displayVote === opt.value}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 active:scale-105 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
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
                <div className="rounded-full bg-[hsl(var(--success))] transition-all duration-500 will-change-[width]" style={attendBarStyle} />
                <div className="bg-[hsl(var(--loss))] transition-all duration-500 will-change-[width]" style={absentBarStyle} />
              </div>
              <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                <span>참석 <strong className="text-[hsl(var(--success))]">{voteCounts.attend}</strong></span>
                <span>불참 <strong className="text-[hsl(var(--loss))]">{voteCounts.absent}</strong></span>
                <span>미정 <strong>{voteCounts.undecided}</strong></span>
                {(upcomingMatch as any)?.guestCount > 0 && (
                  <span>용병 <strong className="text-[hsl(var(--info))]">{(upcomingMatch as any).guestCount}</strong></span>
                )}
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
              <p className="text-sm text-muted-foreground truncate">초대 코드를 공유하면 바로 가입</p>
              <div className="flex gap-1.5 shrink-0">
                <Button
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => shareTeamInvite({ teamName: teamName || "우리 팀", inviteCode: inviteCode! })}
                >
                  카카오톡 초대
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="px-2 border-[hsl(var(--accent))]/30 text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent))]/10"
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
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Dues nudge (회비 미설정 팀, 운영진 이상) ── */}
      {isStaffOrAbove(role) && data.hasDuesSettings === false && !showWizard && (
        <Card className="border-[hsl(var(--info))]/20 bg-[hsl(var(--info))]/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 shrink-0 text-[hsl(var(--info))]" />
              <p className="text-sm font-semibold text-foreground">회비 관리를 시작해보세요</p>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">통장 캡쳐 한 장이면 회비가 자동 정리됩니다</p>
              <Button size="sm" className="shrink-0 gap-1 text-xs" asChild>
                <Link href="/dues?tab=settings">설정하기</Link>
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
                      <Link href={`/matches/${vote.id}?tab=vote`}>참여 &rarr;</Link>
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
              <div className="flex items-center gap-3 rounded-lg bg-[hsl(var(--success)/0.1)] px-4 py-3">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--success))]" />
                <p className="text-sm text-[hsl(var(--success))]">모든 할 일을 완료했습니다!</p>
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
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { label: "승", value: String(teamRecord.wins), color: "text-[hsl(var(--win))]", bg: "bg-[hsl(var(--win))]/8" },
                      { label: "무", value: String(teamRecord.draws), color: "text-[hsl(var(--draw))]", bg: "" },
                      { label: "패", value: String(teamRecord.losses), color: "text-[hsl(var(--loss))]", bg: "bg-[hsl(var(--loss))]/8" },
                      { label: "승률", value: `${Math.round((teamRecord.wins / recordTotal) * 100)}%`, color: "text-primary", bg: "bg-primary/8" },
                    ].map((stat) => (
                      <div key={stat.label} className={cn("card-stat flex flex-col items-center justify-center", stat.bg)}>
                        <div className={`text-base sm:text-lg font-bold font-[family-name:var(--font-display)] whitespace-nowrap ${stat.color}`}>{stat.value}</div>
                        <div className="text-xs sm:text-xs font-semibold text-muted-foreground mt-0.5 whitespace-nowrap">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    득점 {teamRecord.goalsFor} · 실점 {teamRecord.goalsAgainst} · 득실차 {teamRecord.goalsFor - teamRecord.goalsAgainst >= 0 ? "+" : ""}{teamRecord.goalsFor - teamRecord.goalsAgainst}
                  </p>
                  {teamRecord.recent5.length > 0 && (
                    <div className="mt-2 flex items-center gap-1">
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
                    <p className="mt-1 text-sm text-muted-foreground">
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
