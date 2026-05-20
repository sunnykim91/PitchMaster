"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronRight, Loader2 } from "lucide-react";
import { GA } from "@/lib/analytics";
import { useApi, apiMutate } from "@/lib/useApi";
import { isStaffOrAbove } from "@/lib/permissions";
import { useViewAsRole } from "@/lib/ViewAsRoleContext";
import type { Role } from "@/lib/types";
import { cn, formatTime, formatDateKo } from "@/lib/utils";
import { toKoreanError } from "@/lib/errorMessages";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/lib/ToastContext";
import AlphaTesterBanner from "@/components/AlphaTesterBanner";
import WelcomeCard from "@/components/onboarding/WelcomeCard";
import { shareTeamInvite } from "@/lib/kakaoShare";
import "@/app/onboarding/onboarding.css";

// TEMP: 디자인 검토용 — 김선휘만 ?previewWelcome=created로 시안 created 카드 노출. 작업 종료 후 제거.
const DESIGN_PREVIEW_USER_ID = "7bc8a1b2-7844-41f3-b592-05a2c38f8085";

type UpcomingMatch = {
  id: string;
  match_date: string;
  match_time: string | null;
  match_end_time: string | null;
  vote_deadline: string | null;
  opponent_name: string | null;
  location: string | null;
  voteCounts: { attend: number; absent: number; undecided: number };
  myVote: "ATTEND" | "ABSENT" | "MAYBE" | null;
  myMemberId: string | null;
  uniform_type?: string | null;
  matchType?: "REGULAR" | "INTERNAL" | "EVENT";
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
  matchDate: string;
  matchTime: string | null;
  opponentName: string | null;
  matchType: "REGULAR" | "INTERNAL" | "EVENT";
  voteCounts: { attend: number; absent: number; undecided: number };
};

type TeamRecord = {
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  recent5: ("W" | "D" | "L")[];
};

type UniformSet = { primary: string; secondary: string; pattern: string };
type TeamUniform = {
  uniformPrimary: string | null;
  uniformSecondary: string | null;
  uniformPattern: string | null;
  uniforms?: { home?: UniformSet; away?: UniformSet; third?: UniformSet | null } | null;
};

type BirthdayMember = {
  name: string;
  birthDate: string;
  profileImageUrl: string | null;
};

type DashboardTask = { label: string; href: string };

type DashboardData = {
  upcomingMatch: UpcomingMatch | null;
  recentResult: RecentResult | null;
  activeVotes: ActiveVote[];
  tasks: DashboardTask[];
  teamRecord: TeamRecord;
  teamUniform?: TeamUniform | null;
  birthdayMembers?: BirthdayMember[];
  hasDuesSettings?: boolean;
  /** 팀 전체 경기 수 (0이면 한 번도 경기를 등록한 적 없음) */
  totalMatches?: number;
  /** 실제 가입 완료한 팀원 수 */
  registeredMemberCount?: number;
  mySeasonStats?: {
    matches: number;
    goals: number;
    attendanceRate: number;
    teamGoalRank?: number | null;
    totalCompletedMatches?: number;
  } | null;
  noticePins?: {
    global: { id: string; title: string; createdAt: string } | null;
    team: { id: string; title: string; createdAt: string }[];
  };
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
    <div className="pm-page pm-page--dashboard">
      <main className="pm-main pm-main--dashboard">
        <div className="pm-dash-skel pm-dash-skel--row" />
        <div className="pm-dash-skel pm-dash-skel--match" />
        <div className="pm-dash-skel pm-dash-skel--stat" />
        <div className="pm-dash-skel pm-dash-skel--stat" />
        <div className="pm-dash-skel pm-dash-skel--stat" />
      </main>
    </div>
  );
}

// 카운트다운 라벨 헬퍼 — 오늘 / 내일 / D-N / D+N
function relativeDayLabel(dateStr: string): string {
  const target = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (diff === 0) return "오늘";
  if (diff === 1) return "내일";
  if (diff > 0) return `D-${diff}`;
  return `D+${-diff}`;
}

const MATCH_TYPE_META = {
  REGULAR: { label: "정규", hue: "atk" as const },
  INTERNAL: { label: "자체", hue: "def" as const },
  EVENT: { label: "이벤트", hue: "mid" as const },
};

