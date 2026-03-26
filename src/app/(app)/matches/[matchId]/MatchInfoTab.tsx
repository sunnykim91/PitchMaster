"use client";

import { memo, useMemo, useState } from "react";
import { apiMutate } from "@/lib/useApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn, formatPhone, formatDateKo, formatTime } from "@/lib/utils";
import { PhoneInput } from "@/components/ui/phone-input";
import { ConfirmDialog } from "@/components/ConfirmDialog";
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
}: MatchInfoTabProps) {
  const { showToast } = useToast();
  const [savingTeams, setSavingTeams] = useState(false);
  const [teamSheetOpen, setTeamSheetOpen] = useState(false);
  const isInternal = match.matchType === "INTERNAL";

  /* ── 유니폼 스타일 ── */
  const uniformPrimary = _uniformPrimary ?? "#2563eb";
  const uniformSecondary = _uniformSecondary ?? "#f97316";
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
      location: fd.get("location"),
      opponent: fd.get("opponent"),
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

  /* ── 경기 완료 처리 ── */
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteMatch() {
    setDeleting(true);
    try {
      const { error: err } = await apiMutate("/api/matches", "DELETE", { id: matchId });
      if (err) {
        showToast("삭제에 실패했습니다.", "error");
        return;
      }
      showToast("경기가 삭제되었습니다.");
      window.location.href = "/matches";
    } catch {
      showToast("삭제에 실패했습니다.", "error");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
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

  return (
    <>
      {/* ── 경기 정보 카드 ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <p className="type-overline text-[hsl(var(--info))]">Match Info</p>
            <CardTitle className="mt-1 font-heading text-lg sm:text-2xl font-bold uppercase">
              경기 정보
            </CardTitle>
          </div>
          {canManage && !editing && (
            <div className="flex items-center gap-2">
              {match.status === "SCHEDULED" && (
                <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                  수정
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => setShowDeleteConfirm(true)}
              >
                삭제
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-sm">날짜</Label>
                  <Input type="date" name="date" defaultValue={match.date} required />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">시간</Label>
                  <Input type="time" name="time" defaultValue={match.time} />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">장소</Label>
                  <Input name="location" defaultValue={match.location} required />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">상대팀</Label>
                  <Input name="opponent" defaultValue={match.opponent ?? ""} />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>취소</Button>
                <Button type="submit" size="sm" disabled={saving}>{saving ? "저장 중..." : "저장"}</Button>
              </div>
            </form>
          ) : (
            <div className="grid gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-14 shrink-0">날짜</span>
                <span className="font-medium">{formatDateKo(match.date)}</span>
              </div>
              {match.time && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-14 shrink-0">시간</span>
                  <span className="font-medium">{formatTime(match.time)}</span>
                </div>
              )}
              {match.location && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-14 shrink-0">장소</span>
                  <span className="font-medium">{match.location}</span>
                </div>
              )}
              {match.opponent && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-14 shrink-0">상대팀</span>
                  <span className="font-medium">{match.opponent}</span>
                </div>
              )}
            </div>
          )}

          {/* 유니폼 선택 */}
          <div className="flex items-center gap-3 pt-1">
            <span className="text-sm text-muted-foreground">유니폼</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleUniformChange("HOME")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                  match.uniformType === "HOME"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-secondary"
                )}
                disabled={!canManage}
              >
                <div className="h-5 w-5 shrink-0 rounded" style={homeJerseyStyle} />
                홈
              </button>
              <button
                type="button"
                onClick={() => handleUniformChange("AWAY")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                  match.uniformType === "AWAY"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-secondary"
                )}
                disabled={!canManage}
              >
                <div className="h-5 w-5 shrink-0 rounded" style={awayJerseyStyle} />
                원정
              </button>
            </div>
          </div>

          {/* 전적 반영 토글 (운영진 이상) */}
          {canManage && (
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">전적 반영</p>
                <p className="text-xs text-muted-foreground">
                  {match.statsIncluded ? "시즌 전적·개인 통계에 반영됩니다" : "시즌 전적·개인 통계에서 제외됩니다"}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={match.statsIncluded}
                onClick={async () => {
                  const next = !match.statsIncluded;
                  const { error: err } = await apiMutate("/api/matches", "PUT", { id: matchId, statsIncluded: next });
                  if (!err) {
                    showToast(next ? "전적에 반영됩니다." : "전적에서 제외됩니다.");
                    await refetchMatches();
                  }
                }}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200",
                  match.statsIncluded ? "bg-[hsl(var(--success))]" : "bg-muted-foreground/25"
                )}
              >
                <span className={cn(
                  "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200",
                  match.statsIncluded ? "translate-x-[22px]" : "translate-x-[2px]"
                )} />
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="경기를 삭제하시겠습니까?"
        description="삭제된 경기의 모든 기록(골, MVP, 투표, 전술)이 함께 삭제되며 복구할 수 없습니다."
        variant="destructive"
        confirmLabel="삭제"
        cancelLabel="취소"
        onConfirm={handleDeleteMatch}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* ── 내 참석 투표 (모든 멤버, 진행 전 경기만) ── */}
      {match.status !== "COMPLETED" && (() => {
        const myMember = baseRoster.find((m) => m.id === userId);
        if (!myMember) return null;
        const myVote = memberVoteMap[myMember.memberId];
        const isExpired = match.voteDeadline ? new Date(match.voteDeadline) < new Date() : false;
        return (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-muted-foreground">내 참석 투표</p>
                  <p className={cn("mt-0.5 text-sm font-semibold",
                    !myVote && "text-[hsl(var(--warning))]"
                  )}>
                    {myVote === "ATTEND" ? "참석" : myVote === "ABSENT" ? "불참" : myVote === "MAYBE" ? "미정" : "미투표"}
                  </p>
                </div>
                {isExpired ? (
                  <p className="text-xs text-muted-foreground shrink-0">투표 마감됨</p>
                ) : (
                  <div className="flex gap-1.5 shrink-0">
                    {([
                      { value: "ATTEND" as const, label: "참석" },
                      { value: "MAYBE" as const, label: "미정" },
                      { value: "ABSENT" as const, label: "불참" },
                    ]).map((opt) => {
                      const isSelected = myVote === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          className={cn(
                            "rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95",
                            isSelected ? styles[opt.value].active : styles[opt.value].inactive
                          )}
                          onClick={() => handleMyVote(opt.value)}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* ── 참석투표 관리 (운영진 이상, 진행 전 경기만) ── */}
      {canManage && match.status !== "COMPLETED" && (
        <Card>
          <CardHeader>
            <p className="type-overline text-[hsl(var(--info))]">
              Attendance
            </p>
            <CardTitle className="mt-1 font-heading text-lg sm:text-2xl font-bold uppercase">
              참석 투표 관리
            </CardTitle>
            <p className="text-xs text-muted-foreground">멤버별 참석/불참/미정을 대리 설정할 수 있습니다.</p>
            <input
              type="text"
              placeholder="이름 검색..."
              value={voteSearch}
              onChange={(e) => setVoteSearch(e.target.value)}
              list="vote-member-names"
              autoComplete="off"
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <datalist id="vote-member-names">
              {baseRoster.map((m) => <option key={m.memberId} value={m.name} />)}
            </datalist>
            {/* 미투표 필터 */}
            {(() => {
              const unvotedCount = baseRoster.filter((m) => !memberVoteMap[m.memberId]).length;
              return (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setVoteFilter("all")}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                        voteFilter === "all"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                      )}
                    >
                      전체
                    </button>
                    <button
                      type="button"
                      onClick={() => setVoteFilter("unvoted")}
                      className={cn(
                        "flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                        voteFilter === "unvoted"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                      )}
                    >
                      미투표
                      {unvotedCount > 0 && (
                        <span className={cn(
                          "rounded-full px-1.5 py-0.5 text-xs font-bold leading-tight",
                          voteFilter === "unvoted"
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : "bg-destructive/15 text-destructive"
                        )}>
                          {unvotedCount}
                        </span>
                      )}
                    </button>
                  </div>
                  <div className="flex gap-1 border-l border-border pl-2">
                    {([
                      { key: "name", cycle: ["none", "name-asc", "name-desc"] as string[], labels: ["이름", "이름 ↑", "이름 ↓"] },
                      { key: "time", cycle: ["none", "time-asc", "time-desc"] as string[], labels: ["투표시간", "투표 ↑", "투표 ↓"] },
                    ]).map(({ key, cycle, labels }) => {
                      const idx = cycle.indexOf(voteSortBy);
                      const isActive = idx > 0;
                      const label = isActive ? labels[idx] : labels[0];
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            const nextIdx = idx < 0 ? 1 : (idx + 1) % 3;
                            setVoteSortBy(cycle[nextIdx] as typeof voteSortBy);
                          }}
                          className={cn(
                            "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                            isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
            {/* 투표 현황 카운터 */}
            {(() => {
              const attend = baseRoster.filter((m) => memberVoteMap[m.memberId] === "ATTEND").length;
              const absent = baseRoster.filter((m) => memberVoteMap[m.memberId] === "ABSENT").length;
              const maybe = baseRoster.filter((m) => memberVoteMap[m.memberId] === "MAYBE").length;
              const noVote = baseRoster.length - attend - absent - maybe;
              return (
                <>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold">
                    <span className="text-[hsl(var(--success))]">참석 {attend}</span>
                    <span className="text-[hsl(var(--loss))]">불참 {absent}</span>
                    <span className="text-[hsl(var(--warning))]">미정 {maybe}</span>
                    <span className="text-muted-foreground">미투표 {noVote}</span>
                    <span className="text-muted-foreground/50">· 총 {baseRoster.length}명</span>
                  </div>
                  {noVote > 0 && (
                    <button
                      type="button"
                      className="mt-3 flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 active:scale-95"
                      onClick={async () => {
                        try {
                          const res = await fetch("/api/push/vote-nudge", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ matchId: match.id }),
                          });
                          const data = await res.json();
                          showToast(`미투표자 ${data.unvoted ?? 0}명에게 알림을 보냈습니다`);
                        } catch {
                          showToast("알림 발송에 실패했습니다", "error");
                        }
                      }}
                    >
                      <Bell className="h-3.5 w-3.5" />
                      투표독려 알림 보내기
                    </button>
                  )}
                </>
              );
            })()}
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...baseRoster].filter((m) => {
                if (voteSearch && !m.name.includes(voteSearch)) return false;
                if (voteFilter === "unvoted" && memberVoteMap[m.memberId]) return false;
                return true;
              }).sort((a, b) => {
                if (voteSortBy === "name-asc") return a.name.localeCompare(b.name, "ko");
                if (voteSortBy === "name-desc") return b.name.localeCompare(a.name, "ko");
                if (voteSortBy === "time-asc") {
                  const tA = memberVoteTimeMap?.[a.memberId] ?? "";
                  const tB = memberVoteTimeMap?.[b.memberId] ?? "";
                  return tA.localeCompare(tB) || a.name.localeCompare(b.name, "ko");
                }
                if (voteSortBy === "time-desc") {
                  const tA = memberVoteTimeMap?.[a.memberId] ?? "";
                  const tB = memberVoteTimeMap?.[b.memberId] ?? "";
                  return tB.localeCompare(tA) || a.name.localeCompare(b.name, "ko");
                }
                // 기본(none): 참석→미정→불참→미투표
                const voteA = memberVoteMap[a.memberId];
                const voteB = memberVoteMap[b.memberId];
                const order: Record<string, number> = { ATTEND: 0, MAYBE: 1, ABSENT: 2 };
                const orderA = voteA ? (order[voteA] ?? 3) : 4;
                const orderB = voteB ? (order[voteB] ?? 3) : 4;
                if (orderA !== orderB) return orderA - orderB;
                return a.name.localeCompare(b.name, "ko");
              }).map((member) => {
                const currentVote = memberVoteMap[member.memberId];
                return (
                  <div key={member.id} className={cn(
                    "flex items-center justify-between rounded-lg px-4 py-3",
                    !currentVote ? "bg-destructive/5 ring-1 ring-destructive/20" : "bg-secondary"
                  )}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-semibold truncate">{member.name}</span>
                      {!member.isLinked && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">미가입</Badge>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      {([
                        { value: "ATTEND" as const, label: "참석" },
                        { value: "MAYBE" as const, label: "미정" },
                        { value: "ABSENT" as const, label: "불참" },
                      ]).map((opt) => {
                        const isSelected = currentVote === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            className={cn(
                              "rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-105 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                              isSelected ? styles[opt.value].active : styles[opt.value].inactive
                            )}
                            onClick={() => handleProxyVote(member.memberId, opt.value)}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 참석 현황 (모든 회원, 운영진 투표 관리가 없을 때) ── */}
      {!canManage && match.status !== "COMPLETED" && baseRoster.length > 0 && (() => {
        const attend = baseRoster.filter((m) => memberVoteMap[m.memberId] === "ATTEND");
        const absent = baseRoster.filter((m) => memberVoteMap[m.memberId] === "ABSENT");
        const maybe = baseRoster.filter((m) => memberVoteMap[m.memberId] === "MAYBE");
        const noVote = baseRoster.filter((m) => !memberVoteMap[m.memberId]);
        return (
          <Card>
            <CardHeader>
              <CardTitle className="mt-1 font-heading text-lg sm:text-2xl font-bold uppercase">
                참석 현황
              </CardTitle>
              <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold">
                <span className="text-[hsl(var(--success))]">참석 {attend.length}</span>
                <span className="text-[hsl(var(--loss))]">불참 {absent.length}</span>
                <span className="text-[hsl(var(--warning))]">미정 {maybe.length}</span>
                <span className="text-muted-foreground">미투표 {noVote.length}</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {attend.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-[hsl(var(--success))]">참석</p>
                    <div className="flex flex-wrap gap-1.5">
                      {attend.map((m) => (
                        <span key={m.id} className="rounded-full bg-[hsl(var(--success)/0.1)] px-2.5 py-1 text-xs font-medium text-[hsl(var(--success))]">{m.name}</span>
                      ))}
                    </div>
                  </div>
                )}
                {maybe.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-[hsl(var(--warning))]">미정</p>
                    <div className="flex flex-wrap gap-1.5">
                      {maybe.map((m) => (
                        <span key={m.id} className="rounded-full bg-[hsl(var(--warning)/0.1)] px-2.5 py-1 text-xs font-medium text-[hsl(var(--warning))]">{m.name}</span>
                      ))}
                    </div>
                  </div>
                )}
                {absent.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-[hsl(var(--loss))]">불참</p>
                    <div className="flex flex-wrap gap-1.5">
                      {absent.map((m) => (
                        <span key={m.id} className="rounded-full bg-[hsl(var(--loss)/0.1)] px-2.5 py-1 text-xs font-medium text-[hsl(var(--loss))]">{m.name}</span>
                      ))}
                    </div>
                  </div>
                )}
                {noVote.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-muted-foreground">미투표</p>
                    <div className="flex flex-wrap gap-1.5">
                      {noVote.map((m) => (
                        <span key={m.id} className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">{m.name}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* ── 용병(게스트) 관리 (운영진 이상) ── */}
      {canManage && (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <p className="type-overline text-[hsl(var(--accent))]">
              Guests
            </p>
            <CardTitle className="mt-1 font-heading text-lg sm:text-2xl font-bold uppercase">
              용병 관리
            </CardTitle>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => setIsGuestFormOpen((prev) => !prev)}
          >
            {isGuestFormOpen ? "닫기" : "용병 등록"}
          </Button>
        </CardHeader>

        <CardContent>
          {isGuestFormOpen && (
            <form
              className="mb-4"
              action={(formData) => handleAddGuest(formData)}
            >
              <Card className="border-0 bg-secondary shadow-none">
                <CardContent className="p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">
                        이름 *
                      </Label>
                      <Input name="guestName" required placeholder="홍길동" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <fieldset>
                        <legend className="text-xs font-semibold text-muted-foreground mb-1">선호 포지션 (복수 선택)</legend>
                        <div className="flex flex-wrap gap-2">
                          {(["GK","CB","LB","RB","CDM","CM","CAM","LW","RW","ST"] as const).map((pos) => (
                            <label key={pos} className="flex items-center gap-1 text-xs cursor-pointer">
                              <input type="checkbox" name="guestPositions" value={pos} className="rounded" id={`guest-pos-${pos}`} />
                              {pos}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">
                        연락처
                      </Label>
                      <PhoneInput name="guestPhone" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">
                        메모
                      </Label>
                      <Input name="guestNote" placeholder="소속팀, 실력 등" />
                    </div>
                  </div>
                  <Button type="submit" className="mt-3 w-full" size="sm">
                    등록
                  </Button>
                </CardContent>
              </Card>
            </form>
          )}

          {guests.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              등록된 용병이 없습니다. 용병을 등록하면 전술판과 골 기록에서 선택할 수 있습니다.
            </p>
          ) : (
            <div className="space-y-2">
              {guests.map((guest) => (
                <Card
                  key={guest.id}
                  className="border-0 bg-secondary shadow-none"
                >
                  <CardContent className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold truncate">
                        {guest.name}
                        {guest.position && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            {guest.position}
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {[guest.phone ? formatPhone(guest.phone) : "", guest.note].filter(Boolean).join(" · ") || "용병"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveGuest(guest.id)}
                      className="min-h-[36px] min-w-[36px] rounded px-2 text-xs text-destructive/70 hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      삭제
                    </button>
                  </CardContent>
                </Card>
              ))}
              <p className="text-xs text-muted-foreground">
                총 {guests.length}명의 용병이 등록되었습니다.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* 자체전 팀 편성은 전술판 탭으로 이동 */}
    </>
  );
}

export const MatchInfoTab = memo(MatchInfoTabInner);
