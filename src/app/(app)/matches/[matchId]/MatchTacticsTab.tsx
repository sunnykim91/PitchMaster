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
import type { Match, SimpleRosterPlayer, InternalTeamAssignment } from "./matchDetailTypes";
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
  internalTeams?: InternalTeamAssignment[];
  refetchInternalTeams?: () => Promise<unknown>;
}

function MatchTacticsTabInner({
  matchId,
  match,
  canManage,
  attendingPlayers,
  roster,
  sportType,
  internalTeams,
  refetchInternalTeams,
}: MatchTacticsTabProps) {
  const [tacticsKey, setTacticsKey] = useState(0);
  const [generatedSquads, setGeneratedSquads] = useState<GeneratedSquad[]>([]);
  const isInternal = match.matchType === "INTERNAL";
  const [activeSide, setActiveSide] = useState<"A" | "B">("A");
  const [savingTeams, setSavingTeams] = useState(false);
  const [showTeamSplit, setShowTeamSplit] = useState(false);
  const { showToast } = useToast();

  // 자체전: 팀별 roster 필터링
  const filteredRoster = isInternal && internalTeams
    ? roster.filter((p) => internalTeams.some((t) => t.playerId === p.id && t.side === activeSide))
    : roster;
  const filteredAttending = isInternal && internalTeams
    ? attendingPlayers.filter((p) => internalTeams.some((t) => t.playerId === p.id && t.side === activeSide))
    : attendingPlayers;

  return (
    <>
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
            {/* 팀 편성 접기/펼치기 */}
            <Card className={hasTeams ? "border-[hsl(var(--success))]/20" : "border-[hsl(var(--warning))]/20"}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs">
                    <span className="font-bold text-sm">팀 편성</span>
                    {hasTeams ? (
                      <span className="ml-2">
                        <span className="text-primary font-semibold">A {teamACount}</span>
                        <span className="text-muted-foreground mx-1">vs</span>
                        <span className="text-[hsl(var(--info))] font-semibold">B {teamBCount}</span>
                        {unassignedCount > 0 && <span className="text-[hsl(var(--warning))] ml-1">· 미배정 {unassignedCount}</span>}
                      </span>
                    ) : (
                      <span className="ml-2 text-[hsl(var(--warning))]">편성 필요</span>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    {canManage && (
                      <Button size="sm" variant="outline" onClick={handleRandomSplit} disabled={savingTeams || attendingPlayers.length < 2}>
                        랜덤
                      </Button>
                    )}
                    {canManage && (
                      <Button size="sm" variant={showTeamSplit ? "default" : "outline"} onClick={() => setShowTeamSplit(!showTeamSplit)}>
                        {showTeamSplit ? "접기" : "편성"}
                      </Button>
                    )}
                  </div>
                </div>
                {/* 편성 그리드 */}
                {showTeamSplit && canManage && (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-1">
                    {attendingPlayers.map((m) => {
                      const cur = teamMap[m.id] ?? null;
                      return (
                        <div key={m.id} className={cn(
                          "flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs",
                          cur === "A" && "bg-primary/10",
                          cur === "B" && "bg-[hsl(var(--info))]/10",
                          !cur && "bg-secondary/50"
                        )}>
                          <span className="truncate flex-1 font-medium">{m.name}</span>
                          <button type="button" disabled={savingTeams}
                            onClick={() => assignSide(m.id, cur === "A" ? null : "A")}
                            className={cn("w-6 h-6 rounded text-[10px] font-bold transition-colors",
                              cur === "A" ? "bg-primary text-primary-foreground" : "text-muted-foreground/40 hover:text-primary"
                            )}>A</button>
                          <button type="button" disabled={savingTeams}
                            onClick={() => assignSide(m.id, cur === "B" ? null : "B")}
                            className={cn("w-6 h-6 rounded text-[10px] font-bold transition-colors",
                              cur === "B" ? "bg-[hsl(var(--info))] text-primary-foreground" : "text-muted-foreground/40 hover:text-[hsl(var(--info))]"
                            )}>B</button>
                        </div>
                      );
                    })}
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
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
                AI Recommendation
              </p>
              <CardTitle className="mt-1 font-heading text-lg sm:text-2xl font-bold uppercase">
                AI 포메이션 추천
              </CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        );
      })()}

      {canManage && (
        <AutoFormationBuilder
          matchId={matchId}
          quarterCount={match.quarterCount}
          attendingPlayers={filteredAttending}
          sportType={sportType}
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
    </>
  );
}

export const MatchTacticsTab = memo(MatchTacticsTabInner);
