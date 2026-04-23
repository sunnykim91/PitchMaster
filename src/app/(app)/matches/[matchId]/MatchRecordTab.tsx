"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { apiMutate } from "@/lib/useApi";
import { useAsyncAction, useItemAction } from "@/lib/useAsyncAction";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/lib/ConfirmContext";
import { EmptyState } from "@/components/EmptyState";
import { Target, ChevronDown, Trophy, Check, Pencil, Trash2, Clock, GripVertical } from "lucide-react";
import { useToast } from "@/lib/ToastContext";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { KeyboardSensor } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type {
  Match,
  GoalEvent,
  Guest,
  VoteState,

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
  guests: Guest[];
  canRecord: boolean;
  /** MVP 투표 가능 여부 (mvp_vote_staff_only 설정 반영) */
  canVoteMvp: boolean;
  /** 현재 사용자가 운영진 이상인지 (직접 지정 여부) */
  isStaffVoter: boolean;
  /** 참석자 수 (투표율 계산용) */
  attendeeCount: number;
  attendingMembers: RosterPlayer[];
  fullRoster: SimpleRosterPlayer[];
  /** 골 데이터 refetch */
  refetchGoals: () => Promise<unknown>;
  /** MVP refetch */
  refetchMvp: () => Promise<unknown>;
  /** 자체전 팀 편성 */
  internalTeams?: InternalTeamAssignment[];
}

