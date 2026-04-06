"use client";

import { memo, useMemo, useRef, useState } from "react";
import { apiMutate } from "@/lib/useApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/lib/ConfirmContext";
import { EmptyState } from "@/components/EmptyState";
import { Target, ChevronDown, Trophy, Check, Pencil, Trash2, Clock } from "lucide-react";
import { useToast } from "@/lib/ToastContext";
import type {
  Match,
  GoalEvent,
  Guest,
  VoteState,
  AttendanceState,
  RosterPlayer,
  SimpleRosterPlayer,
  InternalTeamAssignment,
} from "./matchDetailTypes";
import { SPECIAL_PLAYERS as specialPlayers } from "./matchDetailTypes";

export interface MatchRecordTabProps {
  matchId: string;
  userId: string;
  match: Match;
  goals: GoalEvent[];
  votes: VoteState;
  attendance: AttendanceState;
  guests: Guest[];
  canManageAttendance: boolean;
  canRecord: boolean;
  attendingMembers: RosterPlayer[];
  fullRoster: SimpleRosterPlayer[];
  /** 골 데이터 refetch */
  refetchGoals: () => Promise<unknown>;
  /** MVP refetch */
  refetchMvp: () => Promise<unknown>;
  /** 출석 refetch */
  refetchAttendance: () => Promise<unknown>;
  /** 자체전 팀 편성 */
  internalTeams?: InternalTeamAssignment[];
}

