"use client";

import "@/app/onboarding/onboarding.css";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useApi, apiMutate } from "@/lib/useApi";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { isStaffOrAbove } from "@/lib/permissions";
import { useViewAsRole } from "@/lib/ViewAsRoleContext";
import { useToast } from "@/lib/ToastContext";
import type { Role, SportType } from "@/lib/types";
import { GA } from "@/lib/analytics";
import { SPORT_DEFAULTS } from "@/lib/types";
import { cn, formatTime, formatDateTime, formatMatchDate } from "@/lib/utils";
import { voteStyles } from "@/lib/voteStyles";
import { toKoreanError } from "@/lib/errorMessages";
import { Skeleton } from "@/components/ui/skeleton";
import { Modal } from "@/components/ui/Modal";
import { shareVoteLink } from "@/lib/kakaoShare";
import { EmptyState } from "@/components/EmptyState";
import { MatchCalendar } from "@/components/MatchCalendar";
import { Calendar, ChevronDown, ChevronRight, ChevronUp, Loader2, Share2 } from "lucide-react";
import { getUniformStyle } from "@/lib/uniformUtils";

type MatchStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";
type AttendanceVote = "ATTEND" | "ABSENT" | "MAYBE";

type Match = {
  id: string;
  date: string;
  time: string;
  endTime?: string | null;
  endDate?: string | null;
  location: string;
  opponent?: string;
  quarterCount: number;
  quarterDuration: number;
  breakDuration: number;
  status: MatchStatus;
  voteDeadline?: string;
  score?: string | null;
  uniformType: "HOME" | "AWAY" | "THIRD";
  matchType: "REGULAR" | "INTERNAL" | "EVENT";
  sportType?: "SOCCER" | "FUTSAL" | null;
  playerCount?: number;
  statsIncluded: boolean;
};

type DbMatch = {
  id: string;
  team_id: string;
  opponent_name: string;
  match_date: string;
  match_time: string;
  match_end_time: string | null;
  match_end_date: string | null;
  location: string;
  quarter_count: number;
  quarter_duration: number;
  break_duration: number;
  status: MatchStatus;
  vote_deadline: string | null;
  score?: string | null;
  uniform_type?: string | null;
  match_type?: string | null;
  sport_type?: string | null;
  player_count?: number | null;
  stats_included?: boolean | null;
  created_by: string;
  created_at: string;
};

type DbAttendance = {
  match_id: string;
  user_id: string | null;
  member_id: string | null;
  vote: AttendanceVote;
  users: { name: string } | null;
  member?: { id: string; user_id: string | null } | null;
};

type AttendanceState = Record<string, Record<string, AttendanceVote>>;

function mapDbMatchToMatch(db: DbMatch): Match {
  return {
    id: db.id,
    date: db.match_date,
    time: db.match_time,
    endTime: db.match_end_time,
    endDate: db.match_end_date,
    location: db.location,
    opponent: db.opponent_name || undefined,
    quarterCount: db.quarter_count,
    quarterDuration: db.quarter_duration,
    breakDuration: db.break_duration,
    status: db.status,
    voteDeadline: db.vote_deadline || undefined,
    score: db.score ?? null,
    uniformType: (db.uniform_type === "THIRD" ? "THIRD" : db.uniform_type === "AWAY" ? "AWAY" : "HOME") as "HOME" | "AWAY" | "THIRD",
    matchType: (db.match_type === "INTERNAL" ? "INTERNAL" : db.match_type === "EVENT" ? "EVENT" : "REGULAR") as "REGULAR" | "INTERNAL" | "EVENT",
    sportType: (db.sport_type === "FUTSAL" ? "FUTSAL" : db.sport_type === "SOCCER" ? "SOCCER" : null) as "SOCCER" | "FUTSAL" | null,
    playerCount: db.player_count ?? undefined,
    statsIncluded: db.stats_included ?? true,
  };
}

// 시안 카드용 — matchType별 hue + 라벨 매핑
function matchTypeMeta(type: Match["matchType"]): { label: string; hue: "atk" | "def" | "mid" } {
  switch (type) {
    case "INTERNAL":
      return { label: "자체", hue: "def" };
    case "EVENT":
      return { label: "이벤트", hue: "mid" };
    default:
      return { label: "정규", hue: "atk" };
  }
}

export type UniformSetInfo = { primary: string; secondary: string; pattern: string };
type TeamUniform = { primary: string | null; secondary: string | null; pattern: string | null; uniforms?: { home?: UniformSetInfo; away?: UniformSetInfo; third?: UniformSetInfo | null } | null };

