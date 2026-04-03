"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { apiMutate } from "@/lib/useApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn, formatPhone, formatDateKo, formatTime } from "@/lib/utils";
import { PhoneInput } from "@/components/ui/phone-input";
import { useConfirm } from "@/lib/ConfirmContext";
import { Bell } from "lucide-react";
import { useToast } from "@/lib/ToastContext";
import type {
  Match,
  Guest,
  RosterPlayer,
  InternalTeamAssignment,
} from "./matchDetailTypes";
import { voteStyles as styles } from "@/lib/voteStyles";

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
  internalTeams,
  refetchInternalTeams,
  memberVoteTimeMap,
  goals: goalsProp,
  comments,
  refetchComments,
}: MatchInfoTabProps) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [savingTeams, setSavingTeams] = useState(false);
  const [teamSheetOpen, setTeamSheetOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const isInternal = match.matchType === "INTERNAL";

  /* ── 날씨 데이터 ── */
  const [weather, setWeather] = useState<{
    temp: number | null;
    description: string;
    humidity: number | null;
    windSpeed: number | null;
    icon: string;
  } | null>(null);

  useEffect(() => {
    // 완료된 경기이면 날씨 표시 안 함
    if (match.status === "COMPLETED") return;
    if (!match.date) return;

    const params = new URLSearchParams({ date: match.date });
    if (match.location) params.set("location", match.location);

    fetch(`/api/weather?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.icon) setWeather(data);
      })
      .catch(() => {
        // 날씨 조회 실패 시 무시
      });
  }, [match.date, match.location, match.status]);

  /* ── 유니폼 스타일 ── */
  const uniformPrimary = _uniformPrimary ?? "hsl(var(--primary))";
  const uniformSecondary = _uniformSecondary ?? "hsl(var(--muted-foreground))";
  const uniformPattern = _uniformPattern ?? "SOLID";

  const homeJerseyStyle = useMemo(
    () => ({ ...getUniformBg(uniformPrimary, uniformSecondary, uniformPattern), clipPath: JERSEY_CLIP }),
    [uniformPrimary, uniformSecondary, uniformPattern],
  );
  const awayJerseyStyle = useMemo(
    () => ({ ...getUniformBg(uniformSecondary, uniformPrimary, uniformPattern), clipPath: JERSEY_CLIP }),
    [uniformPrimary, uniformSecondary, uniformPattern],
  );

  /* ── 유니폼 변경 ── */
  async function handleUniformChange(type: "HOME" | "AWAY") {
    if (match.uniformType === type) return;
    const { error } = await apiMutate("/api/matches", "PUT", { id: matchId, uniformType: type });
    if (!error) {
      showToast(type === "HOME" ? "홈 유니폼으로 변경" : "원정 유니폼으로 변경");
      await refetchMatches();
    }
  }

  /* ── 경기 일정 수정 ── */
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSaveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const { error } = await apiMutate("/api/matches", "PUT", {
      id: matchId,
      date: fd.get("date"),
      time: fd.get("time"),
      endTime: fd.get("endTime") || null,
      location: fd.get("location"),
      opponent: fd.get("opponent"),
      voteDeadline: fd.get("voteDeadline") || null,
    });
    setSaving(false);
    if (!error) {
      showToast("경기 정보가 수정되었습니다.");
      setEditing(false);
      await refetchMatches();
    } else {
      showToast("수정에 실패했습니다.", "error");
    }
  }

  /* ── 경기 삭제 처리 ── */
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteMatch() {
    const ok = await confirm({
      title: "경기를 삭제하시겠습니까?",
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

  /* ── 내 참석 투표 ── */
  async function handleMyVote(vote: "ATTEND" | "ABSENT" | "MAYBE") {
    const { error: err } = await apiMutate("/api/attendance", "POST", { matchId, vote });
    if (err) {
      showToast("투표에 실패했습니다. 다시 시도해주세요.", "error");
    } else {
      await refetchVote();
    }
  }

  /* ── 용병 관리 ── */
  const [isGuestFormOpen, setIsGuestFormOpen] = useState(false);
  const [voteSearch, setVoteSearch] = useState("");
  const [voteFilter, setVoteFilter] = useState<"all" | "unvoted">("all");
  const [voteSortBy, setVoteSortBy] = useState<"none" | "name-asc" | "name-desc" | "time-asc" | "time-desc">("none");

  async function handleAddGuest(formData: FormData) {
    const name = String(formData.get("guestName") || "").trim();
    if (!name) return;
    const positions = formData.getAll("guestPositions").map(String).filter(Boolean);
    const position = positions.length > 0 ? positions.join(",") : undefined;
    const phone = String(formData.get("guestPhone") || "") || undefined;
    const note = String(formData.get("guestNote") || "") || undefined;

    await apiMutate("/api/guests", "POST", {
      matchId,
      name,
      position,
      phone,
      note,
    });
    setIsGuestFormOpen(false);
    await refetchGuests();
  }

  // 스코어 계산 (히어로 카드 + 기존 호환)
  const scoreData = useMemo(() => {
    if (!goalsProp || goalsProp.length === 0) return null;
    if (isInternal) {
      const left = goalsProp.filter((g) => g.side === "A" && g.scorerId !== "OPPONENT").length;
      const right = goalsProp.filter((g) => g.side === "B" && g.scorerId !== "OPPONENT").length;
      return { left, right, result: left > right ? "승" : left === right ? "무" : "패" };
    }
    const left = goalsProp.filter((g) => g.scorerId !== "OPPONENT" && !g.isOwnGoal).length
      + goalsProp.filter((g) => g.scorerId === "OPPONENT" && g.isOwnGoal).length;
    const right = goalsProp.filter((g) => g.scorerId === "OPPONENT" && !g.isOwnGoal).length
      + goalsProp.filter((g) => g.scorerId !== "OPPONENT" && g.isOwnGoal).length;
    return { left, right, result: left > right ? "승" : left === right ? "무" : "패" };
  }, [goalsProp, isInternal]);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">

      {/* ══ 스코어 히어로 카드 ══ */}
      {scoreData && match.matchType !== "EVENT" && (
        <Card className="rounded-2xl border-0 bg-gradient-to-br from-secondary to-background overflow-hidden">
          <CardContent className="p-0">
            <div className="relative px-6 pt-7 pb-5 text-center">
              {match.status === "COMPLETED" && (
                <div className="absolute right-4 top-4">
                  <Badge className={cn(
                    "px-2.5 py-1 text-xs font-bold tracking-wider",
                    scoreData.result === "승" && "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]",
                    scoreData.result === "무" && "bg-muted text-muted-foreground",
                    scoreData.result === "패" && "bg-destructive text-destructive-foreground",
                  )}>
                    {scoreData.result === "승" ? "WIN" : scoreData.result === "무" ? "DRAW" : "LOSE"}
                  </Badge>
                </div>
              )}
              <div className="flex items-center justify-center gap-5">
                <div className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold shadow-lg" style={homeJerseyStyle}>
                    {isInternal ? "A" : "H"}
                  </div>
                  <span className="max-w-[90px] truncate text-xs font-semibold">{isInternal ? "A팀" : "우리팀"}</span>
                </div>
                <div className="flex flex-col items-center gap-0.5 px-3">
                  <div className="text-5xl font-black tabular-nums tracking-tighter">
                    <span>{scoreData.left}</span>
                    <span className="mx-2 text-muted-foreground">:</span>
                    <span className="text-muted-foreground">{scoreData.right}</span>
                  </div>
                  {match.status === "COMPLETED" && (
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Final</span>
                  )}
                </div>
                <div className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-xl font-bold shadow-lg" style={awayJerseyStyle}>
                    {isInternal ? "B" : (match.opponent?.[0] ?? "?")}
                  </div>
                  <span className="max-w-[90px] truncate text-xs font-semibold text-muted-foreground">{isInternal ? "B팀" : (match.opponent ?? "상대팀")}</span>
                </div>
              </div>
            </div>
            <div className="border-t border-border/30 bg-card/50 px-5 py-3">
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span>{formatDateKo(match.date)}</span>
                {match.time && <><span className="h-3 w-px bg-border" /><span>{formatTime(match.time)}</span></>}
                {match.location && <><span className="h-3 w-px bg-border" /><span className="max-w-[120px] truncate">{match.location}</span></>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══ 유니폼 선택 (EVENT 제외) ══ */}
      {match.matchType !== "EVENT" && (
        <Card className="rounded-xl border-border/30">
          <CardHeader className="pb-3"><CardTitle className="text-base font-bold">우리팀 유니폼</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="유니폼 선택">
              {([{ type: "HOME" as const, label: "홈", style: homeJerseyStyle }, { type: "AWAY" as const, label: "원정", style: awayJerseyStyle }]).map((u) => (
                <button
                  key={u.type}
                  type="button"
                  role="radio"
                  aria-checked={match.uniformType === u.type}
                  onClick={() => handleUniformChange(u.type)}
                  disabled={!canManage}
                  className={cn(
                    "flex items-center gap-3 rounded-xl p-4 transition-all",
                    match.uniformType === u.type ? "bg-primary/10 ring-2 ring-primary" : "bg-secondary hover:bg-secondary/80"
                  )}
                >
                  <div className="flex gap-1">
                    <div className="h-8 w-6 rounded-sm shadow-sm" style={u.style} />
                  </div>
                  <span className={cn("text-sm font-semibold", match.uniformType === u.type ? "text-primary" : "text-foreground")}>{u.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══ 날씨 카드 ══ */}
      {weather && (
        <Card className="rounded-xl border-border/30">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-lg">{weather.icon}</div>
              <div>
                <div className="text-sm font-medium">{weather.description}</div>
                <div className="text-xs text-muted-foreground">경기 당일 날씨</div>
              </div>
            </div>
            <div className="flex items-center gap-1 text-2xl font-bold">
              {weather.temp != null && <>{weather.temp}°</>}
            </div>
          </CardContent>
        </Card>
      )}
      {!weather && match.status !== "COMPLETED" && match.date > new Date().toISOString().slice(0, 10) && (
        <Card className="rounded-xl border-border/30">
          <CardContent className="p-4 text-center text-xs text-muted-foreground/60">
            경기 5일 전부터 날씨가 표시됩니다
          </CardContent>
        </Card>
      )}

      {/* ══ 경기 정보 ══ */}
      <Card className="rounded-xl border-border/30">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-bold">{match.matchType === "EVENT" ? "팀 일정" : "경기 정보"}</CardTitle>
          {canManage && !editing && match.status === "SCHEDULED" && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="h-8 px-3 text-sm font-medium text-primary">수정</Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">날짜</Label>
                  <Input type="date" name="date" defaultValue={match.date} required className="min-h-[44px] border-0 bg-secondary" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">{match.matchType === "EVENT" ? "일정 제목" : "상대팀"}</Label>
                  <Input name="opponent" defaultValue={match.opponent ?? ""} placeholder={match.matchType === "EVENT" ? "예: 연말 회식, MT" : ""} className="min-h-[44px] border-0 bg-secondary" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">시작</Label>
                  <select name="time" defaultValue={formatTime(match.time)} className="flex h-11 w-full rounded-md border-0 bg-secondary px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary">
                    {Array.from({ length: 48 }, (_, i) => {
                      const h = String(Math.floor(i / 2)).padStart(2, "0");
                      const m = i % 2 === 0 ? "00" : "30";
                      return <option key={i} value={`${h}:${m}`}>{h}:{m}</option>;
                    })}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">종료</Label>
                  <select name="endTime" defaultValue={match.endTime ? formatTime(match.endTime) : ""} className="flex h-11 w-full rounded-md border-0 bg-secondary px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary">
                    <option value="">미설정</option>
                    {Array.from({ length: 48 }, (_, i) => {
                      const h = String(Math.floor(i / 2)).padStart(2, "0");
                      const m = i % 2 === 0 ? "00" : "30";
                      return <option key={i} value={`${h}:${m}`}>{h}:{m}</option>;
                    })}
                  </select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-medium text-muted-foreground">장소</Label>
                  <Input name="location" defaultValue={match.location} required className="min-h-[44px] border-0 bg-secondary" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-medium text-muted-foreground">투표 마감</Label>
                  <Input type="datetime-local" name="voteDeadline" defaultValue={match.voteDeadline?.slice(0, 16) ?? ""} className="min-h-[44px] border-0 bg-secondary" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" className="min-h-[44px]" onClick={() => setEditing(false)}>취소</Button>
                <Button type="submit" size="sm" className="min-h-[44px]" disabled={saving}>{saving ? "저장 중..." : "저장"}</Button>
              </div>
            </form>
          ) : (
            <div className="grid gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-14 shrink-0 text-muted-foreground">날짜</span>
                <span className="font-medium">{formatDateKo(match.date)}</span>
              </div>
              {match.time && (
                <div className="flex items-center gap-2">
                  <span className="w-14 shrink-0 text-muted-foreground">시간</span>
                  <span className="font-medium">{formatTime(match.time)}{match.endTime && <span className="text-muted-foreground"> ~ {formatTime(match.endTime)}</span>}</span>
                </div>
              )}
              {match.location && (
                <div className="flex items-center gap-2">
                  <span className="w-14 shrink-0 text-muted-foreground">장소</span>
                  <span className="font-medium">{match.location}</span>
                </div>
              )}
              {match.opponent && (
                <div className="flex items-center gap-2">
                  <span className="w-14 shrink-0 text-muted-foreground">{match.matchType === "EVENT" ? "제목" : "상대팀"}</span>
                  <span className="font-medium">{match.opponent}</span>
                </div>
              )}
              {match.endDate && (
                <div className="flex items-center gap-2">
                  <span className="w-14 shrink-0 text-muted-foreground">종료일</span>
                  <span className="font-medium">{formatDateKo(match.endDate)}</span>
                </div>
              )}
            </div>
          )}

          {/* 전적 반영 토글 */}
          {canManage && match.matchType !== "EVENT" && (
            <div className="flex items-center justify-between rounded-xl border border-border/30 p-3.5">
              <div className="min-w-0">
                <Label htmlFor="stats-toggle" className="text-sm font-medium cursor-pointer">시즌 전적에 포함</Label>
              </div>
              <button
                id="stats-toggle"
                type="button"
                role="switch"
                aria-checked={match.statsIncluded}
                onClick={async () => {
                  const next = !match.statsIncluded;
                  const { error: err } = await apiMutate("/api/matches", "PUT", { id: matchId, statsIncluded: next });
                  if (!err) { showToast(next ? "전적에 반영됩니다." : "전적에서 제외됩니다."); await refetchMatches(); }
                }}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200",
                  match.statsIncluded ? "bg-[hsl(var(--success))]" : "bg-muted-foreground/25"
                )}
              >
                <span className={cn("pointer-events-none block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200", match.statsIncluded ? "translate-x-[22px]" : "translate-x-[2px]")} />
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ══ 댓글 ══ */}
      <Card className="rounded-xl border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            댓글
            {(comments ?? []).length > 0 && <Badge variant="secondary" className="text-xs">{(comments ?? []).length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 입력 */}
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
              <Input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="댓글을 입력하세요"
                maxLength={200}
                className="min-h-[44px] border-0 bg-secondary pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{commentText.length}/200</span>
            </div>
            <Button type="submit" className="min-h-[44px] min-w-[44px]" disabled={sendingComment || !commentText.trim()}>
              {sendingComment ? "..." : "전송"}
            </Button>
          </form>

          {/* 목록 */}
          {(comments ?? []).length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <p>아직 댓글이 없습니다</p>
              <p className="mt-1 text-xs">첫 댓글을 남겨보세요!</p>
            </div>
          ) : (
            <ul className="space-y-2" role="list">
              {(comments ?? []).map((c) => (
                <li key={c.id} className="flex gap-3 rounded-xl bg-secondary/50 p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                    {(c.users?.name ?? "?")[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{c.users?.name ?? "알 수 없음"}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="mt-1 break-words text-sm leading-relaxed text-foreground/90">{c.content}</p>
                  </div>
                  {c.user_id === userId && (
                    <button
                      type="button"
                      onClick={async () => { await apiMutate(`/api/match-comments?id=${c.id}`, "DELETE"); refetchComments?.(); }}
                      className="shrink-0 text-xs text-muted-foreground transition-colors hover:text-destructive"
                    >
                      삭제
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ══ 경기 삭제 ══ */}
      {canManage && (
        <Button
          variant="ghost"
          className="w-full min-h-[44px] text-sm text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={deleting}
          onClick={handleDeleteMatch}
        >
          {deleting ? "삭제 중..." : "경기 삭제"}
        </Button>
      )}
    </div>
  );
}

export const MatchInfoTab = memo(MatchInfoTabInner);