function MatchRecordTabInner({
  matchId,
  userId,
  match,
  goals,
  votes,
  attendance,
  guests,
  canManageAttendance,
  canRecord,
  attendingMembers,
  fullRoster,
  refetchGoals,
  refetchMvp,
  refetchAttendance,
  internalTeams,
}: MatchRecordTabProps) {
  const { showToast } = useToast();
  const isInternal = match.matchType === "INTERNAL";

  const confirm = useConfirm();

  /* ── Local UI state ── */
  const [showDetailForm, setShowDetailForm] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editingIsOpponent, setEditingIsOpponent] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const voteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(votes).forEach((id) => {
      counts[id] = (counts[id] ?? 0) + 1;
    });
    return counts;
  }, [votes]);

  const guestIds = new Set(guests.map((g) => g.id));

  /** 득점자/어시스트 ID → 화면 표시용 이름 */
  function resolvePlayerName(playerId: string | undefined): string {
    if (!playerId) return "";
    if (playerId === "OPPONENT") return "실점";
    if (playerId === "UNKNOWN") return "득점";
    const special = specialPlayers.find((s) => s.id === playerId);
    if (special) return special.name;
    const player = fullRoster.find((p) => p.id === playerId);
    const name = player?.name ?? "모름";
    return guestIds.has(playerId) ? `${name}(용병)` : name;
  }

  /* ── Goal handlers ── */

  async function handleAddGoal(formData: FormData) {
    let scorerId = String(formData.get("scorerId") || "");
    const assistIdRaw = String(formData.get("assistId") || "");
    const assistId = assistIdRaw || undefined;
    const quarterRaw = Number(formData.get("quarter") ?? 1);
    const quarter = quarterRaw || 0;
    const minute = 0;
    let goalType = String(formData.get("goalType") || "NORMAL");
    let isOwnGoal = goalType === "OWN_GOAL";

    if (scorerId === "OWN_GOAL") {
      isOwnGoal = true;
      goalType = "OWN_GOAL";
      scorerId = "UNKNOWN";
    }
    if (!scorerId) {
      scorerId = "UNKNOWN";
    }

    // 자체전: 득점자의 소속팀(side) 자동 결정
    let side: "A" | "B" | null = null;
    if (isInternal && internalTeams) {
      const assignment = internalTeams.find((t) => t.playerId === scorerId);
      side = assignment?.side ?? null;
    }

    if (editingGoalId) {
      const { error: err } = await apiMutate("/api/goals", "PUT", {
        id: editingGoalId,
        scorerId,
        assistId,
        quarter,
        minute,
        isOwnGoal,
        goalType,
        side,
      });
      setEditingGoalId(null);
      if (err) { showToast("수정에 실패했습니다.", "error"); return; }
      showToast("기록이 수정되었습니다.");
    } else {
      const { error: err } = await apiMutate("/api/goals", "POST", {
        matchId,
        scorerId,
        assistId,
        quarter,
        minute,
        isOwnGoal,
        goalType,
        side,
      });
      if (err) { showToast("기록 추가에 실패했습니다.", "error"); return; }
    }
    formRef.current?.reset();
    setShowDetailForm(false);
    await refetchGoals();
  }

  function handleEditGoal(goal: GoalEvent) {
    setEditingGoalId(goal.id);
    setEditingIsOpponent(goal.scorerId === "OPPONENT" && !isInternal);
    setShowDetailForm(true);
    const setFormValues = () => {
      const form = formRef.current;
      if (!form) return false;
      const scorerSelect = form.elements.namedItem("scorerId") as HTMLSelectElement;
      if (!scorerSelect) return false;
      const assistSelect = form.elements.namedItem("assistId") as HTMLSelectElement;
      const quarterInput = form.elements.namedItem("quarter") as HTMLInputElement;
      const ownGoalInput = form.elements.namedItem("isOwnGoal") as HTMLInputElement;
      scorerSelect.value = goal.scorerId;
      if (assistSelect) assistSelect.value = goal.assistId ?? "";
      if (quarterInput) quarterInput.value = String(goal.quarter);
      if (ownGoalInput) ownGoalInput.checked = !!goal.isOwnGoal;
      const goalTypeSelect = form.elements.namedItem("goalType") as HTMLSelectElement;
      if (goalTypeSelect) goalTypeSelect.value = goal.goalType ?? "NORMAL";
      const quarterBtns = quarterInput?.parentElement?.querySelectorAll("button");
      quarterBtns?.forEach((btn) => {
        btn.classList.remove("bg-primary", "text-white");
        btn.classList.add("bg-secondary", "text-muted-foreground");
      });
      const targetIdx = goal.quarter;
      if (quarterBtns && quarterBtns[targetIdx]) {
        quarterBtns[targetIdx].classList.remove("bg-secondary", "text-muted-foreground");
        quarterBtns[targetIdx].classList.add("bg-primary", "text-white");
      }
      form.scrollIntoView({ behavior: "smooth", block: "center" });
      return true;
    };
    let attempts = 0;
    const trySet = () => {
      if (setFormValues() || ++attempts >= 5) return;
      setTimeout(trySet, 100);
    };
    setTimeout(trySet, 100);
  }

  async function handleDeleteGoal(goalId: string) {
    const { error: err } = await apiMutate(`/api/goals?id=${goalId}`, "DELETE");
    if (err) {
      showToast("삭제에 실패했습니다.", "error");
      return;
    }
    if (editingGoalId === goalId) setEditingGoalId(null);
    await refetchGoals();
    showToast("기록이 삭제되었습니다.");
  }

  function handleCancelEdit() {
    setEditingGoalId(null);
    setEditingIsOpponent(false);
    formRef.current?.reset();
  }

  /* ── MVP handler ── */
  async function handleVote(candidateId: string) {
    await apiMutate("/api/mvp", "POST", { matchId, candidateId });
    await refetchMvp();
  }

  /* ── Attendance handler ── */
  async function handleAttendance(player: RosterPlayer, status: "PRESENT" | "ABSENT" | "LATE") {
    const attended = status === "PRESENT" || status === "LATE";
    await apiMutate("/api/attendance-check", "POST", {
      matchId,
      ...(player.isLinked ? { userId: player.id } : { memberId: player.memberId }),
      attended,
    });
    await refetchAttendance();
  }

  return (
    <>
      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr] animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="space-y-5">
        {/* ── 스코어보드 ── */}
        <Card className="rounded-xl border-0 bg-gradient-to-br from-secondary to-background overflow-hidden">
          <CardContent className="p-6">
            <div className="mb-6 text-center">
              <div className="text-6xl font-black tabular-nums tracking-tighter">
                {isInternal ? (
                  <>
                    <span className="text-foreground">{goals.filter((g) => g.side === "A").length}</span>
                    <span className="mx-3 text-muted-foreground">:</span>
                    <span className="text-muted-foreground">{goals.filter((g) => g.side === "B").length}</span>
                  </>
                ) : (
                  <>
                    <span className="text-foreground">{goals.filter((g) => g.scorerId !== "OPPONENT" && !g.isOwnGoal).length}</span>
                    <span className="mx-3 text-muted-foreground">:</span>
                    <span className="text-muted-foreground">{goals.filter((g) => g.scorerId === "OPPONENT" || g.isOwnGoal).length}</span>
                  </>
                )}
              </div>
            </div>
            {canRecord && (
              <div className="flex gap-3">
                {isInternal ? (
                  <>
                    <Button type="button" className="flex-1 min-h-[48px] bg-primary/20 text-primary hover:bg-primary/30 font-semibold" onClick={() => setShowDetailForm(true)}>
                      + A팀 골
                    </Button>
                    <Button type="button" className="flex-1 min-h-[48px] bg-[hsl(var(--info))]/20 text-[hsl(var(--info))] hover:bg-[hsl(var(--info))]/30 font-semibold" onClick={() => setShowDetailForm(true)}>
                      + B팀 골
                    </Button>
                  </>
                ) : (
                  <>
                    <Button type="button" className="flex-1 min-h-[48px] bg-[hsl(var(--success))]/20 text-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/30 font-semibold" onClick={() => setShowDetailForm(true)}>
                      + 득점
                    </Button>
                    <Button type="button" className="flex-1 min-h-[48px] bg-destructive/20 text-destructive hover:bg-destructive/30 font-semibold"
                      onClick={async () => {
                        const formData = new FormData();
                        formData.set("scorerId", "OPPONENT");
                        formData.set("assistId", "");
                        formData.set("quarter", "0");
                        formData.set("minute", "0");
                        formData.set("isOwnGoal", "");
                        await handleAddGoal(formData);
                      }}>
                      + 실점
                    </Button>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── 골 기록 추가 (아코디언) ── */}
        <Card className="rounded-xl border-border/30 overflow-hidden">
          <button type="button" onClick={() => setShowDetailForm((prev) => !prev)}
            className="flex w-full items-center justify-between px-5 py-4 hover:bg-secondary/30 transition-colors">
            <span className="flex items-center gap-2 text-base font-bold">
              <Target className="h-4 w-4 text-primary" />
              골 기록 추가
            </span>
            <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform duration-200", showDetailForm && "rotate-180")} />
          </button>

          <CardContent>
            {showDetailForm && (
            <form
              ref={formRef}
              className="mb-4 grid gap-3"
              action={(formData) => handleAddGoal(formData)}
            >
              <Card className="border-0 bg-secondary shadow-none">
                <CardContent className="p-4">
                  {editingGoalId && (
                    <div className="mb-3 flex items-center gap-2 rounded-lg bg-[hsl(var(--warning)/0.1)] px-3 py-2 text-xs font-bold text-[hsl(var(--warning))]">
                      <span>기록 수정 중</span>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                      >
                        취소
                      </button>
                    </div>
                  )}

                  {/* 실점 수정 시 득점자/어시스트/골유형 숨김 (쿼터만 표시) */}
                  {editingIsOpponent && (
                    <>
                      <input name="scorerId" type="hidden" value="OPPONENT" />
                      <input name="assistId" type="hidden" value="" />
                      <input name="goalType" type="hidden" value="NORMAL" />
                      <p className="text-sm font-semibold text-[hsl(var(--loss))]">실점 기록 수정</p>
                    </>
                  )}

                  {!editingIsOpponent && (
                  <>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">
                        득점자
                      </Label>
                      <NativeSelect name="scorerId">
                        <option value="">득점자 선택</option>
                        <optgroup label="참석 멤버">
                          {attendingMembers.map((player) => (
                            <option key={player.id} value={player.id}>
                              {player.name}
                            </option>
                          ))}
                        </optgroup>
                        {guests.length > 0 && (
                          <optgroup label="용병">
                            {guests.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.name}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        <optgroup label="기타">
                          <option value="OWN_GOAL">자책골</option>
                          {specialPlayers.map((sp) => (
                            <option key={sp.id} value={sp.id}>
                              {sp.name}
                            </option>
                          ))}
                        </optgroup>
                      </NativeSelect>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">
                        어시스트
                      </Label>
                      <NativeSelect name="assistId">
                        <option value="">어시스트 선택</option>
                        <optgroup label="참석 멤버">
                          {attendingMembers.map((player) => (
                            <option key={player.id} value={player.id}>
                              {player.name}
                            </option>
                          ))}
                        </optgroup>
                        {guests.length > 0 && (
                          <optgroup label="용병">
                            {guests.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.name}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        <optgroup label="기타">
                          {specialPlayers.map((sp) => (
                            <option key={sp.id} value={sp.id}>
                              {sp.name}
                            </option>
                          ))}
                        </optgroup>
                      </NativeSelect>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      골 유형
                    </Label>
                    <NativeSelect name="goalType" defaultValue="NORMAL">
                      <option value="NORMAL">일반</option>
                      <option value="PK">PK (페널티킥)</option>
                      <option value="FK">FK (프리킥)</option>
                      <option value="HEADER">헤딩</option>
                      <option value="OWN_GOAL">자책골</option>
                    </NativeSelect>
                  </div>
                  </>
                  )}

                  <div className="mt-3 space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground">쿼터 (선택사항)</Label>
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          const input = e.currentTarget.parentElement?.querySelector("input[name=quarter]") as HTMLInputElement;
                          if (input) input.value = "0";
                          e.currentTarget.parentElement?.querySelectorAll("button").forEach((btn) => btn.classList.remove("bg-primary", "text-white"));
                          e.currentTarget.classList.add("bg-primary", "text-white");
                        }}
                        className="h-8 rounded-lg bg-primary px-3 text-xs font-bold text-white transition-colors hover:bg-primary/90"
                      >
                        선택 안함
                      </button>
                      {Array.from({ length: match.quarterCount }, (_, i) => i + 1).map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={(e) => {
                            const input = e.currentTarget.parentElement?.querySelector("input[name=quarter]") as HTMLInputElement;
                            if (input) input.value = String(q);
                            e.currentTarget.parentElement?.querySelectorAll("button").forEach((btn) => btn.classList.remove("bg-primary", "text-white"));
                            e.currentTarget.classList.add("bg-primary", "text-white");
                          }}
                          className="h-8 w-8 rounded-lg bg-secondary text-xs font-bold text-muted-foreground transition-colors hover:bg-secondary/80"
                        >
                          Q{q}
                        </button>
                      ))}
                      <input name="quarter" type="hidden" defaultValue="0" />
                    </div>
                  </div>
                  <input name="minute" type="hidden" value="0" />

                  <div className="mt-3 flex gap-2">
                    <Button type="submit" className="flex-1" size="sm">
                      {editingGoalId ? "수정 완료" : "기록 추가"}
                    </Button>
                    {editingGoalId && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCancelEdit}
                      >
                        취소
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </form>
            )}

            <div className="space-y-2">
              {goals.length === 0 ? (
                <EmptyState icon={Target} title="아직 기록이 없습니다" description="위의 +득점 버튼으로 골을 기록하세요" />
              ) : (
                goals.map((goal) => {
                  const label = goal.scorerId === "OPPONENT"
                    ? <span className="text-[hsl(var(--loss))]">실점</span>
                    : goal.isOwnGoal
                    ? <span className="text-[hsl(var(--warning))]">자책골</span>
                    : goal.scorerId === "UNKNOWN"
                    ? <span className="text-[hsl(var(--success))]">득점</span>
                    : <span className="text-[hsl(var(--success))]">{resolvePlayerName(goal.scorerId)}</span>;
                  return (
                  <div
                    key={goal.id}
                    className="card-list-item flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {label}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
                        {goal.quarter > 0 && <span>{goal.quarter}Q</span>}
                        {goal.goalType && goal.goalType !== "NORMAL" && goal.goalType !== "OWN_GOAL" && (
                          <span className="rounded bg-primary/15 px-1.5 py-0.5 text-xs font-bold text-primary">{goal.goalType}</span>
                        )}
                        {goal.assistId
                          ? <span>{(goal.quarter > 0 || (goal.goalType && goal.goalType !== "NORMAL" && goal.goalType !== "OWN_GOAL")) ? " · " : ""}A: {resolvePlayerName(goal.assistId)}</span>
                          : ""}
                      </p>
                    </div>
                    {canRecord && (
                      <div className="flex items-center gap-2 shrink-0" style={{ touchAction: "manipulation" }}>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleEditGoal(goal); }}
                          className="rounded-lg bg-secondary min-h-[44px] px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary/70 active:bg-secondary/50 active:scale-95 transition-all cursor-pointer select-none"
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            const ok = await confirm({
                              title: "골 기록 삭제",
                              description: "이 골 기록을 삭제하시겠습니까? 삭제된 기록은 복구할 수 없습니다.",
                              variant: "destructive",
                              confirmLabel: "삭제",
                              cancelLabel: "취소",
                            });
                            if (ok) handleDeleteGoal(goal.id);
                          }}
                          className="rounded-lg bg-[hsl(var(--loss)/0.15)] min-h-[44px] px-4 py-2 text-xs font-semibold text-[hsl(var(--loss))] hover:bg-[hsl(var(--loss)/0.25)] active:bg-[hsl(var(--loss)/0.35)] active:scale-95 transition-all cursor-pointer select-none"
                        >
                          삭제
                        </button>
                      </div>
                    )}
                  </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
        </div>

        {/* ── 우측 컬럼 ── */}
        <div className="space-y-5">
          {/* ── MVP 투표 ── */}
          <Card className="rounded-xl border-border/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <Trophy className="h-4 w-4 text-[hsl(var(--warning))]" />
                MVP 투표
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-xs text-muted-foreground">참석자만 1인 1표</p>

              {/* 현재 1위 */}
              {(() => {
                const topPlayer = attendingMembers.reduce<{ id: string; name: string; count: number } | null>((top, p) => {
                  const count = voteCounts[p.id] ?? 0;
                  if (count > 0 && (!top || count > top.count)) return { id: p.id, name: p.name, count };
                  return top;
                }, null);
                return topPlayer ? (
                  <div className="mb-4 flex items-center gap-3 rounded-xl bg-[hsl(var(--warning))]/10 p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--warning))]/20">
                      <Trophy className="h-5 w-5 text-[hsl(var(--warning))]" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[hsl(var(--warning))]">현재 1위</div>
                      <div className="font-bold">{topPlayer.name} ({topPlayer.count}표)</div>
                    </div>
                  </div>
                ) : null;
              })()}

              <div className="grid grid-cols-3 gap-2">
                {attendingMembers.map((player) => {
                  const isVoted = votes[userId] === player.id;
                  const count = voteCounts[player.id] ?? 0;
                  return (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => handleVote(player.id)}
                      className={cn(
                        "relative rounded-xl p-3 text-sm font-medium transition-all",
                        isVoted ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      )}
                    >
                      {player.name}
                      {count > 0 && (
                        <Badge className="absolute -right-1.5 -top-1.5 bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))] text-[10px] px-1.5 min-w-[20px] h-[20px]">
                          {count}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* ── 출석 체크 (staff only) ── */}
          {canManageAttendance && (
            <Card className="rounded-xl border-border/30">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-bold">출석 체크</CardTitle>
                {attendingMembers.length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 px-3 text-sm font-medium text-primary"
                    onClick={async () => {
                      const ok = await confirm({
                        title: "전원 참석 처리",
                        description: `참석 투표한 ${attendingMembers.length}명 전원을 출석으로 처리합니다.`,
                        confirmLabel: "전원 참석 처리",
                        cancelLabel: "취소",
                      });
                      if (ok) {
                        await Promise.all(
                          attendingMembers.map((player) => handleAttendance(player, "PRESENT"))
                        );
                      }
                    }}
                  >
                    전원 참석 처리
                  </Button>
                )}
              </CardHeader>

              <CardContent>
                <div className="space-y-2">
                  {attendingMembers.map((player) => {
                    const status = attendance[player.id];
                    return (
                      <Card
                        key={player.id}
                        className="border-0 bg-secondary shadow-none"
                      >
                        <CardContent className="flex items-center justify-between px-4 py-3">
                          <span className="text-sm font-semibold truncate">
                            {player.name}
                          </span>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant={
                                status === "PRESENT" ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() =>
                                handleAttendance(player, "PRESENT")
                              }
                            >
                              참석
                            </Button>
                            <Button
                              type="button"
                              variant={
                                status === "LATE" ? "warning" : "outline"
                              }
                              size="sm"
                              onClick={() =>
                                handleAttendance(player, "LATE")
                              }
                            >
                              지각
                            </Button>
                            <Button
                              type="button"
                              variant={
                                status === "ABSENT" ? "destructive" : "outline"
                              }
                              size="sm"
                              onClick={() =>
                                handleAttendance(player, "ABSENT")
                              }
                            >
                              불참
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  스태프 이상 권한만 출석을 관리할 수 있습니다.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

    </>
  );
}

export const MatchRecordTab = memo(MatchRecordTabInner);