export default function MatchesClient({ userId, userRole, initialMatches, sportType = "SOCCER", teamUniform, inviteCode = "", teamName = "", registeredMemberCount = 0, teamDefaultPlayerCount }: { userId: string; userRole?: Role; initialMatches?: { matches: DbMatch[] }; sportType?: SportType; teamUniform?: TeamUniform; inviteCode?: string; teamName?: string; registeredMemberCount?: number; teamDefaultPlayerCount?: number }) {
  const { effectiveRole } = useViewAsRole();
  const role = effectiveRole(userRole);
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

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

  // 경기별 종목 — 팀 sport_type 기본값으로 시작, 폼 안에서 변경 가능
  const [matchSportType, setMatchSportType] = useState<SportType>(sportType);
  const defaults = SPORT_DEFAULTS[matchSportType];
  const isFutsal = matchSportType === "FUTSAL";

  const [viewMode, setViewMode] = useLocalStorage<"list" | "calendar">("pm:matches:viewMode", "list");
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const viewMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!viewMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (viewMenuRef.current && !viewMenuRef.current.contains(e.target as Node)) {
        setViewMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setViewMenuOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [viewMenuOpen]);
  const [isOpen, setIsOpen] = useState(searchParams.get("create") === "true");
  // 경기 등록 직후 1인 팀 초대 CTA 모달
  const [inviteCtaMatchId, setInviteCtaMatchId] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [votingMatchId, setVotingMatchId] = useState<string | null>(null);
  // 로딩 스피너·흔들림: "matchId:vote" 키
  const [loadingVoteKey, setLoadingVoteKey] = useState<string | null>(null);
  const [shakeVoteKey, setShakeVoteKey] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [now, setNow] = useState<number>(0);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setNow(Date.now()); }, []);
  const today = now ? new Date(now).toISOString().split("T")[0] : "";
  const [matchDate, setMatchDate] = useState(today);
  // today가 설정되면 matchDate 동기화
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (today && !matchDate) setMatchDate(today); }, [today, matchDate]);
  const [matchTime, setMatchTime] = useState("09:00");
  const [matchEndTime, setMatchEndTime] = useState("11:00");
  const [showEndDate, setShowEndDate] = useState(false);
  const [location, setLocation] = useState("");
  const [voteDeadline, setVoteDeadline] = useState("");

  // matchDate 변경 시 투표 마감일 자동 계산 (경기 전날 17시)
  useEffect(() => {
    if (!matchDate) return;
    const prev = new Date(matchDate + "T00:00:00");
    prev.setDate(prev.getDate() - 1);
    const yyyy = prev.getFullYear();
    const mm = String(prev.getMonth() + 1).padStart(2, "0");
    const dd = String(prev.getDate()).padStart(2, "0");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVoteDeadline(`${yyyy}-${mm}-${dd}T17:00`);
  }, [matchDate]);
  const [playerCount, setPlayerCount] = useState(teamDefaultPlayerCount ?? defaults.playerCount);
  const [matchType, setMatchType] = useState<"REGULAR" | "INTERNAL" | "EVENT">("REGULAR");
  const [statsIncluded, setStatsIncluded] = useState(true);
  const [uniformType, setUniformType] = useState<"HOME" | "AWAY" | "THIRD">("HOME");
  const [deadlineAuto, setDeadlineAuto] = useState(true);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    if (isOpen) {
      window.addEventListener("beforeunload", handleBeforeUnload);
      return () => { window.removeEventListener("beforeunload", handleBeforeUnload); };
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

  // 자주 사용하는 시간 목록 (기존 경기에서 추출, 빈도순 최대 5개)
  const recentTimes = useMemo(() => {
    const times = (matchesData.matches ?? [])
      .map((m) => m.match_time)
      .filter((t): t is string => !!t && /^\d{1,2}:\d{2}/.test(t))
      .map((t) => t.slice(0, 5)); // "HH:MM:SS" → "HH:MM"
    if (times.length === 0) return [];
    const counts = new Map<string, number>();
    times.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1));
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([time]) => time);
  }, [matchesData.matches]);

  const matches: Match[] = useMemo(
    () => (matchesData.matches ?? []).map(mapDbMatchToMatch),
    [matchesData.matches]
  );

  // 멤버 목록 (투표 필터링용)
  const {
    data: teamMembersData,
  } = useApi<{ members: { id: string; user_id: string | null; status: "ACTIVE" | "DORMANT" | "BANNED" }[] }>("/api/members", { members: [] });

  // 경기별 matchType 룩업 — EVENT는 휴면 회원도 카운트 (홈·매치 상세와 동일 정책)
  const matchTypeById = useMemo(() => {
    const map: Record<string, "REGULAR" | "INTERNAL" | "EVENT"> = {};
    for (const m of matches) map[m.id] = m.matchType;
    return map;
  }, [matches]);

  const attendance: AttendanceState = useMemo(() => {
    const state: AttendanceState = {};
    const activeMemberIds = new Set(
      teamMembersData.members.filter((m) => m.status === "ACTIVE").map((m) => m.id),
    );
    const allMemberIds = new Set(teamMembersData.members.map((m) => m.id));
    const userToMember = new Map(teamMembersData.members.filter((m) => m.user_id).map((m) => [m.user_id!, m.id]));

    for (const row of attendanceData.attendance ?? []) {
      if (!state[row.match_id]) state[row.match_id] = {};
      // member_id로 정규화 (경기 상세와 동일)
      let key: string | null = null;
      if (row.member_id && allMemberIds.has(row.member_id)) {
        key = row.member_id;
      } else if (row.user_id) {
        key = userToMember.get(row.user_id) ?? null;
      }
      if (!key) continue;
      // 카운트 대상 멤버 필터 — EVENT만 휴면 회원 포함, 그 외(REGULAR/INTERNAL)는 ACTIVE만
      const countable = matchTypeById[row.match_id] === "EVENT" ? allMemberIds : activeMemberIds;
      if (countable.has(key)) state[row.match_id][key] = row.vote;
    }
    return state;
  }, [attendanceData.attendance, teamMembersData.members, matchTypeById]);

  // 현재 로그인 사용자의 team_member.id — attendance 상태가 memberId 키라 본인 투표 조회에 필요
  const myMemberId = useMemo(
    () => teamMembersData.members.find((m) => m.user_id === userId)?.id ?? null,
    [teamMembersData.members, userId],
  );

  // TEMP: 디자인 검토용 — 김선휘만 ?previewEmpty=1로 빈 상태 hero 강제 노출
  const DESIGN_PREVIEW_USER_ID = "7bc8a1b2-7844-41f3-b592-05a2c38f8085";
  const previewEmpty =
    searchParams.get("previewEmpty") === "1" && userId === DESIGN_PREVIEW_USER_ID;

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

  // 시안 카드용 — 다가오는·지난 분리 (sortedMatches에서 derive)
  const { upcomingMatches, pastMatches } = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const upcoming: Match[] = [];
    const past: Match[] = [];
    for (const m of sortedMatches) {
      if (m.date < today || m.status === "COMPLETED") past.push(m);
      else upcoming.push(m);
    }
    return { upcomingMatches: upcoming, pastMatches: past };
  }, [sortedMatches]);

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
      endTime: String(formData.get("endTime") || "") || undefined,
      location: String(formData.get("location") || ""),
      opponent: matchType === "INTERNAL" ? null : String(formData.get("opponent") || ""),
      quarterCount: matchType === "EVENT" ? 1 : Number(formData.get("quarterCount") || defaults.quarters),
      quarterDuration: matchType === "EVENT" ? 0 : Number(formData.get("quarterDuration") || defaults.duration),
      breakDuration: matchType === "EVENT" ? 0 : Number(formData.get("breakDuration") || defaults.breakTime),
      playerCount,
      voteDeadline: String(formData.get("voteDeadline") || "") || undefined,
      matchType,
      sportType: matchType === "EVENT" ? undefined : matchSportType,
      statsIncluded: matchType === "EVENT" ? false : statsIncluded,
      endDate: matchType === "EVENT" ? (String(formData.get("endDate") || "") || undefined) : undefined,
      uniformType,
    };
    const { error, data } = await apiMutate<{ id: string }>("/api/matches", "POST", body);
    setSubmitting(false);
    if (!error) {
      GA.matchCreate(body.matchType ?? "REGULAR");
      showToast("경기 일정이 등록되었습니다.");
      // 가입 완료 멤버가 1명 이하(=회장만) + 초대 코드 있음 → 초대 CTA 모달
      if (data?.id && registeredMemberCount <= 1 && inviteCode) {
        setIsOpen(false);
        setInviteCtaMatchId(data.id);
      } else if (data?.id) {
        router.push(`/matches/${data.id}`);
      } else {
        await refetchMatches();
        setIsOpen(false);
      }
    } else {
      showToast(toKoreanError(error), "error");
    }
  }

  /** 초대 CTA 모달 — 링크 복사 */
  async function handleCopyInvite() {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/team?code=${inviteCode}`;
    try {
      await navigator.clipboard.writeText(url);
      setInviteCopied(true);
      showToast("초대 링크가 복사되었습니다");
    } catch {
      showToast("복사에 실패했습니다", "error");
    }
  }

  /** 초대 CTA 모달 — 카카오 공유 */
  async function handleKakaoInvite() {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/team?code=${inviteCode}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${teamName || "우리 팀"} 초대`,
          text: `${teamName || "우리 팀"}에 초대합니다. 링크를 눌러 가입해주세요.`,
          url,
        });
      } else {
        await handleCopyInvite();
      }
    } catch {
      // 사용자 취소는 무시
    }
  }

  /** 초대 CTA 모달 — 닫고 경기 상세로 이동 */
  function closeInviteCta() {
    const mid = inviteCtaMatchId;
    setInviteCtaMatchId(null);
    setInviteCopied(false);
    if (mid) router.push(`/matches/${mid}`);
  }

  async function handleVote(matchId: string, vote: AttendanceVote) {
    const key = `${matchId}:${vote}`;
    setVotingMatchId(matchId);
    setLoadingVoteKey(key);
    const { error } = await apiMutate("/api/attendance", "POST", { matchId, vote });
    setVotingMatchId(null);
    setLoadingVoteKey(null);
    if (!error) {
      GA.voteComplete(vote, "match_list");
      await refetchAttendance();
      showToast("참석 의사를 저장했습니다.");
    } else {
      setShakeVoteKey(key);
      setTimeout(() => setShakeVoteKey(null), 500);
      showToast(toKoreanError(error), "error");
    }
  }

  if (matchesError) {
    return (
      <div className="pm-mform" style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <span style={{ color: "hsl(var(--destructive))", fontSize: 14 }}>오류: {toKoreanError(matchesError)}</span>
        <button
          type="button"
          className="pm-chip-pill"
          onClick={refetchMatches}
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (matchesLoading || attendanceLoading) {
    return (
      <div className="grid gap-5">
        <div className="pm-pagehead">
          <div className="pm-pagehead-row">
            <Skeleton className="h-7 w-24" />
            <div className="pm-pagehead-actions">
              <Skeleton className="h-9 w-24 rounded-lg" />
              <Skeleton className="h-9 w-24 rounded-lg" />
            </div>
          </div>
        </div>
        <div className="grid gap-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="pm-match-card pm-hue--atk"
              style={{ pointerEvents: "none" }}
            >
              <div className="pm-mc-head">
                <Skeleton className="h-5 w-12 rounded" />
                <Skeleton className="h-6 w-5 rounded-sm" />
              </div>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="pm-pagehead">
        <div className="pm-pagehead-row">
          <div className="pm-pagehead-title-wrap">
            <h1 className="pm-toolbar-title">경기 일정</h1>
            <span className="pm-pagehead-total">{sortedMatches.length}</span>
          </div>
          <div className="pm-pagehead-actions">
            <div className="pm-view-select" ref={viewMenuRef} data-open={viewMenuOpen || undefined}>
              <button
                type="button"
                className="pm-view-select-trigger"
                aria-haspopup="listbox"
                aria-expanded={viewMenuOpen}
                onClick={() => setViewMenuOpen((o) => !o)}
              >
                <span className="pm-view-select-icon" aria-hidden>
                  {viewMode === "list" ? (
                    <svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 3.5h10M2 7h10M2 10.5h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 14 14"><rect x="2" y="3" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none" /><path d="M2 6h10M5 2v2M9 2v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                  )}
                </span>
                <span>{viewMode === "list" ? "목록" : "캘린더"}</span>
                <ChevronDown width={14} height={14} className="pm-view-select-caret" aria-hidden />
              </button>
              {viewMenuOpen && (
                <div className="pm-view-menu" role="listbox" aria-label="뷰 전환">
                  {([
                    { v: "list" as const, label: "목록", icon: <svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 3.5h10M2 7h10M2 10.5h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg> },
                    { v: "calendar" as const, label: "캘린더", icon: <svg width="14" height="14" viewBox="0 0 14 14"><rect x="2" y="3" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none" /><path d="M2 6h10M5 2v2M9 2v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg> },
                  ]).map((opt) => (
                    <button
                      key={opt.v}
                      type="button"
                      role="option"
                      aria-selected={viewMode === opt.v}
                      className={cn("pm-view-menu-item", viewMode === opt.v && "is-on")}
                      onClick={() => { setViewMode(opt.v); setViewMenuOpen(false); }}
                    >
                      <span className="pm-view-menu-item-icon" aria-hidden>{opt.icon}</span>
                      <span>{opt.label}</span>
                      {viewMode === opt.v && (
                        <span className="pm-view-menu-item-check" aria-hidden>
                          <svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 7l3 3 5-6" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {isStaffOrAbove(role) && (
              <button
                type="button"
                className="pm-cta-primary"
                onClick={() => { setIsOpen(true); setFormErrors({}); }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                  <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                일정 등록
              </button>
            )}
          </div>
        </div>
      </div>

      {viewMode === "calendar" ? (
        <div className="pm-mform" style={{ padding: 12 }}>
          <MatchCalendar
            matches={sortedMatches.map((m) => {
              const matchVotes = Object.values(attendance[m.id] ?? {});
              return {
                id: m.id,
                date: m.date,
                time: m.time,
                endTime: m.endTime,
                endDate: m.endDate,
                location: m.location,
                opponent: m.opponent,
                status: m.status,
                score: m.score,
                matchType: m.matchType,
                voteDeadline: m.voteDeadline ?? null,
                attendCount: matchVotes.filter((v) => v === "ATTEND").length,
                absentCount: matchVotes.filter((v) => v === "ABSENT").length,
                maybeCount: matchVotes.filter((v) => v === "MAYBE").length,
              };
            })}
            myVotes={Object.fromEntries(
              sortedMatches.map((m) => [m.id, (myMemberId ? attendance[m.id]?.[myMemberId] : undefined) ?? ""])
                .filter(([, v]) => v)
            )}
            onVote={handleVote}
            votingMatchId={votingMatchId}
            loadingVoteKey={loadingVoteKey}
            shakeVoteKey={shakeVoteKey}
          />
        </div>
      ) : (
      <section className="grid gap-4">
        {(sortedMatches.length === 0 || previewEmpty) && (
          <div className="pm-paste-hero">
            <div className="pm-amb" aria-hidden />
            <div className="pm-hero-inner">
              <div className="pm-chip" style={{ marginTop: 0 }}>
                <span className="pm-chip-dot" />
                <span>경기 시작</span>
              </div>
              <h2 className="pm-h1 pm-h1--hero">첫 경기를 만들어 보세요.</h2>
              <p className="pm-sub" style={{ marginBottom: 4 }}>
                등록하면 팀원에게 자동으로<br />
                참석 투표 알림이 갑니다.
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

              {isStaffOrAbove(role) && (
                <button
                  type="button"
                  className="pm-paste-cta"
                  onClick={() => setIsOpen(true)}
                >
                  <span className="pm-paste-cta-icon" aria-hidden>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <rect
                        x="3.5"
                        y="4.5"
                        width="13"
                        height="12"
                        rx="2"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M3.5 8h13M7 3v3M13 3v3"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      <path
                        d="M10 11v3M8.5 12.5h3"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                  <div className="pm-paste-cta-body">
                    <div className="pm-paste-cta-label">새 경기 만들기</div>
                    <div className="pm-paste-cta-sub">투표 알림 자동 발송</div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                    <path
                      d="M3 7h8M8 4l3 3-3 3"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}
        {/* 다가오는 경기 — 시안 UpcomingCard */}
        {upcomingMatches.length > 0 && (
          <section className="pm-section">
            <div className="pm-section-h">
              <span>다가오는 경기</span>
              <span className="pm-section-count">{upcomingMatches.length}경기</span>
            </div>
            <div className="pm-match-stack">
              {upcomingMatches.map((match) => {
                const meta = matchTypeMeta(match.matchType);
                const vote = myMemberId ? attendance[match.id]?.[myMemberId] : undefined;
                const matchVotes = Object.values(attendance[match.id] ?? {});
                const attendCount = matchVotes.filter((v) => v === "ATTEND").length;
                const absentCount = matchVotes.filter((v) => v === "ABSENT").length;
                const maybeCount = matchVotes.filter((v) => v === "MAYBE").length;
                const totalVotes = attendCount + absentCount + maybeCount;
                const isVoteClosed = match.voteDeadline
                  ? new Date(match.voteDeadline) <= new Date()
                  : false;
                return (
                  <div
                    key={match.id}
                    className={`pm-match-card pm-hue--${meta.hue}`}
                  >
                    {/* head — type 배지 + 우측: EVENT 라벨 또는 유니폼 dot */}
                    <header className="pm-mc-head">
                      <span className="pm-mc-type">{meta.label}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {match.matchType === "EVENT" && (
                          <span className="pm-mc-rel">팀 일정</span>
                        )}
                        {match.matchType !== "EVENT" && (() => {
                          const u = teamUniform?.uniforms;
                          let primary: string, secondary: string, pattern: string;
                          if (match.uniformType === "THIRD" && u?.third) {
                            primary = u.third.primary; secondary = u.third.secondary; pattern = u.third.pattern;
                          } else if (match.uniformType === "AWAY" && u?.away) {
                            primary = u.away.primary; secondary = u.away.secondary; pattern = u.away.pattern;
                          } else if (u?.home) {
                            primary = u.home.primary; secondary = u.home.secondary; pattern = u.home.pattern;
                          } else {
                            primary = teamUniform?.primary ?? "hsl(var(--primary))";
                            secondary = teamUniform?.secondary ?? "hsl(var(--muted-foreground))";
                            pattern = teamUniform?.pattern ?? "SOLID";
                          }
                          return (
                            <span
                              className="h-6 w-5 shrink-0 border border-foreground/20 rounded-sm"
                              style={{
                                ...getUniformStyle(primary, secondary, pattern),
                                clipPath:
                                  "polygon(12% 12%, 30% 12%, 34% 0%, 66% 0%, 70% 12%, 88% 12%, 100% 34%, 86% 48%, 86% 100%, 14% 100%, 14% 48%, 0% 34%)",
                              }}
                              aria-label="유니폼"
                            />
                          );
                        })()}
                      </div>
                    </header>

                    {/* 클릭 영역 — 상세 페이지로 이동 */}
                    <Link
                      href={`/matches/${match.id}`}
                      className="flex flex-col gap-3"
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      {/* when — 날짜 + 시간 */}
                      <div className="pm-mc-when">
                        <div className="pm-mc-day">{formatMatchDate(match.date)}</div>
                        <div className="pm-mc-time">
                          {formatTime(match.time)}
                          {match.endTime && <> – {formatTime(match.endTime)}</>}
                        </div>
                      </div>

                      {/* where — 상대팀 + 장소 + 풋살 배지 + 유니폼 */}
                      <div className="pm-mc-where">
                        {match.matchType === "REGULAR" && match.opponent && (
                          <div className="pm-mc-opp">
                            <span className="pm-mc-vs">vs</span>
                            <span>{match.opponent}</span>
                            {match.sportType === "FUTSAL" && (
                              <span
                                className="pm-mc-type"
                                style={{
                                  fontSize: 10,
                                  marginLeft: 4,
                                  padding: "2px 6px",
                                }}
                              >
                                풋살
                              </span>
                            )}
                          </div>
                        )}
                        {match.matchType === "INTERNAL" && (
                          <div className="pm-mc-opp pm-mc-opp--mute">우리끼리 자체전</div>
                        )}
                        {match.matchType === "EVENT" && (
                          <div className="pm-mc-opp pm-mc-opp--mute">
                            {match.opponent || "팀 이벤트"}
                          </div>
                        )}
                        {match.location && (
                          <div className="pm-mc-venue">
                            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
                              <path
                                d="M6 1c-2 0-3.5 1.5-3.5 3.4 0 2.4 3.5 6.6 3.5 6.6s3.5-4.2 3.5-6.6C9.5 2.5 8 1 6 1z"
                                stroke="currentColor"
                                strokeWidth="1.2"
                                fill="none"
                              />
                              <circle cx="6" cy="4.5" r="1.3" stroke="currentColor" strokeWidth="1.1" fill="none" />
                            </svg>
                            <span>{match.location}</span>
                          </div>
                        )}
                      </div>

                      {/* vote progress bar */}
                      <div className="pm-vote">
                        {totalVotes === 0 ? (
                          <>
                            <div className="pm-vote-bar pm-vote-bar--empty" />
                            <div className="pm-vote-counts">
                              <span className="pm-vote-empty">아직 투표가 없어요</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="pm-vote-bar">
                              <span
                                className="pm-vote-yes"
                                style={{ width: `${(attendCount / totalVotes) * 100}%` }}
                              />
                              <span
                                className="pm-vote-no"
                                style={{ width: `${(absentCount / totalVotes) * 100}%` }}
                              />
                              <span
                                className="pm-vote-maybe"
                                style={{ width: `${(maybeCount / totalVotes) * 100}%` }}
                              />
                            </div>
                            <div className="pm-vote-counts">
                              <span>
                                <span className="pm-statusdot pm-statusdot--success" /> 참석 {attendCount}
                              </span>
                              <span>
                                <span className="pm-statusdot pm-statusdot--destructive" /> 불참 {absentCount}
                              </span>
                              <span>
                                <span className="pm-statusdot pm-statusdot--warning" /> 미정 {maybeCount}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </Link>

                    {/* footer — inline 투표 버튼 + 공유 (기존 기능 보존) */}
                    <div
                      className="pm-mc-foot"
                      style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}
                    >
                      {isVoteClosed ? (
                        <div
                          style={{
                            fontSize: 12,
                            color: "hsl(var(--muted-foreground))",
                            textAlign: "center",
                            padding: "8px 0",
                          }}
                        >
                          투표 마감
                          {vote && (
                            <> · 내 투표: {vote === "ATTEND" ? "참석" : vote === "ABSENT" ? "불참" : "미정"}</>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {(
                            [
                              { value: "ATTEND" as const, label: "참석" },
                              { value: "MAYBE" as const, label: "미정" },
                              { value: "ABSENT" as const, label: "불참" },
                            ]
                          ).map((item) => {
                            const isSelected = vote === item.value;
                            const key = `${match.id}:${item.value}`;
                            const isLoading = loadingVoteKey === key;
                            const isShaking = shakeVoteKey === key;
                            return (
                              <button
                                key={item.value}
                                type="button"
                                disabled={votingMatchId === match.id}
                                className={cn(
                                  "relative flex-1 rounded-lg py-1.5 text-sm font-semibold transition-all duration-200 active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-1",
                                  isSelected ? voteStyles[item.value].active : "border border-border text-muted-foreground hover:bg-secondary",
                                  isShaking && "animate-shake ring-2 ring-destructive",
                                )}
                                onClick={() => handleVote(match.id, item.value)}
                              >
                                {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                {item.label}
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            className="shrink-0 rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                            onClick={() =>
                              shareVoteLink({
                                matchId: match.id,
                                date: match.date,
                                time: match.time,
                                location: match.location,
                                opponent: match.opponent,
                                matchType: match.matchType,
                              })
                            }
                            aria-label="공유"
                          >
                            <Share2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                      {match.voteDeadline && !isVoteClosed && (
                        <div className="pm-mc-deadline" style={{ textAlign: "center" }}>
                          투표 마감 · {formatMatchDate(match.voteDeadline.split("T")[0])}{" "}
                          {match.voteDeadline.split("T")[1]?.slice(0, 5)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 지난 경기 — 시안 PastCard */}
        {pastMatches.length > 0 && (
          <section className="pm-section">
            <div className="pm-section-h">
              <span>지난 경기</span>
              <span className="pm-section-count">{pastMatches.length}경기</span>
            </div>
            <div className="pm-past-stack">
              {pastMatches.map((match) => {
                const meta = matchTypeMeta(match.matchType);
                const score = match.score
                  ? match.score.split(":").map((s) => parseInt(s.trim(), 10))
                  : null;
                const won = score && match.matchType !== "INTERNAL" && score[0] > score[1];
                const drew = score && score[0] === score[1];
                const resultClass = score
                  ? match.matchType === "INTERNAL"
                    ? ""
                    : won
                    ? "is-win"
                    : drew
                    ? "is-draw"
                    : "is-loss"
                  : "";
                const resultMark = score
                  ? match.matchType === "INTERNAL"
                    ? ""
                    : won
                    ? "승"
                    : drew
                    ? "무"
                    : "패"
                  : "";
                return (
                  <Link
                    key={match.id}
                    href={`/matches/${match.id}`}
                    className={`pm-past-card pm-hue--${meta.hue}`}
                    style={{ textDecoration: "none" }}
                  >
                    <div className="pm-past-head">
                      <span className="pm-past-type">{meta.label}</span>
                      <span className="pm-past-date">{formatMatchDate(match.date)}</span>
                    </div>
                    <div className="pm-past-body">
                      <div className="pm-past-opp">
                        {match.matchType === "REGULAR" && match.opponent
                          ? `vs ${match.opponent}`
                          : match.matchType === "INTERNAL"
                          ? "자체전"
                          : match.opponent || "팀 이벤트"}
                      </div>
                      {score ? (
                        <div className={`pm-past-score ${resultClass}`}>
                          <span className="pm-past-num">{score[0]}</span>
                          <span className="pm-past-dash">–</span>
                          <span className="pm-past-num">{score[1]}</span>
                          {resultMark && <span className="pm-past-mark">{resultMark}</span>}
                        </div>
                      ) : (
                        <div className="pm-past-score pm-past-score--empty">결과 미기록</div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </section>
      )}

      {/* 새 경기 만들기 모달 — 시안 톤 */}
      <Modal open={isOpen} onClose={() => { setIsOpen(false); setFormErrors({}); }} ariaLabel="새 경기 만들기">
        <div className="pm-modal pm-page">
          <header className="pm-modal-head">
            <div className="pm-modal-steps">
              <span className="pm-mstep is-on" style={{ width: "100%" }} />
            </div>
            <button
              type="button"
              className="pm-welcome-close"
              onClick={() => { setIsOpen(false); setFormErrors({}); }}
              style={{ position: "static" }}
              aria-label="닫기"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </header>

          <h2 className="pm-modal-h">새 경기 만들기</h2>
          <p className="pm-sub">등록 즉시 팀원에게 참석 투표 알림이 자동으로 발송돼요.</p>

          <form className="pm-form" action={(formData) => handleCreate(formData)}>
            {/* 경기 종류 */}
            <div className="pm-field">
              <div className="pm-label"><span>경기 종류</span></div>
              <div className="pm-type-row">
                {([
                  { type: "REGULAR" as const, label: "정규", sub: "상대팀", hue: "atk" as const },
                  { type: "INTERNAL" as const, label: "자체", sub: "우리끼리", hue: "def" as const },
                  { type: "EVENT" as const, label: "이벤트", sub: "MT·회식", hue: "mid" as const },
                ]).map((o) => (
                  <button
                    key={o.type}
                    type="button"
                    onClick={() => { setMatchType(o.type); if (o.type === "EVENT") setStatsIncluded(false); }}
                    className={cn("pm-type-opt", `pm-hue--${o.hue}`, matchType === o.type && "is-on")}
                  >
                    <div className="pm-type-opt-label">{o.label}</div>
                    <div className="pm-type-opt-sub">{o.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 종목 — EVENT 제외 */}
            {matchType !== "EVENT" && (
              <div className="pm-field">
                <div className="pm-label"><span>종목</span></div>
                <div className="pm-type-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
                  {([
                    { type: "SOCCER" as const, label: "축구", sub: "11인제", hue: "atk" as const },
                    { type: "FUTSAL" as const, label: "풋살", sub: "5·6인제", hue: "def" as const },
                  ]).map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => {
                        setMatchSportType(item.type);
                        setPlayerCount(SPORT_DEFAULTS[item.type].playerCount);
                      }}
                      className={cn("pm-type-opt", `pm-hue--${item.hue}`, matchSportType === item.type && "is-on")}
                    >
                      <div className="pm-type-opt-label">{item.label}</div>
                      <div className="pm-type-opt-sub">{item.sub}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 날짜 */}
            <div className="pm-field">
              <div className="pm-label">
                <span>날짜</span>
                <span className="pm-pill pm-pill--req">필수</span>
              </div>
              <input
                id="date"
                name="date"
                type="date"
                required
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
                className={cn("pm-input", formErrors.matchDate && "is-error")}
              />
              {formErrors.matchDate && <p className="pm-mform-err">{formErrors.matchDate}</p>}
            </div>

            {/* 시간 */}
            <div className="pm-field">
              <div className="pm-label">
                <span>{matchType === "EVENT" ? "시작 시간" : "시간"}</span>
                <span className="pm-pill pm-pill--req">필수</span>
              </div>
              <div className="pm-time-row">
                <input
                  id="time"
                  name="time"
                  type="time"
                  required
                  value={matchTime}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMatchTime(val);
                    if (matchType !== "EVENT" && val) {
                      const [hh, mm] = val.split(":").map(Number);
                      const endH = String((hh + 2) % 24).padStart(2, "0");
                      setMatchEndTime(`${endH}:${String(mm).padStart(2, "0")}`);
                    }
                  }}
                  className="pm-input"
                />
                {matchType !== "EVENT" ? (
                  <>
                    <span className="pm-time-dash">–</span>
                    <input
                      id="endTime"
                      name="endTime"
                      type="time"
                      value={matchEndTime}
                      onChange={(e) => setMatchEndTime(e.target.value)}
                      className="pm-input"
                    />
                  </>
                ) : <div />}
              </div>
              {recentTimes.length > 0 && (
                <div className="pm-mform-chips" style={{ marginTop: 4 }}>
                  <span className="pm-mform-hint" style={{ marginRight: 2 }}>자주:</span>
                  {recentTimes.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setMatchTime(t);
                        if (matchType !== "EVENT") {
                          const [hh, mm] = t.split(":").map(Number);
                          const endH = String((hh + 2) % 24).padStart(2, "0");
                          setMatchEndTime(`${endH}:${String(mm).padStart(2, "0")}`);
                        }
                      }}
                      className={cn("pm-chip-pill", matchTime === t && "is-on")}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 상대팀 / 일정 제목 — INTERNAL 제외 노출 */}
            {matchType !== "INTERNAL" && (
              <div className="pm-field">
                <div className="pm-label">
                  <span>{matchType === "EVENT" ? "일정 제목" : "상대팀"}</span>
                  {matchType === "EVENT" || matchType === "REGULAR" ? (
                    matchType === "EVENT"
                      ? <span className="pm-pill pm-pill--req">필수</span>
                      : <span className="pm-pill pm-pill--opt">선택</span>
                  ) : null}
                </div>
                <input
                  id="opponent"
                  name="opponent"
                  className="pm-input"
                  required={matchType === "EVENT"}
                  placeholder={matchType === "EVENT" ? "예: 연말 회식, MT, 유니폼 주문" : "예: FC 강남"}
                />
              </div>
            )}

            {/* 장소 */}
            <div className="pm-field">
              <div className="pm-label">
                <span>장소</span>
                <span className="pm-pill pm-pill--opt">선택</span>
              </div>
              <input
                id="location"
                name="location"
                value={location}
                onChange={(e) => { setLocation(e.target.value); setFormErrors((prev) => ({ ...prev, location: "" })); }}
                placeholder={recentLocations[0] ?? "예: 어린이대공원 축구장"}
                className={cn("pm-input", formErrors.location && "is-error")}
              />
              {formErrors.location && <p className="pm-mform-err">{formErrors.location}</p>}
              {recentLocations.length > 0 && (
                <div className="pm-mform-chips" style={{ marginTop: 4 }}>
                  <span className="pm-mform-hint" style={{ marginRight: 2 }}>자주:</span>
                  {recentLocations.slice(0, 5).map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setLocation(loc)}
                      className={cn("pm-chip-pill", location === loc && "is-on")}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 투표 마감 */}
            <div className="pm-field">
              <div className="pm-label">
                <span>투표 마감</span>
                <span className="pm-pill pm-pill--opt">{deadlineAuto ? "자동" : "직접"}</span>
              </div>
              <div className="pm-deadline">
                <div className="pm-deadline-auto">
                  {deadlineAuto ? (
                    <>
                      <span className="pm-deadline-val">{voteDeadline ? voteDeadline.replace("T", " ") : "날짜를 먼저 입력하세요"}</span>
                      <span className="pm-deadline-hint">{matchType === "EVENT" ? "일정" : "경기"} 전날 17시 (자동)</span>
                      <input type="hidden" name="voteDeadline" value={voteDeadline} />
                    </>
                  ) : (
                    <input
                      id="voteDeadline"
                      name="voteDeadline"
                      type="datetime-local"
                      value={voteDeadline}
                      onChange={(e) => setVoteDeadline(e.target.value)}
                      className="pm-input"
                    />
                  )}
                </div>
                <button
                  type="button"
                  className="pm-deadline-toggle"
                  onClick={() => setDeadlineAuto((a) => !a)}
                >
                  {deadlineAuto ? "직접 조정" : "자동으로"}
                </button>
              </div>
            </div>

            {/* 유니폼 — EVENT 제외 */}
            {matchType !== "EVENT" && (
              <div className="pm-field">
                <div className="pm-label">
                  <span>유니폼</span>
                  <span className="pm-pill pm-pill--opt">선택</span>
                </div>
                {(() => {
                  const opts: Array<{ v: "HOME" | "AWAY" | "THIRD"; label: string }> = [
                    { v: "HOME", label: "홈" },
                    { v: "AWAY", label: "어웨이" },
                  ];
                  if (teamUniform?.uniforms?.third) opts.push({ v: "THIRD", label: "서드" });
                  return (
                    <div
                      className="pm-seg"
                      role="radiogroup"
                      aria-label="유니폼 선택"
                      style={{ gridTemplateColumns: `repeat(${opts.length}, 1fr)` }}
                    >
                      {opts.map((o) => (
                        <button
                          key={o.v}
                          type="button"
                          role="radio"
                          aria-checked={uniformType === o.v}
                          className={cn("pm-seg-opt", uniformType === o.v && "is-on")}
                          onClick={() => setUniformType(o.v)}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* EVENT 1박 이상 일정 */}
            {matchType === "EVENT" && (
              <div className="pm-field">
                <label className="pm-mform-check">
                  <input
                    type="checkbox"
                    id="multiDay"
                    checked={showEndDate}
                    onChange={(e) => setShowEndDate(e.target.checked)}
                  />
                  <span>1박 이상 일정</span>
                </label>
                {showEndDate && (
                  <input id="endDate" name="endDate" type="date" className="pm-input" style={{ marginTop: 8 }} />
                )}
              </div>
            )}

            {/* 상세 설정 ▼ — 종목 · 최근 시간/장소 · 쿼터 · 인원 · INTERNAL stats */}
            {matchType !== "EVENT" && (
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="pm-mform-adv-toggle"
              >
                {showAdvanced ? (
                  <>상세 설정 접기 <ChevronUp className="inline h-3.5 w-3.5" aria-hidden="true" /></>
                ) : (
                  <>상세 설정 <ChevronDown className="inline h-3.5 w-3.5" aria-hidden="true" /></>
                )}
              </button>
            )}
            {showAdvanced && matchType !== "EVENT" && (
              <div key={matchSportType} className="pm-form animate-slide-down" style={{ marginTop: 0 }}>
                {/* 쿼터 수·시간·휴식 */}
                <div className="pm-mform-grid3">
                  <div className="pm-field">
                    <div className="pm-label"><span>쿼터 수</span></div>
                    <input id="quarterCount" name="quarterCount" type="number" min={1} max={12} defaultValue={defaults.quarters} className="pm-input" />
                  </div>
                  <div className="pm-field">
                    <div className="pm-label"><span>쿼터 시간 (분)</span></div>
                    <input id="quarterDuration" name="quarterDuration" type="number" min={10} max={40} defaultValue={defaults.duration} className="pm-input" />
                  </div>
                  <div className="pm-field">
                    <div className="pm-label"><span>휴식 (분)</span></div>
                    <input id="breakDuration" name="breakDuration" type="number" min={0} max={15} defaultValue={defaults.breakTime} className="pm-input" />
                  </div>
                </div>

                {/* 참가 인원 */}
                <div className="pm-field">
                  <div className="pm-label"><span>참가 인원</span></div>
                  <div className="pm-select">
                    <select
                      id="playerCount"
                      name="playerCount"
                      value={String(playerCount)}
                      onChange={(e) => setPlayerCount(Number(e.target.value))}
                    >
                      {(isFutsal ? [3, 4, 5, 6] : [8, 9, 10, 11]).map((n) => (
                        <option key={n} value={n}>{n}:{n} (GK 포함 {n}명)</option>
                      ))}
                    </select>
                    <ChevronDown width={14} height={14} aria-hidden />
                  </div>
                </div>

                {/* INTERNAL stats included */}
                {matchType === "INTERNAL" && (
                  <label className="pm-mform-check">
                    <input
                      type="checkbox"
                      id="statsIncluded"
                      checked={statsIncluded}
                      onChange={(e) => setStatsIncluded(e.target.checked)}
                    />
                    <span>개인 기록 통계에 반영</span>
                  </label>
                )}
              </div>
            )}

            {/* CTA */}
            <button type="submit" disabled={submitting} className="pm-cta">
              {submitting ? "저장 중..." : (
                <>
                  경기 등록 · 투표 알림 발송
                  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
                    <path d="M3 8 L13 8 M9 4 L13 8 L9 12" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </>
              )}
            </button>
            <p className="pm-cta-sub">미참여 회원에게는 마감 1일 전 리마인더가 갑니다.</p>
          </form>
        </div>
      </Modal>

      {/* 1인 팀 초대 CTA 모달 — 경기 등록 직후 표시 */}
      <Modal open={!!inviteCtaMatchId} onClose={closeInviteCta} ariaLabel="초대 안내">
        <div className="pm-modal pm-page">
          <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 4 }}>
            <div
              style={{
                width: 44, height: 44, borderRadius: 999,
                background: "hsl(var(--primary) / 0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22,
              }}
              aria-hidden
            >
              🎉
            </div>
            <div style={{ minWidth: 0 }}>
              <p className="pm-card-title" style={{ fontSize: 17 }}>경기가 등록되었어요</p>
              <p className="pm-card-hint">이제 팀원들을 초대해볼까요?</p>
            </div>
          </div>

          <div
            style={{
              padding: 12,
              borderRadius: 12,
              background: "hsl(var(--warning) / 0.08)",
              border: "1px solid hsl(var(--warning) / 0.22)",
            }}
          >
            <p style={{ fontSize: 13, fontWeight: 600, color: "hsl(var(--foreground))" }}>
              팀원이 없으면 경기는 시뮬레이션만 돼요.
            </p>
            <p style={{ fontSize: 12, marginTop: 4, color: "hsl(var(--muted-foreground))", lineHeight: 1.5 }}>
              초대 링크를 공유하면 팀원들이 바로 참석 투표, 출석, 골 기록까지 할 수 있어요.
            </p>
          </div>

          {inviteCode && (
            <div
              style={{
                padding: 12,
                borderRadius: 12,
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--background) / 0.5)",
              }}
            >
              <p style={{ fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "hsl(var(--muted-foreground))", fontWeight: 600 }}>
                초대 코드
              </p>
              <p style={{ marginTop: 2, fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "hsl(var(--primary))", letterSpacing: "0.04em" }}>
                {inviteCode}
              </p>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
            <button
              type="button"
              className="pm-mform-submit"
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              onClick={handleKakaoInvite}
            >
              <Share2 className="h-4 w-4" aria-hidden />
              초대 링크 공유하기
            </button>
            <button
              type="button"
              className="pm-chip-pill"
              style={{ height: 44, borderRadius: 12, fontSize: 14, fontWeight: 600 }}
              onClick={handleCopyInvite}
            >
              {inviteCopied ? "✓ 복사됨" : "링크 복사"}
            </button>
            <button
              type="button"
              className="pm-mform-adv-toggle"
              style={{ justifyContent: "center", padding: "8px 0" }}
              onClick={closeInviteCta}
            >
              나중에 할게요 →
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
