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
  comments,
  refetchComments,
}: MatchInfoTabProps) {
  const { showToast } = useToast();
  const [savingTeams, setSavingTeams] = useState(false);
  const [teamSheetOpen, setTeamSheetOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
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
      window.location.replace("/matches");
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
    <div className="grid gap-4">
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

      {/* 투표는 투표 탭으로 이동, 용병은 전술판 탭으로 이동 */}

      {/* ── 댓글 ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-heading text-lg sm:text-2xl font-bold uppercase">댓글</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* 댓글 입력 */}
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
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="댓글을 입력하세요..."
              maxLength={200}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button type="submit" size="sm" disabled={sendingComment || !commentText.trim()}>
              {sendingComment ? "..." : "전송"}
            </Button>
          </form>

          {/* 댓글 목록 */}
          {(comments ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-3">아직 댓글이 없습니다</p>
          ) : (
            <div className="space-y-2">
              {(comments ?? []).map((c) => (
                <div key={c.id} className="flex items-start gap-2 rounded-lg bg-secondary/50 px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">{c.users?.name ?? "알 수 없음"}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-foreground/90">{c.content}</p>
                  </div>
                  {c.user_id === userId && (
                    <button
                      type="button"
                      onClick={async () => {
                        await apiMutate(`/api/match-comments?id=${c.id}`, "DELETE");
                        refetchComments?.();
                      }}
                      className="shrink-0 text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                      삭제
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export const MatchInfoTab = memo(MatchInfoTabInner);