function MatchRecordTabInner({
  matchId,
  userId,
  match,
  goals,
  votes,
  guests,
  canRecord,
  canVoteMvp,
  isStaffVoter,
  attendeeCount,
  attendingMembers,
  fullRoster,
  refetchGoals,
  refetchMvp,
  internalTeams,
}: MatchRecordTabProps) {
  const { showToast } = useToast();
  const isInternal = match.matchType === "INTERNAL";

  const confirm = useConfirm();
  const [runAddGoal, addingGoal] = useAsyncAction();
  const [runDeleteGoal, deletingGoalId] = useItemAction();
  const [runMvpVote, mvpVotingId] = useItemAction();

  /* ── Local UI state ── */
  const [showDetailForm, setShowDetailForm] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editingIsOpponent, setEditingIsOpponent] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  /** 드래그 재정렬용 로컬 goals state (optimistic UI) */
  const [orderedGoals, setOrderedGoals] = useState<GoalEvent[]>(goals);
  useEffect(() => {
    setOrderedGoals(goals);
  }, [goals]);

  /** dnd-kit sensors — long-press(200ms) 활성화 + 5px 이동 이후 드래그 시작 */
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedGoals.findIndex((g) => g.id === active.id);
    const newIndex = orderedGoals.findIndex((g) => g.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const previous = orderedGoals;
    const next = arrayMove(orderedGoals, oldIndex, newIndex);
    setOrderedGoals(next); // optimistic
    const { error: err } = await apiMutate("/api/goals/reorder", "PUT", {
      matchId,
      goalIds: next.map((g) => g.id),
    });
    if (err) {
      setOrderedGoals(previous); // rollback
      showToast("순서 저장에 실패했습니다.", "error");
      return;
    }
    await refetchGoals();
  }

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

    // 자체전: 득점자의 소속팀(side) 결정
    let side: "A" | "B" | null = null;
    const formSide = String(formData.get("side") || "");
    if (formSide === "A" || formSide === "B") {
      side = formSide;
    } else if (editingGoalId) {
      // 수정 시: 기존 골의 side 보존
      const existingGoal = goals.find((g) => g.id === editingGoalId);
      side = existingGoal?.side ?? null;
    } else if (isInternal && internalTeams) {
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
      showToast("기록이 추가되었습니다.");
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
      if (quarterInput) quarterInput.value = String(goal.quarter ?? 0);
      if (ownGoalInput) ownGoalInput.checked = !!goal.isOwnGoal;
      const goalTypeSelect = form.elements.namedItem("goalType") as HTMLSelectElement;
      if (goalTypeSelect) goalTypeSelect.value = goal.goalType ?? "NORMAL";
      const quarterBtns = quarterInput?.parentElement?.querySelectorAll("button");
      quarterBtns?.forEach((btn) => {
        btn.classList.remove("bg-background", "text-foreground", "shadow-sm");
        btn.classList.add("text-muted-foreground");
      });
      // null/0 = 모름 → index 0 (모름 버튼), 1~N = 해당 쿼터 버튼
      const targetIdx = goal.quarter ?? 0;
      if (quarterBtns && quarterBtns[targetIdx]) {
        quarterBtns[targetIdx].classList.remove("text-muted-foreground");
        quarterBtns[targetIdx].classList.add("bg-background", "text-foreground", "shadow-sm");
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
    // 수정 취소 시 폼 자체도 닫음 (취소했는데 득점 추가 폼이 열려있으면 혼란)
    setShowDetailForm(false);
  }

  /* ── MVP handler ── */
  async function handleVote(candidateId: string) {
    await apiMutate("/api/mvp", "POST", { matchId, candidateId });
    await refetchMvp();
  }
  async function handleCancelVote() {
    await apiMutate(`/api/mvp?matchId=${encodeURIComponent(matchId)}`, "DELETE");
    await refetchMvp();
  }

  return (
    <>
      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
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
                    <Button type="button" className="flex-1 min-h-[48px] bg-primary/20 text-primary hover:bg-primary/30 font-semibold"
                      disabled={addingGoal}
                      onClick={() => runAddGoal(async () => {
                        const formData = new FormData();
                        formData.set("scorerId", "UNKNOWN");
                        formData.set("assistId", "");
                        formData.set("quarter", "0");
                        formData.set("minute", "0");
                        formData.set("isOwnGoal", "");
                        formData.set("goalType", "NORMAL");
                        formData.set("side", "A");
                        await handleAddGoal(formData);
                      })}>
                      {addingGoal ? "처리 중..." : "+ A팀 골"}
                    </Button>
                    <Button type="button" className="flex-1 min-h-[48px] bg-[hsl(var(--info))]/20 text-[hsl(var(--info))] hover:bg-[hsl(var(--info))]/30 font-semibold"
                      disabled={addingGoal}
                      onClick={() => runAddGoal(async () => {
                        const formData = new FormData();
                        formData.set("scorerId", "UNKNOWN");
                        formData.set("assistId", "");
                        formData.set("quarter", "0");
                        formData.set("minute", "0");
                        formData.set("isOwnGoal", "");
                        formData.set("goalType", "NORMAL");
                        formData.set("side", "B");
                        await handleAddGoal(formData);
                      })}>
                      {addingGoal ? "처리 중..." : "+ B팀 골"}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button type="button" className="flex-1 min-h-[48px] bg-[hsl(var(--success))]/20 text-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/30 font-semibold"
                      disabled={addingGoal}
                      onClick={() => runAddGoal(async () => {
                        const formData = new FormData();
                        formData.set("scorerId", "UNKNOWN");
                        formData.set("assistId", "");
                        formData.set("quarter", "0");
                        formData.set("minute", "0");
                        formData.set("isOwnGoal", "");
                        formData.set("goalType", "NORMAL");
                        await handleAddGoal(formData);
                      })}>
                      {addingGoal ? "처리 중..." : "+ 득점"}
                    </Button>
                    <Button type="button" className="flex-1 min-h-[48px] bg-destructive/20 text-destructive hover:bg-destructive/30 font-semibold"
                      disabled={addingGoal}
                      onClick={() => runAddGoal(async () => {
                        const formData = new FormData();
                        formData.set("scorerId", "OPPONENT");
                        formData.set("assistId", "");
                        formData.set("quarter", "0");
                        formData.set("minute", "0");
                        formData.set("isOwnGoal", "");
                        await handleAddGoal(formData);
                      })}>
                      {addingGoal ? "처리 중..." : "+ 실점"}
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
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-medium text-muted-foreground">득점자</p>
                      <select name="scorerId" className="h-12 w-full appearance-none rounded-xl border border-border bg-secondary px-4 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                        <option value="">선택</option>
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
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-[11px] font-medium text-muted-foreground">어시스트</p>
                      <select name="assistId" className="h-12 w-full appearance-none rounded-xl border border-border bg-secondary px-4 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                        <option value="">선택</option>
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
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-[11px] font-medium text-muted-foreground">골 유형</p>
                      <select name="goalType" defaultValue="NORMAL" className="h-12 w-full appearance-none rounded-xl border border-border bg-secondary px-4 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                        <option value="NORMAL">일반</option>
                        <option value="PK">PK (페널티킥)</option>
                        <option value="FK">FK (프리킥)</option>
                        <option value="HEADER">헤딩</option>
                        <option value="OWN_GOAL">자책골</option>
                      </select>
                    </div>
                  </div>
                  )}

                  {/* 쿼터 UI — 득점/실점 수정 모두 표시 */}
                  <div className={cn("space-y-1.5", !editingIsOpponent && "mt-4")}>
                    <p className="text-[11px] font-medium text-muted-foreground">쿼터</p>
                    <div className="flex gap-1 rounded-lg bg-secondary p-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          const input = e.currentTarget.parentElement?.querySelector("input[name=quarter]") as HTMLInputElement;
                          if (input) input.value = "0";
                          e.currentTarget.parentElement?.querySelectorAll("button").forEach((btn) => { btn.classList.remove("bg-background", "text-foreground", "shadow-sm"); btn.classList.add("text-muted-foreground"); });
                          e.currentTarget.classList.remove("text-muted-foreground"); e.currentTarget.classList.add("bg-background", "text-foreground", "shadow-sm");
                        }}
                        className="flex-1 rounded-md py-2 text-sm font-medium bg-background text-foreground shadow-sm"
                      >
                        모름
                      </button>
                      {Array.from({ length: match.quarterCount }, (_, i) => i + 1).map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={(e) => {
                            const input = e.currentTarget.parentElement?.querySelector("input[name=quarter]") as HTMLInputElement;
                            if (input) input.value = String(q);
                            e.currentTarget.parentElement?.querySelectorAll("button").forEach((btn) => { btn.classList.remove("bg-background", "text-foreground", "shadow-sm"); btn.classList.add("text-muted-foreground"); });
                            e.currentTarget.classList.remove("text-muted-foreground"); e.currentTarget.classList.add("bg-background", "text-foreground", "shadow-sm");
                          }}
                          className="flex-1 rounded-md py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                        >
                          Q{q}
                        </button>
                      ))}
                      <input name="quarter" type="hidden" defaultValue="0" />
                    </div>
                  </div>
                  <input name="minute" type="hidden" value="0" />

                  <div className="mt-4 flex gap-2">
                    <Button type="submit" className="flex-1 min-h-[48px] rounded-xl font-semibold">
                      {editingGoalId ? "수정 완료" : "기록 추가"}
                    </Button>
                    {editingGoalId && (
                      <Button type="button" variant="outline" className="min-h-[48px] rounded-xl px-6" onClick={handleCancelEdit}>
                        취소
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </form>
            )}

            <div className="space-y-2">
              {orderedGoals.length === 0 ? (
                <EmptyState icon={Target} title="아직 기록이 없습니다" description="위의 +득점 버튼으로 골을 기록하세요" />
              ) : canRecord ? (
                <>
                  <p className="text-[11px] text-muted-foreground">💡 카드를 길게 눌러 순서를 변경할 수 있어요</p>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={orderedGoals.map((g) => g.id)} strategy={verticalListSortingStrategy}>
                      {orderedGoals.map((goal) => (
                        <SortableGoalItem
                          key={goal.id}
                          goal={goal}
                          isInternal={isInternal}
                          resolvePlayerName={resolvePlayerName}
                          canRecord={canRecord}
                          deletingGoalId={deletingGoalId}
                          onEdit={() => handleEditGoal(goal)}
                          onDelete={async () => {
                            const ok = await confirm({
                              title: "골 기록 삭제",
                              description: "이 골 기록을 삭제할까요? 삭제된 기록은 복구할 수 없습니다.",
                              variant: "destructive",
                              confirmLabel: "삭제",
                              cancelLabel: "취소",
                            });
                            if (ok) runDeleteGoal(goal.id, () => handleDeleteGoal(goal.id));
                          }}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </>
              ) : (
                orderedGoals.map((goal) => (
                  <StaticGoalItem
                    key={goal.id}
                    goal={goal}
                    isInternal={isInternal}
                    resolvePlayerName={resolvePlayerName}
                  />
                ))
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
              {/* 투표율 / 모드 안내 */}
              {(() => {
                const totalVotes = Object.keys(voteCounts).reduce((sum, id) => sum + (voteCounts[id] ?? 0), 0);
                const pct = attendeeCount > 0 ? Math.round((totalVotes / attendeeCount) * 100) : null;
                const threshold70 = attendeeCount > 0 ? Math.ceil(attendeeCount * 0.7) : null;
                const reached = pct !== null && pct >= 70;
                if (!canVoteMvp) {
                  // 일반 팀원 — 운영진 전용 모드
                  return (
                    <p className="mb-3 text-xs text-muted-foreground">운영진이 MVP를 직접 선정합니다</p>
                  );
                }
                if (isStaffVoter) {
                  // 운영진 — 직접 지정 모드
                  return (
                    <p className="mb-3 text-xs text-[hsl(var(--warning))]">
                      운영진 선택 시 즉시 MVP 확정됩니다
                    </p>
                  );
                }
                // 일반 투표 모드 — 투표율 표시
                return (
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">참석자만 1인 1표</p>
                    {pct !== null && (
                      <span className={cn("text-xs font-medium", reached ? "text-[hsl(var(--win))]" : "text-muted-foreground")}>
                        {totalVotes}/{attendeeCount}명 투표 · {pct}%
                        {threshold70 !== null && !reached && ` (${threshold70}명 이상 필요)`}
                      </span>
                    )}
                  </div>
                );
              })()}

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
                      <div className="text-sm font-semibold text-[hsl(var(--warning))]">
                        {isStaffVoter ? "운영진 지정" : "현재 1위"}
                      </div>
                      <div className="font-bold">{topPlayer.name} ({topPlayer.count}표)</div>
                    </div>
                  </div>
                ) : null;
              })()}

              {canVoteMvp ? (
                <>
                  {votes[userId] && (
                    <div className="mb-2 flex justify-end">
                      <button
                        type="button"
                        disabled={!!mvpVotingId}
                        onClick={() => runMvpVote("__cancel__", handleCancelVote)}
                        className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
                      >
                        투표 취소
                      </button>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    {attendingMembers.map((player) => {
                      const isVoted = votes[userId] === player.id;
                      const count = voteCounts[player.id] ?? 0;
                      return (
                        <button
                          key={player.id}
                          type="button"
                          disabled={!!mvpVotingId}
                          onClick={() => runMvpVote(player.id, () => handleVote(player.id))}
                          className={cn(
                            "relative rounded-xl p-3 text-sm font-medium transition-all",
                            isVoted ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                            mvpVotingId === player.id && "opacity-70"
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
                </>
              ) : (
                // 일반 팀원 — 읽기 전용 결과 표시
                <div className="grid grid-cols-3 gap-2">
                  {attendingMembers.map((player) => {
                    const count = voteCounts[player.id] ?? 0;
                    return (
                      <div
                        key={player.id}
                        className="relative rounded-xl bg-secondary p-3 text-center text-sm font-medium text-secondary-foreground opacity-60"
                      >
                        {player.name}
                        {count > 0 && (
                          <Badge className="absolute -right-1.5 -top-1.5 bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))] text-[10px] px-1.5 min-w-[20px] h-[20px]">
                            {count}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 출석 체크는 별도 "출석" 탭으로 이동됨 */}
        </div>
      </section>

    </>
  );
}

export const MatchRecordTab = memo(MatchRecordTabInner);

/* ── 골 카드 내부 콘텐츠 (정적/드래그 공용) ── */
function GoalCardContent({
  goal,
  isInternal,
  resolvePlayerName,
}: {
  goal: GoalEvent;
  isInternal: boolean;
  resolvePlayerName: (id: string | undefined) => string;
}) {
  const label = goal.scorerId === "OPPONENT"
    ? <span className="text-[hsl(var(--loss))]">실점</span>
    : goal.isOwnGoal
    ? <span className="text-[hsl(var(--warning))]">자책골</span>
    : goal.scorerId === "UNKNOWN"
    ? <span className="text-[hsl(var(--success))]">득점</span>
    : <span className="text-[hsl(var(--success))]">{resolvePlayerName(goal.scorerId)}</span>;
  return (
    <div className="min-w-0">
      <p className="text-sm font-semibold truncate flex items-center gap-1.5">
        {isInternal && goal.side && (
          <Badge className={cn("text-[10px] px-1.5 py-0 border-0",
            goal.side === "A" ? "bg-primary/20 text-primary" : "bg-[hsl(var(--info))]/20 text-[hsl(var(--info))]"
          )}>{goal.side}팀</Badge>
        )}
        {label}
      </p>
      <p className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
        {(goal.quarter ?? 0) > 0 && (
          <span className="flex items-center gap-0.5">
            <Clock className="h-3 w-3" />Q{goal.quarter}
          </span>
        )}
        {goal.goalType && goal.goalType !== "NORMAL" && goal.goalType !== "OWN_GOAL" && (
          <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">{goal.goalType}</span>
        )}
        {goal.assistId
          ? <span>{((goal.quarter ?? 0) > 0 || (goal.goalType && goal.goalType !== "NORMAL" && goal.goalType !== "OWN_GOAL")) ? " · " : ""}A: {resolvePlayerName(goal.assistId)}</span>
          : ""}
      </p>
    </div>
  );
}

/* ── 드래그 가능 골 카드 (운영진) ── */
function SortableGoalItem({
  goal,
  isInternal,
  resolvePlayerName,
  canRecord,
  deletingGoalId,
  onEdit,
  onDelete,
}: {
  goal: GoalEvent;
  isInternal: boolean;
  resolvePlayerName: (id: string | undefined) => string;
  canRecord: boolean;
  deletingGoalId: string | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: goal.id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "card-list-item flex items-center justify-between gap-2 touch-none",
        isDragging && "scale-[1.02] shadow-xl ring-2 ring-primary/40",
      )}
    >
      {/* 드래그 핸들 영역: 카드 본문 전체 (long-press 후 드래그) */}
      <div className="flex items-center gap-2 min-w-0 flex-1 cursor-grab active:cursor-grabbing select-none" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/40" />
        <GoalCardContent goal={goal} isInternal={isInternal} resolvePlayerName={resolvePlayerName} />
      </div>
      {canRecord && (
        <div className="flex items-center gap-2 shrink-0" style={{ touchAction: "manipulation" }}>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="rounded-lg bg-secondary min-h-[44px] px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary/70 active:bg-secondary/50 active:scale-95 transition-all cursor-pointer select-none"
          >
            수정
          </button>
          <button
            type="button"
            disabled={deletingGoalId === goal.id}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="rounded-lg bg-[hsl(var(--loss)/0.15)] min-h-[44px] px-4 py-2 text-xs font-semibold text-[hsl(var(--loss))] hover:bg-[hsl(var(--loss)/0.25)] active:bg-[hsl(var(--loss)/0.35)] active:scale-95 transition-all cursor-pointer select-none disabled:opacity-50"
          >
            {deletingGoalId === goal.id ? "삭제 중..." : "삭제"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── 정적 골 카드 (일반 회원) ── */
function StaticGoalItem({
  goal,
  isInternal,
  resolvePlayerName,
}: {
  goal: GoalEvent;
  isInternal: boolean;
  resolvePlayerName: (id: string | undefined) => string;
}) {
  return (
    <div className="card-list-item flex items-center justify-between">
      <GoalCardContent goal={goal} isInternal={isInternal} resolvePlayerName={resolvePlayerName} />
    </div>
  );
}
