"use client";

import { memo, useMemo, useRef, useState } from "react";
import { apiMutate } from "@/lib/useApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { Target } from "lucide-react";
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

  /* ── Local UI state ── */
  const [showDetailForm, setShowDetailForm] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [confirmGoalDelete, setConfirmGoalDelete] = useState<string | null>(null);
  const [showBulkAttendConfirm, setShowBulkAttendConfirm] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const voteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(votes).forEach((id) => {
      counts[id] = (counts[id] ?? 0) + 1;
    });
    return counts;
  }, [votes]);

  /** 득점자/어시스트 ID → 화면 표시용 이름 */
  function resolvePlayerName(playerId: string | undefined): string {
    if (!playerId) return "";
    if (playerId === "OPPONENT") return "실점";
    if (playerId === "UNKNOWN") return "득점";
    const special = specialPlayers.find((s) => s.id === playerId);
    if (special) return special.name;
    return fullRoster.find((p) => p.id === playerId)?.name ?? "모름";
  }

  /* ── Goal handlers ── */

  async function handleAddGoal(formData: FormData) {
    let scorerId = String(formData.get("scorerId") || "");
    const assistIdRaw = String(formData.get("assistId") || "");
    const assistId = assistIdRaw || undefined;
    const quarterRaw = Number(formData.get("quarter") ?? 1);
    const quarter = quarterRaw || 0;
    const minute = 0;
    let isOwnGoal = Boolean(formData.get("isOwnGoal"));

    if (scorerId === "OWN_GOAL") {
      isOwnGoal = true;
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
    formRef.current?.reset();
  }

  /* ── MVP handler ── */
  async function handleVote(candidateId: string) {
    await apiMutate("/api/mvp", "POST", { matchId, candidateId });
    await refetchMvp();
  }

  /* ── Attendance handler ── */
  async function handleAttendance(playerId: string, status: "PRESENT" | "ABSENT" | "LATE") {
    const attended = status === "PRESENT" || status === "LATE";
    await apiMutate("/api/attendance-check", "POST", {
      matchId,
      userId: playerId,
      attended,
    });
    await refetchAttendance();
  }

  return (
    <>
      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
        {/* ── 스코어보드 ── */}
        <Card className="card-featured">
          <div className="text-center">
            <p className="type-overline">경기 스코어</p>
            <div className="mt-3 flex items-center justify-center gap-6">
              {isInternal ? (
                <>
                  <div>
                    <p className="type-overline text-primary">A팀</p>
                    <p className="type-score text-primary">
                      {goals.filter((g) => g.side === "A").length}
                    </p>
                  </div>
                  <span className="text-2xl text-muted-foreground/40">:</span>
                  <div>
                    <p className="type-overline text-[hsl(var(--info))]">B팀</p>
                    <p className="type-score text-[hsl(var(--info))]">
                      {goals.filter((g) => g.side === "B").length}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="type-overline">우리팀</p>
                    <p className="type-score text-foreground">
                      {goals.filter((g) => g.scorerId !== "OPPONENT" && !g.isOwnGoal).length}
                    </p>
                  </div>
                  <span className="text-2xl text-muted-foreground/40">:</span>
                  <div>
                    <p className="type-overline">상대팀</p>
                    <p className="type-score text-muted-foreground/60">
                      {goals.filter((g) => g.scorerId === "OPPONENT" || g.isOwnGoal).length}
                    </p>
                  </div>
                </>
              )}
            </div>
            {canRecord && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {isInternal ? (
                  <>
                    <button
                      type="button"
                      onClick={() => { setShowDetailForm(true); /* A팀 골 기록 시 side는 선수 선택에서 자동 결정 */ }}
                      className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-[0_2px_8px_-2px_hsl(16_85%_58%/0.4)] transition-all hover:bg-primary/90 active:scale-95"
                    >
                      + A팀 골
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDetailForm(true)}
                      className="rounded-full bg-[hsl(var(--info))] px-5 py-2 text-xs font-bold text-primary-foreground shadow-[0_2px_8px_-2px_hsl(var(--info)/0.4)] transition-all hover:bg-[hsl(var(--info))]/90 active:scale-95"
                    >
                      + B팀 골
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowDetailForm(true)}
                      className="rounded-full bg-[hsl(var(--success))] px-5 py-2 text-xs font-bold text-white shadow-[0_2px_8px_-2px_hsl(var(--success)/0.4)] transition-all hover:bg-[hsl(var(--success))]/90 active:scale-95"
                    >
                      + 득점
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const formData = new FormData();
                        formData.set("scorerId", "OPPONENT");
                        formData.set("assistId", "");
                        formData.set("quarter", "0");
                        formData.set("minute", "0");
                        formData.set("isOwnGoal", "");
                        await handleAddGoal(formData);
                      }}
                      className="rounded-full bg-[hsl(var(--loss))] px-5 py-2 text-xs font-bold text-white shadow-[0_2px_8px_-2px_hsl(var(--loss)/0.4)] transition-all hover:bg-[hsl(var(--loss))]/90 active:scale-95"
                    >
                      + 실점
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* ── 상세 골 기록 (접기/펼치기) ── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-heading text-lg sm:text-2xl font-bold uppercase">
              상세 기록
            </CardTitle>
            <button
              type="button"
              onClick={() => setShowDetailForm((prev) => !prev)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showDetailForm ? "접기 ▲" : "펼치기 ▼"}
            </button>
          </CardHeader>

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
                      <p className="text-xs text-muted-foreground">
                        {goal.quarter > 0 ? `Q${goal.quarter}` : ""}
                        {goal.assistId
                          ? `${goal.quarter > 0 ? " · " : ""}A: ${resolvePlayerName(goal.assistId)}`
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
                          onClick={(e) => { e.stopPropagation(); setConfirmGoalDelete(goal.id); }}
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
          <Card>
            <CardHeader>
              <p className="type-overline text-[hsl(var(--info))]">
                MVP
              </p>
              <CardTitle className="mt-1 font-heading text-lg sm:text-2xl font-bold uppercase">
                MVP 투표
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="space-y-2">
                {attendingMembers.map((player) => (
                  <Button
                    key={player.id}
                    type="button"
                    variant={votes[userId] === player.id ? "default" : "outline"}
                    className="flex w-full items-center justify-between"
                    onClick={() => handleVote(player.id)}
                  >
                    <span className="font-semibold truncate">{player.name}</span>
                    <Badge
                      variant={
                        votes[userId] === player.id ? "secondary" : "outline"
                      }
                      className="ml-2"
                    >
                      {voteCounts[player.id] ?? 0}표
                    </Badge>
                  </Button>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                참석자만 1인 1표로 투표할 수 있습니다.
              </p>
            </CardContent>
          </Card>

          {/* ── 출석 체크 (staff only) ── */}
          {canManageAttendance && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <p className="type-overline">
                    Attendance
                  </p>
                  <CardTitle className="mt-1 font-heading text-lg sm:text-2xl font-bold uppercase">
                    출석 체크
                  </CardTitle>
                </div>
                {attendingMembers.length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowBulkAttendConfirm(true)}
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
                                handleAttendance(player.id, "PRESENT")
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
                                handleAttendance(player.id, "LATE")
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
                                handleAttendance(player.id, "ABSENT")
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

      {/* ── 골 삭제 확인 다이얼로그 ── */}
      <ConfirmDialog
        open={confirmGoalDelete !== null}
        title="골 기록 삭제"
        description="이 골 기록을 삭제하시겠습니까? 삭제된 기록은 복구할 수 없습니다."
        confirmLabel="삭제"
        cancelLabel="취소"
        variant="destructive"
        onConfirm={async () => {
          if (confirmGoalDelete) {
            await handleDeleteGoal(confirmGoalDelete);
          }
          setConfirmGoalDelete(null);
        }}
        onCancel={() => setConfirmGoalDelete(null)}
      />

      {/* ── 전원 출석 확인 다이얼로그 ── */}
      <ConfirmDialog
        open={showBulkAttendConfirm}
        title="전원 참석 처리"
        description={`참석 투표한 ${attendingMembers.length}명 전원을 출석으로 처리합니다.`}
        confirmLabel="전원 참석 처리"
        cancelLabel="취소"
        onConfirm={async () => {
          await Promise.all(
            attendingMembers.map((player) =>
              handleAttendance(player.id, "PRESENT")
            )
          );
          setShowBulkAttendConfirm(false);
        }}
        onCancel={() => setShowBulkAttendConfirm(false)}
      />
    </>
  );
}

export const MatchRecordTab = memo(MatchRecordTabInner);
