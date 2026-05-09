"use client";

import { memo, useEffect, useRef, useState } from "react";
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
import { Target, ChevronDown, Check, Pencil, Trash2, Clock, GripVertical } from "lucide-react";
import { useToast } from "@/lib/ToastContext";
import { PlayerPicker, type PlayerPickerGroup } from "@/components/PlayerPicker";
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
  guests: Guest[];
  canRecord: boolean;
  /** 골/어시 PlayerPicker용 참석 멤버 */
  attendingMembers: RosterPlayer[];
  fullRoster: SimpleRosterPlayer[];
  /** 골 데이터 refetch */
  refetchGoals: () => Promise<unknown>;
  /** 자체전 팀 편성 */
  internalTeams?: InternalTeamAssignment[];
}

function MatchRecordTabInner({
  matchId,
  userId,
  match,
  goals,
  guests,
  canRecord,
  attendingMembers,
  fullRoster,
  refetchGoals,
  internalTeams,
}: MatchRecordTabProps) {
  const { showToast } = useToast();
  const isInternal = match.matchType === "INTERNAL";

  const confirm = useConfirm();
  const [runAddGoal, addingGoal] = useAsyncAction();
  const [runDeleteGoal, deletingGoalId] = useItemAction();

  /* ── Local UI state ── */
  const [showDetailForm, setShowDetailForm] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editingIsOpponent, setEditingIsOpponent] = useState(false);
  // 어시스트 PlayerPicker 명시적 펼침 (기본 접힘 — 어시 없는 골 흔하므로)
  const [showAssistPicker, setShowAssistPicker] = useState(false);
  // 폼 진입/리셋 시 어시 펼침 상태 reset
  useEffect(() => {
    setShowAssistPicker(false);
  }, [editingGoalId, showDetailForm]);
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
      // PlayerPicker(scorerId/assistId)는 key prop 리마운트로 defaultValue 자동 적용 — 외부 set 불필요
      const quarterInput = form.elements.namedItem("quarter") as HTMLInputElement | null;
      if (!quarterInput) return false;
      const ownGoalInput = form.elements.namedItem("isOwnGoal") as HTMLInputElement | null;
      if (quarterInput) quarterInput.value = String(goal.quarter ?? 0);
      if (ownGoalInput) ownGoalInput.checked = !!goal.isOwnGoal;
      const goalTypeSelect = form.elements.namedItem("goalType") as HTMLSelectElement | null;
      if (goalTypeSelect) goalTypeSelect.value = goal.goalType ?? "NORMAL";
      const quarterBtns = quarterInput?.parentElement?.querySelectorAll("button");
      quarterBtns?.forEach((btn) => {
        btn.classList.remove("bg-primary", "text-primary-foreground", "shadow-sm");
        btn.classList.add("text-muted-foreground");
      });
      // null/0 = 모름 → index 0 (모름 버튼), 1~N = 해당 쿼터 버튼
      const targetIdx = goal.quarter ?? 0;
      if (quarterBtns && quarterBtns[targetIdx]) {
        quarterBtns[targetIdx].classList.remove("text-muted-foreground");
        quarterBtns[targetIdx].classList.add("bg-primary", "text-primary-foreground", "shadow-sm");
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

  /* ── (MVP handlers는 MatchDiaryTab으로 이동됨) ── */

  return (
    <>
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
              <>
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
                    <Button type="button" aria-label="우리 팀 득점 기록 추가" className="flex-1 min-h-[48px] bg-[hsl(var(--success))]/20 text-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/30 font-semibold"
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
                    <Button type="button" aria-label="상대 팀 실점 기록 추가" className="flex-1 min-h-[48px] bg-destructive/20 text-destructive hover:bg-destructive/30 font-semibold"
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
              <p className="mt-2 text-xs text-muted-foreground leading-[1.5]">
                💡 한 번 누르면 즉시 기록됩니다. 득점자·쿼터·시간은 아래 골 카드의 <b className="font-semibold text-foreground">수정</b> 버튼으로 채워주세요.
              </p>
              </>
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

                  {!editingIsOpponent && (() => {
                    const editingGoal = editingGoalId ? goals.find((g) => g.id === editingGoalId) : undefined;
                    const scorerGroups: PlayerPickerGroup[] = [
                      { label: "참석 멤버", players: attendingMembers.map((p) => ({ id: p.id, name: p.name })), tone: "default" },
                      ...(guests.length > 0
                        ? ([{ label: "용병", players: guests.map((g) => ({ id: g.id, name: g.name })), tone: "guest" }] as PlayerPickerGroup[])
                        : []),
                      {
                        label: "기타",
                        players: [
                          { id: "OWN_GOAL", name: "⚽ 자책골" },
                          ...specialPlayers.map((sp) => ({ id: sp.id, name: sp.name })),
                        ],
                        tone: "special",
                      },
                    ];
                    const assistGroups: PlayerPickerGroup[] = [
                      { label: "참석 멤버", players: attendingMembers.map((p) => ({ id: p.id, name: p.name })), tone: "success" },
                      ...(guests.length > 0
                        ? ([{ label: "용병", players: guests.map((g) => ({ id: g.id, name: g.name })), tone: "guest" }] as PlayerPickerGroup[])
                        : []),
                      {
                        label: "기타",
                        players: specialPlayers.map((sp) => ({ id: sp.id, name: sp.name })),
                        tone: "special",
                      },
                    ];
                    const hasAssist = !!editingGoal?.assistId;
                    return (
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <p className="text-[13px] font-semibold text-foreground">득점자</p>
                      <PlayerPicker
                        key={`scorer-${editingGoalId ?? "new"}`}
                        name="scorerId"
                        defaultValue={editingGoal?.scorerId ?? ""}
                        groups={scorerGroups}
                        emptyLabel="선택"
                      />
                    </div>

                    <div className="space-y-2">
                      <p className="text-[13px] font-semibold text-foreground">어시스트</p>
                      {hasAssist || showAssistPicker ? (
                        <PlayerPicker
                          key={`assist-${editingGoalId ?? "new"}`}
                          name="assistId"
                          defaultValue={editingGoal?.assistId ?? ""}
                          groups={assistGroups}
                          emptyLabel="없음"
                        />
                      ) : (
                        <>
                          <input type="hidden" name="assistId" value="" />
                          <button
                            type="button"
                            onClick={() => setShowAssistPicker(true)}
                            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-dashed border-[hsl(var(--success))]/40 bg-[hsl(var(--success))]/5 text-[hsl(var(--success))] text-sm font-medium hover:border-[hsl(var(--success))]/70 hover:bg-[hsl(var(--success))]/10 transition-colors"
                          >
                            + 어시스트 추가
                          </button>
                        </>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-[12.5px] font-medium text-muted-foreground">골 유형</p>
                      <select name="goalType" defaultValue={editingGoal?.goalType ?? "NORMAL"} className="h-12 w-full appearance-none rounded-xl border border-border bg-secondary px-4 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                        <option value="NORMAL">일반</option>
                        <option value="PK">페널티킥 (PK)</option>
                        <option value="FK">프리킥 (FK)</option>
                        <option value="HEADER">헤딩</option>
                        <option value="OWN_GOAL">자책골</option>
                      </select>
                    </div>
                  </div>
                    );
                  })()}

                  {/* 쿼터 UI — 득점/실점 수정 모두 표시 */}
                  <div className={cn("space-y-1.5", !editingIsOpponent && "mt-4")}>
                    <p className="text-[12.5px] font-medium text-muted-foreground">쿼터</p>
                    <div className="flex gap-1 rounded-lg bg-secondary p-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          const input = e.currentTarget.parentElement?.querySelector("input[name=quarter]") as HTMLInputElement;
                          if (input) input.value = "0";
                          e.currentTarget.parentElement?.querySelectorAll("button").forEach((btn) => { btn.classList.remove("bg-primary", "text-primary-foreground", "shadow-sm"); btn.classList.add("text-muted-foreground"); });
                          e.currentTarget.classList.remove("text-muted-foreground"); e.currentTarget.classList.add("bg-primary", "text-primary-foreground", "shadow-sm");
                        }}
                        className="flex-1 rounded-md py-2 text-sm font-medium bg-primary text-primary-foreground shadow-sm"
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
                  <p className="text-[12.5px] text-muted-foreground">💡 카드를 길게 눌러 순서를 변경할 수 있어요</p>
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
          <Badge className={cn("text-[12px] px-1.5 py-0 border-0",
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
          <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[12px] font-bold text-primary">{goal.goalType}</span>
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
        "card-list-item flex items-center justify-between gap-2",
        isDragging && "scale-[1.02] shadow-xl ring-2 ring-primary/40",
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {/* 드래그 핸들: 이 영역만 long-press 시 드래그 시작. 카드 본문은 스크롤 자유 통과 */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="순서 변경 (길게 누르고 드래그)"
          className="shrink-0 -ml-1 px-2 py-3 cursor-grab active:cursor-grabbing select-none touch-none text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors"
        >
          <GripVertical className="h-5 w-5" />
        </button>
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
