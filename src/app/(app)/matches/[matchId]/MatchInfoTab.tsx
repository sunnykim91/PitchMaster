"use client";

import { memo, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { apiMutate } from "@/lib/useApi";
import { useAsyncAction, useItemAction } from "@/lib/useAsyncAction";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { OpponentHistoryCard } from "@/components/OpponentHistoryCard";
import { cn, formatDateKo, formatTime } from "@/lib/utils";
import { sideConfig } from "@/lib/internalSides";
import type { InternalSide } from "@/lib/internalSides";
import { useConfirm } from "@/lib/ConfirmContext";
import { X, Trash2, Pencil } from "lucide-react";
import { useToast } from "@/lib/ToastContext";
import type {
  Match,
  Guest,
  RosterPlayer,
  InternalTeamAssignment,
} from "./matchDetailTypes";

/* editing form은 운영진이 수정 버튼 누를 때만 로드 — 멤버에겐 코드 다운로드 X.
 * 48개 select option × 2 시간 셀렉트 + 종목·인원 그리드 등 무거운 form. */
const EditMatchInfoForm = dynamic(() => import("./EditMatchInfoForm"), {
  ssr: false,
  loading: () => <div className="py-8 text-center text-sm text-muted-foreground">수정 폼 불러오는 중...</div>,
});

export interface MatchInfoTabProps {
  matchId: string;
  userId: string;
  match: Match;
  canManage: boolean;
  baseRoster: RosterPlayer[];
  memberVoteMap: Record<string, "ATTEND" | "ABSENT" | "MAYBE">;
  memberVoteTimeMap?: Record<string, string>;
  guests: Guest[];
  /** 참석투표 refetch */
  refetchVote: () => Promise<unknown>;
  /** 게스트 refetch */
  refetchGuests: () => Promise<unknown>;
  /** 경기 목록 refetch (경기 완료 처리 시) */
  refetchMatches: () => Promise<unknown>;
  /** 대리 투표 */
  handleProxyVote: (memberId: string, vote: "ATTEND" | "ABSENT" | "MAYBE") => Promise<void>;
  /** 용병 삭제 */
  handleRemoveGuest: (guestId: string) => Promise<void>;
  /** 팀 유니폼 홈 색상 */
  uniformPrimary?: string;
  /** 팀 유니폼 원정 색상 */
  uniformSecondary?: string;
  /** 팀 유니폼 패턴 */
  uniformPattern?: string;
  /** 유니폼 홈/원정/써드 JSONB */
  uniforms?: { home?: { primary: string; secondary: string; pattern: string }; away?: { primary: string; secondary: string; pattern: string }; third?: { primary: string; secondary: string; pattern: string } | null } | null;
  /** 자체전 팀 편성 데이터 */
  internalTeams?: InternalTeamAssignment[];
  /** 자체전 팀 편성 refetch */
  refetchInternalTeams?: () => Promise<unknown>;
  /** 골 데이터 (스코어 표시용) */
  goals?: import("./matchDetailTypes").GoalEvent[];
  /** 댓글 데이터 */
  comments?: { id: string; user_id: string; content: string; created_at: string; users: { name: string } | null }[];
  /** 댓글 refetch */
  refetchComments?: () => Promise<unknown>;
  /** 스포츠 타입 (참가 인원 셀렉트용) */
  sportType?: "SOCCER" | "FUTSAL";
  /** 서버에서 계산된 오늘 날짜 (YYYY-MM-DD, hydration 일치용) */
  todayIso: string;
  /** 서버에서 prefetch된 날씨 — LCP 개선을 위해 초기 렌더에 포함 */
  initialWeather?: {
    temp: number;
    description: string;
    humidity: number;
    windSpeed: number;
    icon: string;
  } | null;
}

/* ── 유니폼 스타일 헬퍼 ── */
const JERSEY_CLIP = "polygon(12% 12%, 30% 12%, 34% 0%, 66% 0%, 70% 12%, 88% 12%, 100% 34%, 86% 48%, 86% 100%, 14% 100%, 14% 48%, 0% 34%)";

function getUniformBg(primary: string, secondary: string, pattern: string) {
  if (pattern === "STRIPES_VERTICAL") {
    return { backgroundColor: primary, backgroundImage: `repeating-linear-gradient(90deg, ${primary} 0 10px, ${secondary} 10px 20px)` };
  }
  if (pattern === "STRIPES_HORIZONTAL") {
    return { backgroundColor: primary, backgroundImage: `repeating-linear-gradient(180deg, ${primary} 0 10px, ${secondary} 10px 20px)` };
  }
  if (pattern === "STRIPES_DIAGONAL") {
    return { backgroundColor: primary, backgroundImage: `repeating-linear-gradient(135deg, ${primary} 0 10px, ${secondary} 10px 20px)` };
  }
  return { backgroundColor: primary };
}

function MatchInfoTabInner({
  matchId,
  userId,
  match,
  canManage,
  baseRoster,
  memberVoteMap,
  guests,
  refetchVote,
  refetchGuests,
  refetchMatches,
  handleProxyVote,
  handleRemoveGuest,
  uniformPrimary: _uniformPrimary,
  uniformSecondary: _uniformSecondary,
  uniformPattern: _uniformPattern,
  uniforms: uniformsProp,
  internalTeams,
  refetchInternalTeams,
  memberVoteTimeMap,
  goals: goalsProp,
  comments,
  refetchComments,
  sportType = "SOCCER",
  todayIso,
  initialWeather,
}: MatchInfoTabProps) {
  const isFutsal = sportType === "FUTSAL";
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [runUniform, uniformLoading] = useAsyncAction();
  const [runDeleteComment, deletingCommentId] = useItemAction();
  const [savingTeams, setSavingTeams] = useState(false);
  const [teamSheetOpen, setTeamSheetOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const isInternal = match.matchType === "INTERNAL";
  // 3파전: 2팀 히어로(A:B) 대신 팀별 골 합계 카드로 대체
  const internal3 = isInternal && ((internalTeams ?? []).some((t) => t.side === "C") || (goalsProp ?? []).some((g) => g.side === "C"));

  /* ── 날씨 데이터 (서버에서 prefetch된 initialWeather 사용, 없으면 클라에서 fetch) ── */
  const [weather, setWeather] = useState<{
    temp: number | null;
    description: string;
    humidity: number | null;
    windSpeed: number | null;
    icon: string;
  } | null>(initialWeather ?? null);

  useEffect(() => {
    // initialWeather가 객체면 SSR이 정상 조회 → 재fetch 불필요
    // null 이면 SSR 시점 KST 자정 경계·OpenWeather forecast 끝단 등으로 실패 → 클라에서 보강 fetch
    if (initialWeather) return;
    if (match.status === "COMPLETED") return;
    if (!match.date) return;

    const params = new URLSearchParams({ date: match.date });
    if (match.location) params.set("location", match.location);

    fetch(`/api/weather?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.icon) setWeather(data);
      })
      .catch(() => {});
  }, [match.date, match.location, match.status, initialWeather]);

  /* ── 유니폼 스타일 ── */
  const uniformPrimary = _uniformPrimary ?? "hsl(var(--primary))";
  const uniformSecondary = _uniformSecondary ?? "hsl(var(--muted-foreground))";
  const uniformPattern = _uniformPattern ?? "SOLID";

  const homeJerseyStyle = useMemo(() => {
    const home = uniformsProp?.home;
    if (home) return { ...getUniformBg(home.primary, home.secondary, home.pattern), clipPath: JERSEY_CLIP };
    return { ...getUniformBg(uniformPrimary, uniformSecondary, uniformPattern), clipPath: JERSEY_CLIP };
  }, [uniformPrimary, uniformSecondary, uniformPattern, uniformsProp]);
  const awayJerseyStyle = useMemo(() => {
    const away = uniformsProp?.away;
    if (away) return { ...getUniformBg(away.primary, away.secondary, away.pattern), clipPath: JERSEY_CLIP };
    return { ...getUniformBg(uniformSecondary, uniformPrimary, uniformPattern), clipPath: JERSEY_CLIP };
  }, [uniformPrimary, uniformSecondary, uniformPattern, uniformsProp]);

  const thirdJerseyStyle = useMemo(() => {
    const third = uniformsProp?.third;
    if (!third) return null;
    return { ...getUniformBg(third.primary, third.secondary, third.pattern), clipPath: JERSEY_CLIP };
  }, [uniformsProp]);

  // 스코어 히어로의 '우리팀' 저지 — 이 경기에서 선택한 유니폼(홈/원정/써드)을 반영.
  // (예전엔 항상 homeJerseyStyle 고정이라 원정·써드로 바꿔도 메인 저지 색이 안 변하던 버그)
  const teamJerseyStyle = useMemo(() => {
    if (match.uniformType === "AWAY") return awayJerseyStyle;
    if (match.uniformType === "THIRD" && thirdJerseyStyle) return thirdJerseyStyle;
    return homeJerseyStyle;
  }, [match.uniformType, homeJerseyStyle, awayJerseyStyle, thirdJerseyStyle]);

  /* ── 유니폼 변경 ── */
  async function handleUniformChange(type: "HOME" | "AWAY" | "THIRD") {
    if (match.uniformType === type) return;
    await runUniform(async () => {
      const { error } = await apiMutate("/api/matches", "PUT", { id: matchId, uniformType: type });
      if (!error) {
        showToast(type === "HOME" ? "홈 유니폼으로 변경" : type === "AWAY" ? "원정 유니폼으로 변경" : "써드 유니폼으로 변경");
        await refetchMatches();
      }
    });
  }

  /* ── 경기 일정 수정 (form 본체는 dynamic, 운영진 클릭 시에만 로드) ── */
  const [editing, setEditing] = useState(false);

  /* ── 경기 삭제 처리 ── */
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteMatch() {
    const ok = await confirm({
      title: "경기를 삭제할까요?",
      description: "삭제된 경기의 모든 기록(골, MVP, 투표, 전술)이 함께 삭제되며 복구할 수 없습니다.",
      variant: "destructive",
      confirmLabel: "삭제",
      cancelLabel: "취소",
    });
    if (!ok) return;
    setDeleting(true);
    try {
      const { error: err } = await apiMutate("/api/matches", "DELETE", { id: matchId });
      if (err) {
        showToast("삭제에 실패했습니다.", "error");
        return;
      }
      showToast("경기가 삭제되었습니다.");
      window.location.replace("/matches");
    } catch {
      showToast("삭제에 실패했습니다.", "error");
    } finally {
      setDeleting(false);
    }
  }

  // 스코어 계산 (히어로 카드 + 기존 호환)
  const scoreData = useMemo(() => {
    if (!goalsProp || goalsProp.length === 0) return null;
    if (isInternal) {
      // 자책골은 side=범한 팀이므로 상대 사이드 득점으로 집계 (MatchDetailClient 스코어보드와 동일 규칙)
      const left = goalsProp.filter((g) => g.side === "A" && !g.isOwnGoal).length
        + goalsProp.filter((g) => g.side === "B" && g.isOwnGoal).length;
      const right = goalsProp.filter((g) => g.side === "B" && !g.isOwnGoal).length
        + goalsProp.filter((g) => g.side === "A" && g.isOwnGoal).length;
      return { left, right, result: left > right ? "승" : left === right ? "무" : "패" };
    }
    const left = goalsProp.filter((g) => g.scorerId !== "OPPONENT" && !g.isOwnGoal).length
      + goalsProp.filter((g) => g.scorerId === "OPPONENT" && g.isOwnGoal).length;
    const right = goalsProp.filter((g) => g.scorerId === "OPPONENT" && !g.isOwnGoal).length
      + goalsProp.filter((g) => g.scorerId !== "OPPONENT" && g.isOwnGoal).length;
    return { left, right, result: left > right ? "승" : left === right ? "무" : "패" };
  }, [goalsProp, isInternal]);

  // 댓글 시간 표시 헬퍼 (n분 전, n시간 전, 날짜)
  function formatCommentTime(dateStr: string) {
    const d = new Date(dateStr);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "방금 전";
    if (mins < 60) return `${mins}분 전`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간 전`;
    return `${d.getMonth() + 1}월 ${d.getDate()}일`;
  }

  return (
    <div className="space-y-4">

      {/* ═══ 1. 스코어 히어로 카드 (완료된 경기 + 골 있을 때) ═══ */}
      {scoreData && !internal3 && match.matchType !== "EVENT" && (
        <Card className="rounded-2xl border-0 bg-gradient-to-br from-secondary to-background overflow-hidden">
          <CardContent className="p-0">
            <div className="px-6 pt-8 pb-6 text-center">
              <div className="flex items-center justify-center gap-6">
                {/* 홈 */}
                <div className="relative flex flex-1 flex-col items-center gap-3">
                  <div className="h-14 w-14 rounded-sm shadow-lg" style={isInternal ? homeJerseyStyle : teamJerseyStyle} />
                  {match.status === "COMPLETED" && scoreData.result === "승" && (
                    <Badge className="absolute -right-1 -top-1 bg-[hsl(var(--success))] px-1.5 py-0.5 text-[12px] font-bold text-white">승</Badge>
                  )}
                  <span className="max-w-[100px] truncate text-sm font-semibold">{isInternal ? "A팀" : "우리팀"}</span>
                </div>
                {/* 스코어 */}
                <div className="flex flex-col items-center gap-1 px-4">
                  <div className="text-5xl font-black tabular-nums tracking-tighter">
                    <span>{scoreData.left}</span>
                    <span className="mx-2 text-muted-foreground">:</span>
                    <span className="text-muted-foreground">{scoreData.right}</span>
                  </div>
                  {match.status === "COMPLETED" && (
                    <span className="text-xs font-medium tracking-wider text-muted-foreground">종료</span>
                  )}
                </div>
                {/* 어웨이 / B팀 */}
                <div className="relative flex flex-1 flex-col items-center gap-3">
                  {isInternal ? (
                    <div className="h-14 w-14 rounded-sm shadow-lg" style={{ ...getUniformBg(uniformSecondary, uniformPrimary, uniformPattern), clipPath: JERSEY_CLIP }} />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-xl font-bold shadow-lg text-muted-foreground">
                      {match.opponent?.[0] ?? "?"}
                    </div>
                  )}
                  {match.status === "COMPLETED" && scoreData.result === "패" && (
                    <Badge className="absolute -left-1 -top-1 bg-destructive px-1.5 py-0.5 text-[12px] font-bold text-white">패</Badge>
                  )}
                  {match.status === "COMPLETED" && scoreData.result === "무" && (
                    <Badge className="absolute -right-1 -top-1 bg-muted px-1.5 py-0.5 text-[12px] font-bold text-muted-foreground">무</Badge>
                  )}
                  <span className="max-w-[100px] truncate text-sm font-semibold text-muted-foreground">{isInternal ? "B팀" : (match.opponent ?? "상대팀")}</span>
                </div>
              </div>
            </div>
            <div className="border-t border-border/30 bg-[hsl(var(--card)_/_0.5)] px-5 py-3">
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span>{formatDateKo(match.date)}</span>
                {match.time && <><span className="h-3 w-px bg-border" /><span>{formatTime(match.time)}</span></>}
                {match.location && <><span className="h-3 w-px bg-border" /><span className="max-w-[120px] truncate">{match.location}</span></>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ 1-b. 3파전 스코어 카드 (자체전 3팀) ═══ */}
      {internal3 && (goalsProp ?? []).length > 0 && match.matchType !== "EVENT" && (
        <Card className="rounded-2xl border-0 bg-gradient-to-br from-secondary to-background overflow-hidden">
          <CardContent className="px-6 py-6">
            <p className="mb-3 text-center text-xs font-medium tracking-wider text-muted-foreground">자체전 · 3팀</p>
            <div className="flex flex-wrap items-end justify-center gap-x-7 gap-y-3">
              {(["A", "B", "C"] as InternalSide[]).map((s) => {
                const cfg = sideConfig(s);
                const g = (goalsProp ?? []).filter((x) => x.side === s && !x.isOwnGoal).length;
                const r = match.internalTeamResults?.[s];
                return (
                  <div key={s} className="flex flex-col items-center gap-1">
                    <span className={cn("text-sm font-bold", cfg.text)}>{cfg.label}</span>
                    <span className={cn("text-4xl font-black tabular-nums", cfg.text)}>{g}</span>
                    {r && (r.w || r.d || r.l) ? (
                      <span className="text-[11px] text-muted-foreground">{r.w}승 {r.d}무 {r.l}패</span>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span>{formatDateKo(match.date)}</span>
              {match.time && <><span className="h-3 w-px bg-border" /><span>{formatTime(match.time)}</span></>}
              {match.location && <><span className="h-3 w-px bg-border" /><span className="max-w-[120px] truncate">{match.location}</span></>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ 2. 경기 정보 ═══ */}
      <Card className="rounded-xl border-border/30">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-bold">{match.matchType === "EVENT" ? "팀 일정" : "경기 정보"}</CardTitle>
          {canManage && !editing && (
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                if (match.status === "COMPLETED") {
                  const ok = await confirm({
                    title: "이미 완료된 경기입니다",
                    description: "정보를 수정하면 시즌 통계·기록 표시에 영향을 줄 수 있어요. 정정 목적이면 계속 진행해주세요.",
                    confirmLabel: "정정 진행",
                    cancelLabel: "취소",
                  });
                  if (!ok) return;
                }
                setEditing(true);
              }}
              className="h-8 w-8 text-primary"
              aria-label="경기 정보 수정"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <EditMatchInfoForm
              matchId={matchId}
              match={match}
              sportType={sportType}
              onClose={() => setEditing(false)}
              onSaved={refetchMatches}
            />
          ) : (
            <div className="grid gap-2 text-sm">
              {/* 스코어 카드가 없을 때만 기본 정보 표시 */}
              {!scoreData && (
                <>
                  <div className="flex items-center gap-2"><span className="w-14 shrink-0 text-muted-foreground">날짜</span><span className="font-medium">{formatDateKo(match.date)}</span></div>
                  {match.time && <div className="flex items-center gap-2"><span className="w-14 shrink-0 text-muted-foreground">시간</span><span className="font-medium">{formatTime(match.time)}{match.endTime && <span className="text-muted-foreground"> ~ {formatTime(match.endTime)}</span>}</span></div>}
                  {match.location && <div className="flex items-center gap-2"><span className="w-14 shrink-0 text-muted-foreground">장소</span><span className="font-medium">{match.location}</span></div>}
                  {match.opponent && <div className="flex items-center gap-2"><span className="w-14 shrink-0 text-muted-foreground">{match.matchType === "EVENT" ? "제목" : "상대팀"}</span><span className="font-medium">{match.opponent}</span></div>}
                  {match.matchType !== "EVENT" && match.sportType && (
                    <div className="flex items-center gap-2">
                      <span className="w-14 shrink-0 text-muted-foreground">종목</span>
                      <span className="font-medium">{match.sportType === "FUTSAL" ? "⚽ 풋살" : "⚽ 축구"}{match.playerCount ? <span className="text-muted-foreground"> · {match.playerCount}:{match.playerCount}</span> : null}</span>
                    </div>
                  )}
                </>
              )}
              {match.endDate && <div className="flex items-center gap-2"><span className="w-14 shrink-0 text-muted-foreground">종료일</span><span className="font-medium">{formatDateKo(match.endDate)}</span></div>}
            </div>
          )}

          {/* 유니폼 선택 (EVENT 제외) */}
          {match.matchType !== "EVENT" && (
            <div className="flex items-center gap-3 pt-1">
              <span className="text-sm text-muted-foreground">유니폼</span>
              <div className="flex gap-2">
                {([
                  { type: "HOME" as const, label: "홈", style: homeJerseyStyle },
                  { type: "AWAY" as const, label: "원정", style: awayJerseyStyle },
                  ...(thirdJerseyStyle ? [{ type: "THIRD" as const, label: "써드", style: thirdJerseyStyle }] : []),
                ]).map((u) => (
                  <button key={u.type} type="button" onClick={() => handleUniformChange(u.type)} disabled={!canManage || uniformLoading}
                    className={cn("flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                      match.uniformType === u.type ? "border-primary bg-[hsl(var(--primary)_/_0.1)] text-primary" : "border-border text-muted-foreground hover:bg-secondary",
                      uniformLoading && "opacity-50"
                    )}>
                    <div className="h-5 w-5 shrink-0 rounded-sm" style={u.style} />
                    {u.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 전적 반영 토글 */}
          {canManage && match.matchType !== "EVENT" && (
            <div className="flex items-center justify-between rounded-xl border border-border/30 p-3.5">
              <div className="min-w-0">
                <p className="text-sm font-medium">전적 반영</p>
                <p className="text-xs text-muted-foreground">
                  {match.statsIncluded ? "시즌 전적·개인 통계에 반영됩니다" : "시즌 전적·개인 통계에서 제외됩니다"}
                </p>
              </div>
              <button type="button" role="switch" aria-checked={match.statsIncluded} aria-label="전적 반영"
                onClick={async () => {
                  const next = !match.statsIncluded;
                  const { error: err } = await apiMutate("/api/matches", "PUT", { id: matchId, statsIncluded: next });
                  if (!err) { showToast(next ? "전적에 반영됩니다." : "전적에서 제외됩니다."); await refetchMatches(); }
                }}
                className={cn("relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200", match.statsIncluded ? "bg-primary" : "bg-[hsl(var(--muted-foreground)_/_0.25)]")}
              >
                <span className={cn("pointer-events-none block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200", match.statsIncluded ? "translate-x-[22px]" : "translate-x-[2px]")} />
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ 3.5. 상대팀 전적 (REGULAR + opponent 있을 때만) ═══ */}
      {match.matchType === "REGULAR" && match.opponent && match.opponent.trim() && (
        <OpponentHistoryCard opponentName={match.opponent} currentMatchId={matchId} />
      )}

      {/* ═══ 4. 날씨 카드 ═══ */}
      {weather && (
        <Card className="rounded-xl border-border/30">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-lg">{weather.icon}</div>
              <div>
                <div className="text-sm font-medium">{weather.description}</div>
                <div className="text-xs text-muted-foreground">경기 당일 날씨{weather.humidity != null && ` · 습도 ${weather.humidity}%`}{weather.windSpeed != null && ` · 풍속 ${weather.windSpeed}m/s`}</div>
              </div>
            </div>
            {weather.temp != null && <div className="text-2xl font-bold">{weather.temp}°</div>}
          </CardContent>
        </Card>
      )}
      {!weather && match.status !== "COMPLETED" && match.date > todayIso && (
        <Card className="rounded-xl border-border/30">
          <CardContent className="p-4 text-center text-xs text-muted-foreground/60">
            경기 5일 전부터 날씨가 표시됩니다
          </CardContent>
        </Card>
      )}

      {/* ═══ 5. 댓글 ═══ */}
      <Card className="rounded-xl border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            댓글
            {(comments ?? []).length > 0 && <Badge variant="secondary" className="text-xs">{(comments ?? []).length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!commentText.trim() || sendingComment) return;
            setSendingComment(true);
            const { error: err } = await apiMutate("/api/match-comments", "POST", { matchId, content: commentText });
            setSendingComment(false);
            if (err) { showToast("댓글 작성에 실패했습니다.", "error"); return; }
            setCommentText("");
            refetchComments?.();
          }} className="flex gap-2">
            <div className="relative flex-1">
              <Input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="댓글을 입력하세요" maxLength={200} className="min-h-[44px] border-0 bg-secondary pr-12" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{commentText.length}/200</span>
            </div>
            <Button type="submit" className="min-h-[44px] min-w-[44px]" disabled={sendingComment || !commentText.trim()}>
              {sendingComment ? "..." : "전송"}
            </Button>
          </form>

          {(comments ?? []).length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <p>아직 댓글이 없습니다</p>
              <p className="mt-1 text-xs">첫 댓글을 남겨보세요!</p>
            </div>
          ) : (
            <ul className="space-y-2" role="list">
              {(comments ?? []).map((c) => (
                <li key={c.id} className="flex gap-3 rounded-xl bg-[hsl(var(--secondary)_/_0.5)] p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary)_/_0.2)] text-sm font-bold text-primary">
                    {(c.users?.name ?? "?")[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{c.users?.name ?? "알 수 없음"}</span>
                      <span className="text-xs text-muted-foreground" suppressHydrationWarning>{formatCommentTime(c.created_at)}</span>
                    </div>
                    <p className="mt-1 break-words text-sm leading-relaxed text-foreground/90">{c.content}</p>
                  </div>
                  {c.user_id === userId && (
                    <button type="button"
                      disabled={deletingCommentId === c.id}
                      onClick={() => runDeleteComment(c.id, async () => { await apiMutate(`/api/match-comments?id=${c.id}`, "DELETE"); refetchComments?.(); })}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[hsl(var(--destructive)_/_0.1)] hover:text-destructive disabled:opacity-50"
                      aria-label="댓글 삭제"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ═══ 6. 경기 삭제 ═══ */}
      {canManage && (
        <Button variant="ghost" className="w-full min-h-[44px] gap-2 text-sm text-destructive hover:bg-[hsl(var(--destructive)_/_0.1)] hover:text-destructive" disabled={deleting} onClick={handleDeleteMatch}>
          <Trash2 className="h-4 w-4" />
          {deleting ? "삭제 중..." : "경기 삭제"}
        </Button>
      )}
    </div>
  );
}

export const MatchInfoTab = memo(MatchInfoTabInner);