export default function DashboardClient({ userId, userRole, userName, initialData, inviteCode, teamName, teamId }: { userId: string; userRole?: Role; userName?: string; initialData?: DashboardData; inviteCode?: string; teamName?: string; teamId?: string }) {
  const { data, loading, error, refetch } = useApi<DashboardData>("/api/dashboard", initialData ?? emptyData, { skip: !!initialData });
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  // Optimistic UI: null = 서버 데이터 사용, 값 있으면 즉시 반영된 낙관적 상태
  const [optimisticVote, setOptimisticVote] = useState<"ATTEND" | "ABSENT" | "MAYBE" | null | undefined>(undefined);
  const [optimisticCounts, setOptimisticCounts] = useState<{ attend: number; absent: number; undecided: number } | null>(null);
  // 연속 클릭 방지용 (300ms)
  const [pendingVote, setPendingVote] = useState(false);
  const [loadingVote, setLoadingVote] = useState<"ATTEND" | "ABSENT" | "MAYBE" | null>(null);
  const [shakeVote, setShakeVote] = useState<"ATTEND" | "ABSENT" | "MAYBE" | null>(null);
  const [joinedWelcome, setJoinedWelcome] = useState<{ team: string } | null>(null);
  const [wizardDismissed, setWizardDismissed] = useState(false);
  const { effectiveRole } = useViewAsRole();
  const role = effectiveRole(userRole);

  // 팀 생성/가입 후 환영 토스트
  useEffect(() => {
    const welcome = searchParams.get("welcome");
    if (welcome === "created") {
      const team = searchParams.get("team") ?? "";
      showToast(`${team} 팀이 생성되었습니다! 초대 코드를 팀원에게 공유해보세요.`, "success");
      GA.teamCreate(team);
      window.history.replaceState(null, "", "/dashboard");
    } else if (welcome === "joined") {
      const team = searchParams.get("team") ?? "";
      const method = searchParams.get("method") ?? "invite_code";
      showToast(`${team} 팀에 가입되었습니다.`, "success");
      GA.teamJoin(method);
      setJoinedWelcome({ team });
      window.history.replaceState(null, "", "/dashboard");
    }
  }, [searchParams]);

  // 위자드 dismissed 상태 localStorage 동기화 (팀별 1회성)
  useEffect(() => {
    if (typeof window === "undefined" || !teamId) return;
    try {
      const key = `wizard_dismissed:${teamId}`;
      if (localStorage.getItem(key)) setWizardDismissed(true);
    } catch {
      /* localStorage 비활성 환경 무시 */
    }
  }, [teamId]);

  // 첫 경기 완료 발견 유도 토스트 (팀 누적 완료 1건일 때 1회만)
  const firstCompleteRecordTotal =
    (data.teamRecord?.wins ?? 0) + (data.teamRecord?.draws ?? 0) + (data.teamRecord?.losses ?? 0);
  useEffect(() => {
    if (loading) return;
    if (firstCompleteRecordTotal !== 1) return;
    if (typeof window === "undefined") return;
    const key = `first_complete_seen:${userId}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
      showToast("🎉 첫 경기 완료! MVP 투표·선수 카드·자동 편성도 둘러보세요.", "success");
    } catch {
      // localStorage 비활성화 환경은 조용히 스킵
    }
  }, [loading, firstCompleteRecordTotal, userId, showToast]);

  async function handleQuickVote(matchId: string, _memberId: string, vote: "ATTEND" | "ABSENT" | "MAYBE") {
    // 현재 표시 중인 투표(낙관적 or 서버) 기준으로 중복 클릭 방지
    const currentVote = optimisticVote !== undefined ? optimisticVote : data.upcomingMatch?.myVote;
    if (currentVote === vote) return;
    if (pendingVote) return;

    // 이전 상태 저장 (롤백용)
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

    setPendingVote(true);
    setLoadingVote(vote);
    setTimeout(() => setPendingVote(false), 300);

    const { error: err } = await apiMutate("/api/attendance", "POST", { matchId, vote });
    setLoadingVote(null);
    if (err) {
      setOptimisticVote(prevVote);
      setOptimisticCounts(prevCounts);
      setShakeVote(vote);
      setTimeout(() => setShakeVote(null), 500);
      showToast("투표에 실패했습니다. 다시 시도해주세요.", "error");
    } else {
      GA.voteComplete(vote, "dashboard");
      showToast(vote === "ATTEND" ? "참석으로 투표했습니다." : vote === "ABSENT" ? "불참으로 투표했습니다." : "미정으로 투표했습니다.");
      await refetch();
      setOptimisticVote(undefined);
      setOptimisticCounts(null);
    }
  }

  const { upcomingMatch, activeVotes, tasks, recentResult, teamRecord, birthdayMembers } = data;

  // 낙관적 상태가 있으면 우선 사용
  const displayVote = optimisticVote !== undefined ? optimisticVote : upcomingMatch?.myVote;
  // 투표 마감 여부
  const isVoteClosed = upcomingMatch?.vote_deadline
    ? new Date(upcomingMatch.vote_deadline) <= new Date()
    : false;
  // Attendance bar percentages
  const voteCounts = optimisticCounts ?? upcomingMatch?.voteCounts ?? { attend: 0, absent: 0, undecided: 0 };
  const voteTotal = voteCounts.attend + voteCounts.absent + voteCounts.undecided;
  const attendPercent = voteTotal > 0 ? Math.round((voteCounts.attend / voteTotal) * 100) : 0;
  const noneCount = Math.max(0, (data.registeredMemberCount ?? voteTotal) - voteTotal);

  // Team record totals
  const recordTotal = teamRecord.wins + teamRecord.draws + teamRecord.losses;

  // 디자인 검토용 preview
  const isPreviewWelcomeCreated =
    searchParams.get("previewWelcome") === "created" && userId === DESIGN_PREVIEW_USER_ID;

  // Onboarding wizard: 빈 새 팀 + 운영진(STAFF+) + 닫지 않은 상태에서만 노출
  const showWizard =
    isPreviewWelcomeCreated ||
    (!wizardDismissed &&
      isStaffOrAbove(role) &&
      !upcomingMatch &&
      activeVotes.length === 0 &&
      !recentResult &&
      recordTotal === 0);

  function dismissWizard() {
    setWizardDismissed(true);
    if (!isPreviewWelcomeCreated && typeof window !== "undefined" && teamId) {
      try {
        localStorage.setItem(`wizard_dismissed:${teamId}`, "1");
      } catch {
        /* 무시 */
      }
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

  // 다가오는 경기 type meta
  const upcomingType: "REGULAR" | "INTERNAL" | "EVENT" = upcomingMatch?.matchType ?? "REGULAR";
  const upcomingTypeMeta = MATCH_TYPE_META[upcomingType];

  // 인사 sub 라벨 + 요일 chip
  const todayDate = new Date();
  const todayStr = todayDate.toISOString().slice(0, 10);
  const dayShortNames = ["일", "월", "화", "수", "목", "금", "토"];
  const todayDayShort = dayShortNames[todayDate.getDay()];
  const greetMeta = `${formatDateKo(todayStr)}${teamName ? ` · ${teamName}` : ""}${recordTotal > 0 ? ` · 시즌 ${recordTotal}경기째` : ""}`;
  const upcomingRelLabel = upcomingMatch ? relativeDayLabel(upcomingMatch.match_date) : "";

  // 공지 — 운영공지 + 팀공지 모두 노출 (최대 3개)
  const notices: Array<{ id: string; label: string; title: string }> = [];
  if (data.noticePins?.global) {
    notices.push({ id: data.noticePins.global.id, label: "운영공지", title: data.noticePins.global.title });
  }
  for (const t of (data.noticePins?.team ?? []).slice(0, 2)) {
    notices.push({ id: t.id, label: "팀공지", title: t.title });
  }

  // 회비 nudge 노출 조건 (회장+ + 회비 미설정 + 회원 5명+)
  const showDuesNudge = isStaffOrAbove(role) && data.hasDuesSettings === false && (data.registeredMemberCount ?? 0) >= 5;
  const showVoteStatus = isStaffOrAbove(role) && activeVotes.length > 0;
  const showRecord = recordTotal > 0;
  // 1인 팀(< 10명) invite nudge — 회장+ + 초대 코드 보유
  const showInviteNudge = !showWizard && isStaffOrAbove(role) && !!inviteCode && (data.registeredMemberCount ?? 0) < 10;

  async function handleInviteShare() {
    if (!inviteCode) return;
    await shareTeamInvite({ teamName: teamName || "우리 팀", inviteCode });
  }
  async function handleInviteCopy() {
    if (!inviteCode) return;
    try {
      const url = `${window.location.origin}/team?code=${inviteCode}`;
      await navigator.clipboard.writeText(url);
      GA.inviteSent("copy_link");
      showToast("초대 링크가 복사되었습니다.");
    } catch {
      showToast("복사에 실패했습니다.", "error");
    }
  }

  return (
    <div className="pm-page pm-page--dashboard">
      <main className="pm-main pm-main--dashboard">
        {/* A · 인사 */}
        <div className="pm-dash-greet">
          <div className="pm-dash-greet-row">
            <h1 className="pm-dash-greet-hello">
              안녕하세요,<br />
              <strong>{userName || "팀원"}</strong> 님.
            </h1>
            {upcomingMatch && (
              <Link
                href={`/matches/${upcomingMatch.id}`}
                className="pm-dash-greet-next"
                aria-label={`다음 경기 ${upcomingRelLabel}`}
              >
                <span className="pm-dash-greet-next-dot" aria-hidden />
                <span className="pm-dash-greet-next-sub">다음 경기</span>
                <span>{upcomingRelLabel}</span>
              </Link>
            )}
          </div>
          <div className="pm-dash-greet-meta">
            <span className="pm-dash-greet-day" aria-hidden>{todayDayShort}</span>
            <span>{greetMeta}</span>
          </div>
        </div>

        {/* 알파 테스터 배너 */}
        <AlphaTesterBanner />

        {/* WelcomeCard joined */}
        {joinedWelcome && (
          <WelcomeCard
            variant="joined"
            teamName={joinedWelcome.team}
            teamId={teamId ?? ""}
            userId={userId}
            nextMatch={
              upcomingMatch
                ? {
                    id: upcomingMatch.id,
                    when: `${formatDateKo(upcomingMatch.match_date)}${
                      upcomingMatch.match_time ? ` ${formatTime(upcomingMatch.match_time)}` : ""
                    }`,
                    where: upcomingMatch.location ?? "장소 미정",
                  }
                : null
            }
            onDismiss={() => setJoinedWelcome(null)}
          />
        )}

        {/* WelcomeCard created (Onboarding Wizard) */}
        {showWizard && inviteCode && (
          <WelcomeCard
            variant="created"
            teamName={teamName || "우리 팀"}
            teamId={teamId ?? ""}
            inviteCode={inviteCode}
            onDismiss={dismissWizard}
          />
        )}

        {/* B · 공지 — 운영공지 + 팀공지 모두 노출 */}
        {!showWizard && notices.map((n) => (
          <Link key={n.id} href={`/board?post=${n.id}`} className="pm-dash-notice" style={{ textDecoration: "none" }}>
            <span className="pm-dash-notice-icon" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M4 4h7l3 3v7H4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                <path d="M11 4v3h3M6.5 9.5h5M6.5 12h3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </span>
            <div className="pm-dash-notice-body">
              <div className="pm-dash-notice-label">{n.label}</div>
              <div className="pm-dash-notice-title">{n.title}</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
              <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        ))}

        {/* Main rail · D 또는 C empty hero */}
        <div className="pm-dash-col pm-dash-col--main">
          {!showWizard && upcomingMatch ? (
            <section className="pm-section">
              <div className="pm-section-h">
                <span>다가오는 경기</span>
                <Link href="/matches" className="pm-dash-section-link" style={{ textDecoration: "none" }}>
                  전체 보기
                  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
                    <path d="M3 2l3 3-3 3" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
                  </svg>
                </Link>
              </div>
              {(() => {
                // 큰 날짜 split layout 데이터 준비
                const matchDate = new Date(upcomingMatch.match_date + "T00:00:00");
                const dayNum = matchDate.getDate();
                const monthNum = matchDate.getMonth() + 1;
                const dayNames = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
                const dayName = dayNames[matchDate.getDay()];
                const relLabel = relativeDayLabel(upcomingMatch.match_date);
                // 마감까지 N일
                let deadlineLabel = "";
                if (upcomingMatch.vote_deadline) {
                  const diff = Math.ceil((new Date(upcomingMatch.vote_deadline).getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000));
                  if (diff > 0) deadlineLabel = `투표 마감까지 ${diff}일 남음`;
                  else if (diff === 0) deadlineLabel = "오늘 마감";
                  else deadlineLabel = "투표 마감됨";
                }
                const totalMembers = data.registeredMemberCount ?? voteTotal;
                return (
                  <div
                    className={`pm-match-card pm-hue--${upcomingTypeMeta.hue}`}
                    role="group"
                    aria-label="다가오는 경기"
                    style={{ position: "relative" }}
                  >
                    {/* Floating D-N chip 우상단 */}
                    <span className="pm-mc-rel-floating" aria-hidden>
                      <span className="pm-mc-rel-floating-dot" />
                      {relLabel}
                    </span>

                    {/* Type 배지 좌상단 */}
                    <header className="pm-mc-head">
                      <span className="pm-mc-type">{upcomingTypeMeta.label}</span>
                    </header>

                    {/* Split: 큰 날짜 + divider + 정보 */}
                    <Link href={`/matches/${upcomingMatch.id}`} style={{ textDecoration: "none", color: "inherit", display: "contents" }}>
                      <div className="pm-mc-split">
                        <div className="pm-mc-date-big">
                          <span className="pm-mc-date-month">{monthNum}월</span>
                          <span className="pm-mc-date-day">{dayNum}</span>
                          <span className="pm-mc-date-dayname">{dayName}</span>
                        </div>
                        <div className="pm-mc-split-divider" aria-hidden />
                        <div className="pm-mc-info">
                          {upcomingType === "REGULAR" && upcomingMatch.opponent_name && (
                            <>
                              <span className="pm-mc-info-vs">vs</span>
                              <div className="pm-mc-info-opp">{upcomingMatch.opponent_name}</div>
                            </>
                          )}
                          {upcomingType === "INTERNAL" && (
                            <div className="pm-mc-info-opp pm-mc-info-opp--mute">우리끼리 자체전</div>
                          )}
                          {upcomingType === "EVENT" && (
                            <div className="pm-mc-info-opp pm-mc-info-opp--mute">{upcomingMatch.opponent_name || "팀 이벤트"}</div>
                          )}
                          {upcomingType === "REGULAR" && !upcomingMatch.opponent_name && (
                            <div className="pm-mc-info-opp pm-mc-info-opp--mute">상대 미정</div>
                          )}
                          <div className="pm-mc-info-time">
                            {upcomingMatch.match_time ? formatTime(upcomingMatch.match_time) : "시간 미정"}
                            {upcomingMatch.match_end_time && ` – ${formatTime(upcomingMatch.match_end_time)}`}
                            <DashboardWeather date={upcomingMatch.match_date} location={upcomingMatch.location} />
                          </div>
                          {upcomingMatch.location && (
                            <div className="pm-mc-info-venue">
                              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
                                <path d="M6 1c-2 0-3.5 1.5-3.5 3.4 0 2.4 3.5 6.6 3.5 6.6s3.5-4.2 3.5-6.6C9.5 2.5 8 1 6 1z" stroke="currentColor" strokeWidth="1.2" fill="none" />
                                <circle cx="6" cy="4.5" r="1.3" stroke="currentColor" strokeWidth="1.1" fill="none" />
                              </svg>
                              <span>{upcomingMatch.location}</span>
                            </div>
                          )}
                          {/* 전술 미설정 칩 — backend squad info 필요 (현재 false positive 위험으로 비활성) */}
                        </div>
                      </div>
                    </Link>

                    {/* 4-color stacked progress + 비율/투표수 헤더 */}
                    <div className="pm-dash-progress-row">
                      <div className="pm-dash-progress-row-head">
                        <span className="pm-dash-progress-head-pct">참석 {attendPercent}%</span>
                        <span className="pm-dash-progress-head-total">
                          {voteTotal}/{totalMembers}명 투표
                        </span>
                      </div>
                      <div className="pm-dash-progress-stacked" aria-label={`참석 ${attendPercent}%`}>
                        {voteCounts.attend > 0 && (
                          <div className="pm-dash-progress-cell pm-dash-progress-cell--yes" style={{ flex: voteCounts.attend }}>
                            {voteCounts.attend}
                          </div>
                        )}
                        {voteCounts.undecided > 0 && (
                          <div className="pm-dash-progress-cell pm-dash-progress-cell--maybe" style={{ flex: voteCounts.undecided }}>
                            {voteCounts.undecided}
                          </div>
                        )}
                        {voteCounts.absent > 0 && (
                          <div className="pm-dash-progress-cell pm-dash-progress-cell--no" style={{ flex: voteCounts.absent }}>
                            {voteCounts.absent}
                          </div>
                        )}
                        {noneCount > 0 && (
                          <div className="pm-dash-progress-cell pm-dash-progress-cell--none" style={{ flex: noneCount }}>
                            {noneCount}
                          </div>
                        )}
                      </div>
                      <div className="pm-dash-legend">
                        <span><span className="pm-statusdot pm-statusdot--success" />참석</span>
                        <span><span className="pm-statusdot" style={{ background: "hsl(var(--warning))" }} />미정</span>
                        <span><span className="pm-statusdot" style={{ background: "hsl(var(--destructive))" }} />불참</span>
                        <span><span className="pm-statusdot pm-statusdot--muted" />미투표</span>
                      </div>
                    </div>

                    {/* 투표 버튼 — 마감 전에만 노출 */}
                    {upcomingMatch.myMemberId && !isVoteClosed && (
                      <div className="pm-dash-myvote" role="radiogroup" aria-label="내 투표">
                        {([
                          { value: "ATTEND" as const, label: "참석", cls: "pm-vote--yes" },
                          { value: "MAYBE" as const, label: "미정", cls: "pm-vote--maybe" },
                          { value: "ABSENT" as const, label: "불참", cls: "pm-vote--no" },
                        ]).map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            disabled={pendingVote || !!loadingVote}
                            aria-pressed={displayVote === opt.value}
                            className={cn(
                              "pm-dash-myvote-btn",
                              opt.cls,
                              displayVote === opt.value && "is-on",
                              shakeVote === opt.value && "animate-shake",
                            )}
                            onClick={() => handleQuickVote(upcomingMatch.id, upcomingMatch.myMemberId!, opt.value)}
                          >
                            {loadingVote === opt.value && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            <span className="pm-dash-myvote-dot" /> {opt.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Footer — 마감 상태 + 내 투표 통합 표시 */}
                    {(deadlineLabel || isVoteClosed) && (
                      <footer className="pm-dash-mc-foot--v2">
                        <span className="pm-dash-mc-foot--v2-left">
                          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3" fill="none" />
                            <path d="M7 4v3l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none" />
                          </svg>
                          {isVoteClosed
                            ? `투표 마감됨${displayVote ? ` · 내 투표: ${displayVote === "ATTEND" ? "참석" : displayVote === "ABSENT" ? "불참" : "미정"}` : ""}`
                            : deadlineLabel}
                        </span>
                        <span className="pm-dash-mc-foot--v2-right">{relLabel}</span>
                      </footer>
                    )}
                  </div>
                );
              })()}
            </section>
          ) : !showWizard && isStaffOrAbove(role) && (data.totalMatches ?? 0) === 0 ? (
            /* C · 첫 경기 hero — 한 번도 경기 등록 안 한 팀의 회장+ */
            <div className="pm-paste-hero pm-dash-emptyhero">
              <div className="pm-amb" aria-hidden />
              <div className="pm-hero-inner">
                <h2 className="pm-h1 pm-h1--hero">첫 경기를<br />만들어 보세요.</h2>
                <p className="pm-sub" style={{ marginBottom: 4 }}>
                  등록하면 팀원에게 자동으로<br />참석 투표 알림이 갑니다.
                </p>
                <div className="pm-empty-types">
                  <div className="pm-empty-type pm-hue--atk">
                    <div className="pm-empty-type-label">정규</div>
                    <div className="pm-empty-type-desc">상대팀과의 경기</div>
                  </div>
                  <div className="pm-empty-type pm-hue--def">
                    <div className="pm-empty-type-label">자체</div>
                    <div className="pm-empty-type-desc">우리 팀 안에서</div>
                  </div>
                  <div className="pm-empty-type pm-hue--mid">
                    <div className="pm-empty-type-label">이벤트</div>
                    <div className="pm-empty-type-desc">MT · 회식 · 모임</div>
                  </div>
                </div>
                <Link href="/matches" className="pm-paste-cta" style={{ textDecoration: "none" }}>
                  <span className="pm-paste-cta-icon" aria-hidden>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <rect x="3.5" y="4.5" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M3.5 8h13M7 3v3M13 3v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <path d="M10 11v3M8.5 12.5h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                  </span>
                  <div className="pm-paste-cta-body">
                    <div className="pm-paste-cta-label">새 경기 만들기</div>
                    <div className="pm-paste-cta-sub">투표 알림 자동 발송</div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                    <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </div>
            </div>
          ) : !showWizard && isStaffOrAbove(role) ? (
            /* 다음 경기 일정 등록 안내 — 회장+ + 과거 경기 있음 + 다가오는 경기 없음 */
            <div
              className="pm-empty pm-empty--soft"
              style={{
                marginTop: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: 14,
                borderRadius: 14,
                border: "1px solid hsl(var(--primary) / 0.32)",
                background: "hsl(var(--primary) / 0.06)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 22 }} aria-hidden>📅</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "hsl(var(--foreground))" }}>예정된 경기가 없어요</div>
                  <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginTop: 2 }}>다음 경기를 등록해 보세요</div>
                </div>
              </div>
              <Link
                href="/matches"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "8px 14px",
                  borderRadius: 10,
                  background: "hsl(var(--primary))",
                  color: "white",
                  fontFamily: "var(--font-display)",
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  boxShadow: "0 4px 12px hsl(var(--primary) / 0.32)",
                }}
              >
                일정 등록
              </Link>
            </div>
          ) : !showWizard ? (
            /* 일반 회원 폴백 */
            <div className="pm-empty pm-empty--soft" style={{ marginTop: 0 }}>
              <span className="pm-empty-glyph" aria-hidden>📅</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "hsl(var(--foreground))" }}>예정된 경기가 없습니다</div>
                <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginTop: 2 }}>회장이 일정을 올리면 알림으로 받아요</div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Side rail · 액션 우선 순서: 미완료 → 회비 → 투표 → 시즌기록 → 시즌전적 */}
        <div className="pm-dash-col pm-dash-col--side">
          {/* H · 미완료 항목 — 가장 위로 (액션 필요) */}
          <section className="pm-section">
            <div className="pm-section-h">
              <span>미완료 항목</span>
              {tasks.length > 0 ? (
                <span className="pm-section-count">{tasks.length}건</span>
              ) : (
                <span className="pm-section-count" style={{ color: "hsl(var(--success))" }}>
                  완료
                </span>
              )}
            </div>
            {tasks.length > 0 ? (
              <div className="pm-dash-todo">
                {tasks.map((t, i) => (
                  <Link key={i} href={t.href} className="pm-dash-todo-item" style={{ textDecoration: "none" }}>
                    <span className="pm-dash-todo-check" aria-hidden />
                    <span className="pm-dash-todo-label">{t.label}</span>
                    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                      <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="pm-dash-todo-allclear" role="status">
                <span className="pm-dash-todo-allclear-icon" aria-hidden>
                  <svg width="16" height="16" viewBox="0 0 16 16">
                    <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <div className="pm-dash-todo-allclear-body">
                  <div className="pm-dash-todo-allclear-title">모두 완료하셨습니다</div>
                  <div className="pm-dash-todo-allclear-sub">처리할 항목이 없어요</div>
                </div>
              </div>
            )}
          </section>

          {/* 1인 팀 invite nudge — 회장+ + 회원 < 10명 + 초대코드 */}
          {showInviteNudge && (
            <div
              className="pm-dash-nudge"
              role="status"
              style={{
                background:
                  "radial-gradient(ellipse 80% 60% at 100% 0%, hsl(var(--info) / 0.10), transparent 60%), hsl(var(--info) / 0.06)",
                borderColor: "hsl(var(--info) / 0.32)",
              }}
            >
              <div className="pm-dash-nudge-head">
                <span
                  className="pm-dash-nudge-icon"
                  aria-hidden
                  style={{ background: "hsl(var(--info) / 0.16)", color: "hsl(var(--info))", borderColor: "hsl(var(--info) / 0.28)" }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <circle cx="6.5" cy="6.5" r="2.6" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M2.5 14.5c.7-2.4 2.6-3.7 4-3.7s3.3 1.3 4 3.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    <path d="M12 4v6M9 7h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                </span>
                <div className="pm-dash-nudge-body">
                  <div className="pm-dash-nudge-title">팀원을 초대해 보세요</div>
                  <div className="pm-dash-nudge-sub">현재 {data.registeredMemberCount ?? 1}명 · 초대 코드 {inviteCode}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  className="pm-dash-nudge-btn"
                  style={{ background: "hsl(var(--info))", flex: 1 }}
                  onClick={handleInviteShare}
                >
                  카카오 공유
                </button>
                <button
                  type="button"
                  className="pm-dash-nudge-btn"
                  style={{ background: "transparent", color: "hsl(var(--info))", border: "1px solid hsl(var(--info) / 0.4)", flexShrink: 0, padding: "0 14px" }}
                  onClick={handleInviteCopy}
                >
                  링크
                </button>
              </div>
            </div>
          )}

          {/* F · 회비 nudge (회장+ + 미설정 + 5명+) */}
          {showDuesNudge && (
            <div className="pm-dash-nudge" role="status">
              <div className="pm-dash-nudge-head">
                <span className="pm-dash-nudge-icon" aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <rect x="2.5" y="5.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
                    <circle cx="9" cy="10" r="1.6" stroke="currentColor" strokeWidth="1.3" fill="none" />
                    <path d="M5 5.5V4M13 5.5V4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                </span>
                <div className="pm-dash-nudge-body">
                  <div className="pm-dash-nudge-title">회비 규칙을 설정해 주세요</div>
                  <div className="pm-dash-nudge-sub">팀원 {data.registeredMemberCount}명 · 미설정</div>
                </div>
              </div>
              <Link href="/dues" className="pm-dash-nudge-btn" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                설정하기
              </Link>
            </div>
          )}

          {/* G · 투표 현황 (운영진+) */}
          {showVoteStatus && (
            <section className="pm-section">
              <div className="pm-section-h">
                <span>투표 현황</span>
                <span className="pm-section-count">{activeVotes.length}건 진행</span>
              </div>
              <div className="pm-dash-votelist">
                {activeVotes.map((v) => {
                  const vMeta = MATCH_TYPE_META[v.matchType];
                  const oppText =
                    v.matchType === "INTERNAL" ? "자체전" :
                    v.matchType === "EVENT" ? (v.opponentName || "팀 이벤트") :
                    v.opponentName ? `vs ${v.opponentName}` : "팀 일정";
                  const total = (data.registeredMemberCount ?? (v.voteCounts.attend + v.voteCounts.undecided + v.voteCounts.absent));
                  const voted = v.voteCounts.attend + v.voteCounts.undecided + v.voteCounts.absent;
                  const noneCount = Math.max(0, total - voted);
                  return (
                    <Link
                      key={v.id}
                      href={`/matches/${v.id}`}
                      className={`pm-dash-voterow pm-hue--${vMeta.hue}`}
                      style={{ textDecoration: "none" }}
                    >
                      <div className="pm-dash-voterow-body">
                        <div className="pm-dash-voterow-head">
                          <span className="pm-dash-voterow-opp">{oppText}</span>
                          <span className="pm-dash-voterow-when">
                            {formatDateKo(v.matchDate)}{v.matchTime && ` ${formatTime(v.matchTime)}`}
                          </span>
                        </div>
                        <div className="pm-dash-voterow-progress" aria-label="투표 진행">
                          {v.voteCounts.attend > 0 && <span className="yes" style={{ flex: v.voteCounts.attend }} />}
                          {v.voteCounts.undecided > 0 && <span className="maybe" style={{ flex: v.voteCounts.undecided }} />}
                          {v.voteCounts.absent > 0 && <span className="no" style={{ flex: v.voteCounts.absent }} />}
                          {noneCount > 0 && <span className="none" style={{ flex: noneCount }} />}
                        </div>
                        <div className="pm-dash-voterow-tallies">
                          <span><span className="pm-statusdot pm-statusdot--success" />{v.voteCounts.attend}</span>
                          <span><span className="pm-statusdot" style={{ background: "hsl(var(--warning))" }} />{v.voteCounts.undecided}</span>
                          <span><span className="pm-statusdot" style={{ background: "hsl(var(--destructive))" }} />{v.voteCounts.absent}</span>
                          <span><span className="pm-statusdot pm-statusdot--muted" />{noneCount}</span>
                        </div>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                        <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* E · 내 시즌 기록 — 정보 (액션 X) */}
          {data.mySeasonStats && (
            <section className="pm-section">
              <div className="pm-section-h">
                <span>내 시즌 기록</span>
                <Link href={`/player/${userId}${teamId ? `?team=${teamId}` : ""}`} className="pm-dash-section-link" style={{ textDecoration: "none" }}>
                  내 카드
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="pm-dash-stats">
                {(() => {
                  const stat = data.mySeasonStats!;
                  const total = stat.totalCompletedMatches ?? 0;
                  // 출전 trend: 본인 출전 / 전체 완료 경기 (출전률)
                  const matchRate = total > 0 ? Math.round((stat.matches / total) * 100) : null;
                  // 골 trend: 팀내 순위
                  const rank = stat.teamGoalRank ?? null;
                  return [
                    {
                      hue: "atk", label: "출전",
                      value: stat.matches, unit: "경기",
                      trendValue: matchRate, trendLabel: total > 0 ? `전체 ${total}경기 중` : "시즌 누적",
                      trendSuffix: matchRate != null ? "%" : null,
                    },
                    {
                      hue: "mid", label: "골",
                      value: stat.goals, unit: "골",
                      trendValue: rank, trendLabel: rank ? "팀내 상위" : "시즌 누적",
                      trendSuffix: rank != null ? "위" : null,
                      trendPrefix: rank != null ? null : null,
                    },
                    {
                      hue: "def", label: "출석률",
                      value: stat.attendanceRate, unit: "%",
                      trendValue: null, trendLabel: "최근 10경기",
                      trendSuffix: null,
                    },
                  ];
                })().map((s) => (
                  <div key={s.label} className={`pm-dash-stat pm-hue--${s.hue}`}>
                    <div className="pm-dash-stat-meta">
                      <div className="pm-dash-stat-label">{s.label}</div>
                      <div className="pm-dash-stat-sub">
                        {s.trendValue != null && (
                          <span className="pm-dash-stat-trend">
                            <span className="pm-dash-stat-trend-arrow">↑</span>
                            {s.trendValue}{s.trendSuffix}
                          </span>
                        )}
                        {s.trendLabel}
                      </div>
                    </div>
                    <div className="pm-dash-stat-right">
                      <div className="pm-dash-stat-num">{s.value}<span className="pm-dash-stat-unit">{s.unit}</span></div>
                      <svg className="pm-dash-stat-spark" viewBox="0 0 100 22" preserveAspectRatio="none" aria-hidden>
                        <polyline
                          points="0,16 12,12 24,15 36,9 48,11 60,6 72,9 84,4 100,7"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 생일 카드 — 데이터 있을 때만 */}
          {(birthdayMembers ?? []).length > 0 && (
            <section className="pm-section">
              <div className="pm-section-h">
                <span>이번 주 생일</span>
                <span className="pm-section-count">{birthdayMembers!.length}명</span>
              </div>
              <div className="pm-dash-bday">
                {birthdayMembers!.map((m) => {
                  const md = m.birthDate?.slice(5).replace("-", "/") ?? "";
                  return (
                    <div key={`${m.name}-${m.birthDate}`} className="pm-dash-bday-row">
                      <span className="pm-dash-bday-avatar" aria-hidden>
                        {m.profileImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.profileImageUrl} alt="" />
                        ) : (
                          <span className="pm-dash-bday-emoji">🎂</span>
                        )}
                      </span>
                      <span className="pm-dash-bday-name">{m.name}</span>
                      <span className="pm-dash-bday-date">{md}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* I · 시즌 전적 (PC only via CSS) */}
          {showRecord && (
            <div className="pm-dash-record-wrap">
              <section className="pm-section">
                <div className="pm-section-h">
                  <span>시즌 전적</span>
                  <span className="pm-section-count">{recordTotal}경기</span>
                </div>
                <div className="pm-dash-record">
                  <div className="pm-dash-wdl">
                    <div className="pm-dash-wdl-col pm-hue--win">
                      <div className="pm-dash-wdl-num">{teamRecord.wins}</div>
                      <div className="pm-dash-wdl-label">승</div>
                    </div>
                    <div className="pm-dash-wdl-col pm-hue--draw">
                      <div className="pm-dash-wdl-num">{teamRecord.draws}</div>
                      <div className="pm-dash-wdl-label">무</div>
                    </div>
                    <div className="pm-dash-wdl-col pm-hue--loss">
                      <div className="pm-dash-wdl-num">{teamRecord.losses}</div>
                      <div className="pm-dash-wdl-label">패</div>
                    </div>
                  </div>
                  {teamRecord.recent5.length > 0 && (
                    <div className="pm-dash-recent">
                      <span className="pm-dash-recent-label">최근 5경기</span>
                      <div className="pm-dash-recent-dots">
                        {teamRecord.recent5.map((r, i) => (
                          <span key={i} className={`pm-dash-recent-dot pm-dash-recent-dot--${r}`}>{r}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>

        {/* J · 빠른 이동 (full row) */}
        <section className="pm-section pm-dash-full">
          <div className="pm-section-h">
            <span>빠른 이동</span>
          </div>
          <div className="pm-dash-nav">
            {([
              {
                href: "/matches", label: "경기 일정",
                sub: upcomingMatch ? `다음 ${relativeDayLabel(upcomingMatch.match_date)}` : "예정 없음",
                hue: "atk",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <rect x="3" y="4.5" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M3 7.5h12M6.5 3v2.5M11.5 3v2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                ),
              },
              {
                href: "/records", label: "내 기록",
                sub: data.mySeasonStats ? `시즌 ${data.mySeasonStats.goals}골 / ${data.mySeasonStats.matches}경기` : "기록 보기",
                hue: "mid",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M3 14V8M8 14V4M13 14v-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                ),
              },
              {
                href: "/dues", label: isStaffOrAbove(role) ? "회비 관리" : "내 회비",
                sub: data.hasDuesSettings === false ? "규칙 미설정" : "거래 내역",
                hue: "def",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <rect x="2.5" y="5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
                    <circle cx="9" cy="9.5" r="1.8" stroke="currentColor" strokeWidth="1.3" fill="none" />
                  </svg>
                ),
              },
              {
                href: "/board", label: "게시판",
                sub: "공지 · 자유",
                hue: "gk",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <rect x="3" y="3.5" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M5.5 7h7M5.5 9.5h7M5.5 12h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                ),
              },
            ]).map((n) => (
              <Link key={n.href} href={n.href} className={`pm-dash-nav-item pm-hue--${n.hue}`} style={{ textDecoration: "none" }}>
                <span className="pm-dash-nav-icon" aria-hidden>{n.icon}</span>
                <span className="pm-dash-nav-body">
                  <span className="pm-dash-nav-label">{n.label}</span>
                  <span className="pm-dash-nav-sub">{n.sub}</span>
                </span>
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                  <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

// ── 대시보드 날씨 chip — 다가오는 경기 시간 옆 inline ──
function DashboardWeather({ date, location }: { date: string; location: string | null }) {
  const [weather, setWeather] = useState<{ temp: number | null; description: string; icon: string } | null>(null);
  useEffect(() => {
    if (!date) return;
    const params = new URLSearchParams({ date });
    if (location) params.set("location", location);
    fetch(`/api/weather?${params}`)
      .then((res) => res.json())
      .then((d) => { if (d && d.icon) setWeather(d); })
      .catch(() => {});
  }, [date, location]);

  if (!weather) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        marginLeft: 8,
        padding: "1px 8px",
        borderRadius: 999,
        background: "hsl(var(--muted-foreground) / 0.10)",
        border: "1px solid hsl(var(--border))",
        fontSize: 11,
        fontFeatureSettings: '"tnum" 1',
        verticalAlign: "middle",
      }}
    >
      <span style={{ fontSize: 12, lineHeight: 1 }}>{weather.icon}</span>
      {weather.temp != null ? <span style={{ fontWeight: 600 }}>{weather.temp}°</span> : <span>{weather.description}</span>}
    </span>
  );
}
