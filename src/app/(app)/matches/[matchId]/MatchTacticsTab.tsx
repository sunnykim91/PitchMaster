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
}

function MatchTacticsTabInner({
  matchId,
  match,
  canManage,
  attendingPlayers,
  roster,
  sportType,
  internalTeams,
}: MatchTacticsTabProps) {
  const [tacticsKey, setTacticsKey] = useState(0);
  const [generatedSquads, setGeneratedSquads] = useState<GeneratedSquad[]>([]);
  const isInternal = match.matchType === "INTERNAL";
  const [activeSide, setActiveSide] = useState<"A" | "B">("A");

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
      {/* 자체전 A/B 팀 토글 */}
      {isInternal && (
        <div className="flex gap-2 mb-2">
          <button
            type="button"
            onClick={() => { setActiveSide("A"); setTacticsKey((k) => k + 1); }}
            className={cn(
              "flex-1 rounded-lg border px-4 py-2.5 text-sm font-bold transition-colors",
              activeSide === "A"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/30"
            )}
          >
            A팀 전술
          </button>
          <button
            type="button"
            onClick={() => { setActiveSide("B"); setTacticsKey((k) => k + 1); }}
            className={cn(
              "flex-1 rounded-lg border px-4 py-2.5 text-sm font-bold transition-colors",
              activeSide === "B"
                ? "border-[hsl(var(--info))] bg-[hsl(var(--info))]/10 text-[hsl(var(--info))]"
                : "border-border text-muted-foreground hover:border-[hsl(var(--info))]/30"
            )}
          >
            B팀 전술
          </button>
        </div>
      )}

      {canManage && attendingPlayers.length >= 5 && (() => {
        const aiPlayers: PlayerInput[] = attendingPlayers.map((p) => ({
          id: p.id,
          name: p.name,
          preferredPositions: p.preferredPositions ?? [p.preferredPosition],
        }));
        const maxPlayers = sportType === "FUTSAL" ? Math.min(attendingPlayers.length, 8) : 11;
        const rec = recommendFormation(aiPlayers, Math.min(attendingPlayers.length, maxPlayers), sportType);
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
