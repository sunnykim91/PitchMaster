"use client";

import { memo, useState } from "react";
import dynamic from "next/dynamic";
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

const TacticsBoard = dynamic(() => import("@/components/TacticsBoard"), {
  ssr: false,
  loading: () => <TacticsBoardSkeleton />,
});

const AutoFormationBuilder = dynamic(() => import("@/components/AutoFormationBuilder"), {
  ssr: false,
  loading: () => <TacticsBoardSkeleton />,
});

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
}: MatchTacticsTabProps) {
  const [tacticsKey, setTacticsKey] = useState(0);
  const [generatedSquads, setGeneratedSquads] = useState<GeneratedSquad[]>([]);
  const isInternal = match.matchType === "INTERNAL";
  const [activeSide, setActiveSide] = useState<"A" | "B">("A");
  const [savingTeams, setSavingTeams] = useState(false);
  const [showTeamSplit, setShowTeamSplit] = useState(false);
  const [showGuestForm, setShowGuestForm] = useState(false);
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
      {/* ── AI 포메이션 추천 ── */}
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
            <Card className={hasTeams ? "border-[hsl(var(--success))]/20" : "border-[hsl(var(--warning))]/20"}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="text-xs">
                    <span className="font-bold text-sm">팀 편성</span>
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <p className="type-overline text-[hsl(var(--accent))]">Guests</p>
              <CardTitle className="mt-1 font-heading text-lg sm:text-2xl font-bold uppercase">
                용병 관리
              </CardTitle>
            </div>
            <Button type="button" size="sm" onClick={() => setShowGuestForm(!showGuestForm)}>
              {showGuestForm ? "닫기" : "용병 등록"}
            </Button>
          </CardHeader>
          <CardContent>
            {showGuestForm && (
              <form className="mb-4" action={async (formData) => {
                const name = String(formData.get("guestName") || "").trim();
                if (!name) return;
                const positions = formData.getAll("guestPositions").map(String).filter(Boolean);
                const phone = String(formData.get("guestPhone") || "") || undefined;
                const note = String(formData.get("guestNote") || "") || undefined;
                await apiMutate("/api/guests", "POST", { matchId, name, position: positions.join(",") || null, phone, note });
                setShowGuestForm(false);
                refetchGuests?.();
              }}>
                <Card className="border-0 bg-secondary shadow-none">
                  <CardContent className="p-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground">이름 <span className="text-destructive">*</span></Label>
                        <Input name="guestName" required placeholder="홍길동" />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <fieldset>
                          <legend className="text-xs font-semibold text-muted-foreground mb-1">선호 포지션 (복수 선택)</legend>
                          <div className="flex flex-wrap gap-2">
                            {(["GK","CB","LB","RB","CDM","CM","CAM","LW","RW","ST"] as const).map((pos) => (
                              <label key={pos} className="flex items-center gap-1 text-xs cursor-pointer">
                                <input type="checkbox" name="guestPositions" value={pos} className="rounded" />
                                {pos}
                              </label>
                            ))}
                          </div>
                        </fieldset>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground">연락처</Label>
                        <PhoneInput name="guestPhone" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground">메모</Label>
                        <Input name="guestNote" placeholder="소속팀, 실력 등" />
                      </div>
                    </div>
                    <Button type="submit" className="mt-3 w-full" size="sm">등록</Button>
                  </CardContent>
                </Card>
              </form>
            )}
            {(guests ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">등록된 용병이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {(guests ?? []).map((g) => (
                  <Card key={g.id} className="border-0 bg-secondary shadow-none">
                    <CardContent className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold truncate">
                          {g.name}
                          {g.position && <Badge variant="outline" className="ml-2 text-xs">{g.position}</Badge>}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {[g.phone ? formatPhone(g.phone) : "", g.note].filter(Boolean).join(" · ") || "용병"}
                        </p>
                      </div>
                      <button type="button" onClick={() => handleRemoveGuest?.(g.id)}
                        className="min-h-[36px] min-w-[36px] rounded px-2 text-xs text-destructive/70 hover:bg-destructive/10 hover:text-destructive transition-colors">
                        삭제
                      </button>
                    </CardContent>
                  </Card>
                ))}
                <p className="text-xs text-muted-foreground">총 {(guests ?? []).length}명의 용병이 등록되었습니다.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {canManage && filteredAttending.length >= 5 && (() => {
        const aiPlayers: PlayerInput[] = filteredAttending.map((p) => ({
          id: p.id,
          name: p.name,
          preferredPositions: p.preferredPositions ?? [p.preferredPosition],
        }));
        const maxPlayers = sportType === "FUTSAL" ? Math.min(filteredAttending.length, 8) : 11;
        const rec = recommendFormation(aiPlayers, Math.min(filteredAttending.length, maxPlayers), sportType);
        if (!rec) return null;
        return (
          <details className="rounded-xl border border-primary/20 bg-primary/5 overflow-hidden">
            <summary className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-primary/8 transition-colors">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">AI Recommendation</p>
                <p className="mt-1 font-heading text-lg sm:text-2xl font-bold uppercase">AI 포메이션 추천</p>
              </div>
              <span className="text-muted-foreground text-xs">▼</span>
            </summary>
            <div className="px-6 pb-5">
              <p className="text-sm text-foreground/80">{rec.reason}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {rec.formation.slots.map((slot) => {
                  const playerId = rec.assignments[slot.id];
                  const player = aiPlayers.find((p) => p.id === playerId);
                  return (
                    <Badge key={slot.id} variant={player ? "default" : "secondary"} className="text-xs">
                      {slot.label}: {player?.name ?? "미배정"}
                    </Badge>
                  );
                })}
              </div>
              <Button
                type="button"
                size="sm"
                className="mt-4"
                onClick={async () => {
                  const squads: GeneratedSquad[] = Array.from(
                    { length: match.quarterCount },
                    (_, i) => ({
                      quarter_number: i + 1,
                      formation: rec.formation.id,
                      positions: Object.fromEntries(
                        rec.formation.slots.map((slot) => [
                          slot.id,
                          {
                            playerId: rec.assignments[slot.id] ?? "",
                            x: slot.x,
                            y: slot.y,
                          },
                        ])
                      ),
                    })
                  );
                  // API에 저장 (나갔다 들어와도 유지)
                  for (const sq of squads) {
                    await apiMutate("/api/squads", "POST", {
                      matchId,
                      quarterNumber: sq.quarter_number,
                      formation: sq.formation,
                      positions: sq.positions,
                    });
                  }
                  setGeneratedSquads(squads);
                  setTacticsKey((k) => k + 1);
                }}
              >
                AI 추천 적용하기
              </Button>
            </div>
          </details>
        );
      })()}

      {canManage && (
        <AutoFormationBuilder
          matchId={matchId}
          quarterCount={match.quarterCount}
          attendingPlayers={filteredAttending}
          sportType={sportType}
          defaultFormationId={defaultFormationId}
          side={isInternal ? activeSide : undefined}
          onGenerated={(squads) => {
            setGeneratedSquads(squads);
            setTacticsKey((k) => k + 1);
          }}
        />
      )}

      <TacticsBoard
        key={`${tacticsKey}-${activeSide}`}
        matchId={matchId}
        roster={filteredRoster}
        quarterCount={match.quarterCount}
        sportType={sportType}
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
