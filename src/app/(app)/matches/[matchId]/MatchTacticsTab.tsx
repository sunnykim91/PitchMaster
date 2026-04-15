"use client";

import { memo, useState } from "react";
import type { AttendingPlayer, GeneratedSquad } from "@/components/AutoFormationBuilder";
import { apiMutate } from "@/lib/useApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { recommendFormation, type PlayerInput } from "@/lib/formationAI";
import type { Match, SimpleRosterPlayer, InternalTeamAssignment, Guest } from "./matchDetailTypes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { X, ChevronDown, Sparkles, Users, Plus, Pencil, Lightbulb } from "lucide-react";
import { formatPhone } from "@/lib/utils";
import type { SportType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/lib/ToastContext";

/* ── Dynamic imports with loading UI ── */
const TacticsBoardSkeleton = () => (
  <div className="flex flex-col items-center justify-center py-12 gap-3">
    <Skeleton className="h-48 w-full rounded-xl" />
    <p className="text-xs text-muted-foreground">전술판 불러오는 중...</p>
  </div>
);

import TacticsBoard from "@/components/TacticsBoard";
import AutoFormationBuilder from "@/components/AutoFormationBuilder";

export interface MatchTacticsTabProps {
  matchId: string;
  match: Match;
  canManage: boolean;
  attendingPlayers: AttendingPlayer[];
  roster: SimpleRosterPlayer[];
  sportType: SportType;
  defaultFormationId?: string;
  internalTeams?: InternalTeamAssignment[];
  refetchInternalTeams?: () => Promise<unknown>;
  guests?: Guest[];
  refetchGuests?: () => Promise<unknown>;
  handleRemoveGuest?: (guestId: string) => Promise<void>;
  /** AI 코치 분석 활성화 여부 (김선휘 Feature Flag) */
  enableAi?: boolean;
}

function MatchTacticsTabInner({
  matchId,
  match,
  canManage,
  attendingPlayers,
  roster,
  sportType,
  defaultFormationId,
  internalTeams,
  refetchInternalTeams,
  guests,
  refetchGuests,
  handleRemoveGuest,
  enableAi = false,
}: MatchTacticsTabProps) {
  const [tacticsKey, setTacticsKey] = useState(0);
  const [generatedSquads, setGeneratedSquads] = useState<GeneratedSquad[]>([]);
  const isInternal = match.matchType === "INTERNAL";
  const [activeSide, setActiveSide] = useState<"A" | "B">("A");
  const [savingTeams, setSavingTeams] = useState(false);
  const [showTeamSplit, setShowTeamSplit] = useState(false);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [editingGuestId, setEditingGuestId] = useState<string | null>(null);
  const { showToast } = useToast();

  // 자체전: 팀별 roster 필터링
  const filteredRoster = isInternal && internalTeams
    ? roster.filter((p) => internalTeams.some((t) => t.playerId === p.id && t.side === activeSide))
    : roster;
  const filteredAttending = isInternal && internalTeams
    ? attendingPlayers.filter((p) => internalTeams.some((t) => t.playerId === p.id && t.side === activeSide))
    : attendingPlayers;

  return (
    <div className="grid gap-5 min-w-0 overflow-x-hidden">
      {/* ── 추천 포메이션 (룰 기반 제안) ── */}
      {/* 자체전: 팀 편성 + A/B 토글 통합 */}
      {isInternal && (() => {
        const teamMap: Record<string, "A" | "B"> = {};
        for (const t of internalTeams ?? []) teamMap[t.playerId] = t.side;
        const teamACount = Object.values(teamMap).filter((s) => s === "A").length;
        const teamBCount = Object.values(teamMap).filter((s) => s === "B").length;
        const unassignedCount = attendingPlayers.filter((p) => !teamMap[p.id]).length;
        const hasTeams = teamACount > 0 || teamBCount > 0;

        async function assignSide(playerId: string, side: "A" | "B" | null) {
          const newMap = { ...teamMap };
          if (side === null) delete newMap[playerId]; else newMap[playerId] = side;
          setSavingTeams(true);
          await apiMutate("/api/internal-teams", "POST", {
            matchId, teams: { A: Object.entries(newMap).filter(([, s]) => s === "A").map(([id]) => id), B: Object.entries(newMap).filter(([, s]) => s === "B").map(([id]) => id) },
          });
          setSavingTeams(false);
          refetchInternalTeams?.();
        }

        async function handleRandomSplit() {
          const shuffled = [...attendingPlayers].sort(() => Math.random() - 0.5);
          const half = Math.ceil(shuffled.length / 2);
          setSavingTeams(true);
          await apiMutate("/api/internal-teams", "POST", {
            matchId, teams: { A: shuffled.slice(0, half).map((m) => m.id), B: shuffled.slice(half).map((m) => m.id) },
          });
          setSavingTeams(false);
          showToast("랜덤 팀 편성 완료");
          refetchInternalTeams?.();
        }

        return (
          <>
            {/* 팀 편성 */}
            <Card className={cn("rounded-xl", hasTeams ? "border-[hsl(var(--success))]/20" : "border-[hsl(var(--warning))]/20")}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="text-xs">
                    <span className="flex items-center gap-1.5 font-bold text-sm"><Users className="h-4 w-4 text-primary" />팀 편성</span>
                    {unassignedCount > 0 && <span className="text-[hsl(var(--warning))] ml-2 font-medium">미배정 {unassignedCount}명</span>}
                  </div>
                  <div className="flex gap-1.5">
                    {canManage && (
                      <Button size="sm" variant="outline" onClick={handleRandomSplit} disabled={savingTeams || attendingPlayers.length < 2}>
                        {savingTeams ? "..." : "랜덤"}
                      </Button>
                    )}
                    <Button size="sm" variant={showTeamSplit ? "default" : "outline"} onClick={() => setShowTeamSplit(!showTeamSplit)}>
                      {showTeamSplit ? "접기" : "편성"}
                    </Button>
                  </div>
                </div>

                {showTeamSplit && (
                  <div className="max-h-[55vh] overflow-y-auto">
                    {/* 미배정 */}
                    {unassignedCount > 0 && canManage && (
                      <div className="mb-2 p-2 rounded-lg bg-[hsl(var(--warning))]/5 border border-[hsl(var(--warning))]/20">
                        <p className="text-xs font-semibold text-[hsl(var(--warning))] mb-1.5">미배정</p>
                        <div className="flex flex-wrap gap-1">
                          {attendingPlayers.filter((m) => !teamMap[m.id]).map((m) => (
                            <button key={m.id} type="button" disabled={savingTeams}
                              onClick={() => assignSide(m.id, "A")}
                              className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors">
                              {m.name}
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">탭하면 A팀으로 배정</p>
                      </div>
                    )}

                    {/* A팀 / B팀 2열 */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg border border-primary/30 bg-primary/5 p-2">
                        <p className="text-xs font-bold text-primary mb-1 sticky top-0 bg-[hsl(var(--card))] py-1.5 z-1 border-b border-primary/20">A팀 ({teamACount}명)</p>
                        <div className="space-y-px">
                          {attendingPlayers.filter((m) => teamMap[m.id] === "A").map((m) => (
                            <button key={m.id} type="button" disabled={savingTeams || !canManage}
                              onClick={() => assignSide(m.id, "B")}
                              className="flex w-full items-center rounded-md px-2 py-1.5 text-sm font-medium text-foreground hover:bg-[hsl(var(--info))]/15 active:bg-[hsl(var(--info))]/25 transition-colors min-h-[36px]">
                              <span className="truncate">{m.name}</span>
                              {canManage && <span className="ml-auto shrink-0 text-xs text-[hsl(var(--info))]/70">→B</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-lg border border-[hsl(var(--info))]/30 bg-[hsl(var(--info))]/5 p-2">
                        <p className="text-xs font-bold text-[hsl(var(--info))] mb-1 sticky top-0 bg-[hsl(var(--card))] py-1.5 z-1 border-b border-[hsl(var(--info))]/20">B팀 ({teamBCount}명)</p>
                        <div className="space-y-px">
                          {attendingPlayers.filter((m) => teamMap[m.id] === "B").map((m) => (
                            <button key={m.id} type="button" disabled={savingTeams || !canManage}
                              onClick={() => assignSide(m.id, "A")}
                              className="flex w-full items-center rounded-md px-2 py-1.5 text-sm font-medium text-foreground hover:bg-primary/15 active:bg-primary/25 transition-colors min-h-[36px]">
                              <span className="truncate">{m.name}</span>
                              {canManage && <span className="ml-auto shrink-0 text-xs text-primary/70">→A</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 접힌 상태에서 요약 */}
                {!showTeamSplit && hasTeams && (
                  <div className="flex items-center justify-center gap-4 py-1 text-sm font-semibold">
                    <span className="text-primary">A팀 {teamACount}명</span>
                    <span className="text-muted-foreground">vs</span>
                    <span className="text-[hsl(var(--info))]">B팀 {teamBCount}명</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* A/B 탭 토글 */}
            {hasTeams && (
              <div className="flex gap-2">
                <button type="button"
                  onClick={() => { setActiveSide("A"); setGeneratedSquads([]); setTacticsKey((k) => k + 1); }}
                  className={cn("flex-1 min-h-[44px] rounded-lg border px-4 text-sm font-bold transition-colors",
                    activeSide === "A" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                  )}>
                  A팀 ({teamACount}명)
                </button>
                <button type="button"
                  onClick={() => { setActiveSide("B"); setGeneratedSquads([]); setTacticsKey((k) => k + 1); }}
                  className={cn("flex-1 min-h-[44px] rounded-lg border px-4 text-sm font-bold transition-colors",
                    activeSide === "B" ? "border-[hsl(var(--info))] bg-[hsl(var(--info))]/10 text-[hsl(var(--info))]" : "border-border text-muted-foreground hover:border-[hsl(var(--info))]/30"
                  )}>
                  B팀 ({teamBCount}명)
                </button>
              </div>
            )}

            {/* 편성 안 됐으면 안내 */}
            {!hasTeams && !showTeamSplit && (
              <Card className="border-[hsl(var(--warning))]/20 bg-[hsl(var(--warning))]/5">
                <CardContent className="p-4 text-sm text-[hsl(var(--warning))] text-center">
                  위 &quot;편성&quot; 버튼으로 A/B팀을 먼저 나눠주세요.
                </CardContent>
              </Card>
            )}
          </>
        );
      })()}

      {/* ── 용병 관리 ── */}
      {canManage && (
        <div className="rounded-xl border border-border/30 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4">
            <span className="flex items-center gap-2 text-base font-bold">
              용병
              <Badge variant="secondary" className="text-xs">{(guests ?? []).length}명</Badge>
            </span>
            <Button
              type="button"
              size="sm"
              variant={showGuestForm ? "outline" : "default"}
              onClick={() => setShowGuestForm(!showGuestForm)}
              className="gap-1"
            >
              {showGuestForm ? "닫기" : (<><Plus className="h-4 w-4" />추가</>)}
            </Button>
          </div>
          <div className="space-y-4 px-5 pb-5">
            {showGuestForm && (
              <form action={async (formData) => {
                const name = String(formData.get("guestName") || "").trim();
                if (!name) return;
                const positions = formData.getAll("guestPositions").map(String).filter(Boolean);
                const phone = String(formData.get("guestPhone") || "") || undefined;
                const note = String(formData.get("guestNote") || "") || undefined;
                await apiMutate("/api/guests", "POST", { matchId, name, position: positions.join(",") || null, phone, note });
                setShowGuestForm(false);
                refetchGuests?.();
              }} className="space-y-4 rounded-xl bg-secondary/30 p-4">
                <div>
                  <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">이름 <span className="text-destructive">*</span></p>
                  <input name="guestName" required placeholder="용병 이름" className="h-12 w-full rounded-xl border-0 bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <p className="mb-2 text-[11px] font-medium text-muted-foreground">선호 포지션 (복수 선택)</p>
                  <div className="grid grid-cols-4 gap-2">
                    {(["GK","CB","LB","RB","CDM","CM","CAM","LW","RW","ST"] as const).map((pos) => (
                      <label key={pos} className="flex cursor-pointer items-center gap-2 rounded-lg bg-background px-3 py-2.5">
                        <input type="checkbox" name="guestPositions" value={pos} className="h-4 w-4 rounded border-border accent-primary" />
                        <span className="text-sm font-medium">{pos}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">연락처</p>
                  <PhoneInput name="guestPhone" />
                </div>
                <div>
                  <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">메모</p>
                  <input name="guestNote" placeholder="소속팀, 실력 등" className="h-12 w-full rounded-xl border-0 bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <Button type="submit" className="w-full h-12 rounded-xl">용병 등록</Button>
              </form>
            )}
            {(guests ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">등록된 용병이 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {(guests ?? []).map((g) => {
                  const isEditing = editingGuestId === g.id;
                  const existingPositions = (g.position ?? "")
                    .split(",")
                    .map((p) => p.trim())
                    .filter(Boolean);
                  return (
                    <li key={g.id} className="rounded-xl bg-secondary/30 p-3">
                      {isEditing ? (
                        <form
                          action={async (formData) => {
                            const name = String(formData.get("editName") || "").trim();
                            if (!name) return;
                            const positions = formData.getAll("editPositions").map(String).filter(Boolean);
                            const phone = String(formData.get("editPhone") || "") || undefined;
                            const note = String(formData.get("editNote") || "") || undefined;
                            const { error } = await apiMutate("/api/guests", "PUT", {
                              id: g.id,
                              name,
                              position: positions.join(",") || null,
                              phone,
                              note,
                            });
                            if (error) {
                              showToast("수정 실패: " + error, "error");
                              return;
                            }
                            showToast("용병 정보가 수정되었습니다.");
                            setEditingGuestId(null);
                            refetchGuests?.();
                          }}
                          className="space-y-3"
                        >
                          <div>
                            <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">
                              이름 <span className="text-destructive">*</span>
                            </p>
                            <input
                              name="editName"
                              required
                              defaultValue={g.name}
                              placeholder="용병 이름"
                              className="h-11 w-full rounded-xl border-0 bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                          <div>
                            <p className="mb-2 text-[11px] font-medium text-muted-foreground">선호 포지션 (복수 선택)</p>
                            <div className="grid grid-cols-4 gap-2">
                              {(["GK","CB","LB","RB","CDM","CM","CAM","LW","RW","ST"] as const).map((pos) => (
                                <label key={pos} className="flex cursor-pointer items-center gap-2 rounded-lg bg-background px-3 py-2">
                                  <input
                                    type="checkbox"
                                    name="editPositions"
                                    value={pos}
                                    defaultChecked={existingPositions.includes(pos)}
                                    className="h-4 w-4 rounded border-border accent-primary"
                                  />
                                  <span className="text-sm font-medium">{pos}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">연락처</p>
                            <PhoneInput name="editPhone" defaultValue={g.phone ?? ""} />
                          </div>
                          <div>
                            <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">메모</p>
                            <input
                              name="editNote"
                              defaultValue={g.note ?? ""}
                              placeholder="소속팀, 실력 등"
                              className="h-11 w-full rounded-xl border-0 bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button type="submit" size="sm" className="flex-1 rounded-xl">저장</Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="flex-1 rounded-xl"
                              onClick={() => setEditingGuestId(null)}
                            >
                              취소
                            </Button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold">{g.name}</p>
                            {g.position && (
                              <div className="flex flex-wrap gap-1">
                                {existingPositions.map((pos) => (
                                  <Badge key={pos} variant="secondary" className="text-[10px] px-1.5 py-0">{pos}</Badge>
                                ))}
                              </div>
                            )}
                            {(g.phone || g.note) && (
                              <p className="text-xs text-muted-foreground">{[g.phone ? formatPhone(g.phone) : "", g.note].filter(Boolean).join(" · ")}</p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingGuestId(g.id)}
                              title="수정"
                              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveGuest?.(g.id)}
                              title="삭제"
                              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* 추천 포메이션 + "처음이신가요?" 안내는 자동 편성 카드 내부 힌트·설명으로 통합됨 */}

      {canManage && (() => {
        // 참석 5명 이상이면 룰 기반 포메이션 추천 (자동 편성 상단 힌트로 노출)
        let recommendationHint: { formationName: string; formationId: string; reason: string } | undefined;
        if (filteredAttending.length >= 5) {
          const aiPlayers: PlayerInput[] = filteredAttending.map((p) => ({
            id: p.id,
            name: p.name,
            preferredPositions: p.preferredPositions ?? [p.preferredPosition],
          }));
          const maxPlayers = sportType === "FUTSAL" ? Math.min(filteredAttending.length, 8) : 11;
          const rec = recommendFormation(aiPlayers, Math.min(filteredAttending.length, maxPlayers), sportType);
          if (rec) {
            recommendationHint = {
              formationName: rec.formation.name,
              formationId: rec.formation.id,
              reason: rec.reason,
            };
          }
        }
        return (
          <AutoFormationBuilder
            matchId={matchId}
            quarterCount={match.quarterCount}
            attendingPlayers={filteredAttending}
            sportType={sportType}
            playerCount={match.playerCount}
            defaultFormationId={recommendationHint?.formationId ?? defaultFormationId}
            side={isInternal ? activeSide : undefined}
            onGenerated={(squads) => {
              setGeneratedSquads(squads);
              setTacticsKey((k) => k + 1);
            }}
            enableAi={enableAi}
            matchContext={{
              matchType: (match.matchType ?? "REGULAR"),
              opponent: match.opponent ?? null,
            }}
            recommendationHint={recommendationHint}
          />
        );
      })()}

      <TacticsBoard
        key={`${tacticsKey}-${activeSide}`}
        matchId={matchId}
        roster={filteredRoster}
        quarterCount={match.quarterCount}
        sportType={sportType}
        playerCount={match.playerCount}
        defaultFormationId={defaultFormationId}
        readOnly={!canManage}
        side={isInternal ? activeSide : undefined}
        initialSquads={generatedSquads.length > 0 ? generatedSquads.map((sq) => ({
          id: `gen-${sq.quarter_number}`,
          match_id: matchId,
          quarter_number: sq.quarter_number,
          formation: sq.formation,
          positions: sq.positions,
        })) : undefined}
      />

      {/* 용병 관리는 포메이션 위 상단에 배치 */}
    </div>
  );
}

export const MatchTacticsTab = memo(MatchTacticsTabInner);
