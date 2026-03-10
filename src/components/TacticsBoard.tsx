"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formationTemplates } from "@/lib/formations";
import { useApi, apiMutate } from "@/lib/useApi";
import type { DetailedPosition } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Player = {
  id: string;
  name: string;
  role: DetailedPosition;
};

type TacticsBoardProps = {
  matchId: string;
  roster: Player[];
  quarterCount: number;
  teamSettings?: TeamSettings;
};

type Placement = {
  playerId: string;
  x: number;
  y: number;
};

type BoardState = {
  formationId: string;
  placements: Record<string, Placement | null>;
};

type TeamSettings = {
  uniformPrimary: string;
  uniformSecondary: string;
  uniformPattern?: "SOLID" | "STRIPES_VERTICAL" | "STRIPES_HORIZONTAL" | "STRIPES_DIAGONAL";
};

type SquadRow = {
  id: string;
  match_id: string;
  quarter_number: number;
  formation: string;
  positions: Record<string, Placement | null>;
};

type SquadsApiResponse = {
  squads: SquadRow[];
};

type TeamApiResponse = {
  team: {
    name: string;
    logo_url: string;
    invite_code: string;
    uniform_primary: string;
    uniform_secondary: string;
    uniform_pattern: TeamSettings["uniformPattern"];
  };
};

const SAVE_DEBOUNCE_MS = 800;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export default function TacticsBoard({ matchId, roster, quarterCount, teamSettings: teamSettingsProp }: TacticsBoardProps) {
  const defaultFormation = formationTemplates[0];
  const quarters = useMemo(
    () => Array.from({ length: Math.max(1, quarterCount) }, (_, index) => index + 1),
    [quarterCount]
  );
  const [activeQuarter, setActiveQuarter] = useState(quarters[0]);

  // ── Fetch squads from API ──
  const {
    data: squadsData,
    loading: squadsLoading,
  } = useApi<SquadsApiResponse>(
    `/api/squads?matchId=${matchId}`,
    { squads: [] }
  );

  // ── Fetch team settings from API (only if not passed as prop) ──
  const {
    data: teamApiData,
    loading: teamLoading,
  } = useApi<TeamApiResponse>(
    "/api/teams",
    {
      team: {
        name: "",
        logo_url: "",
        invite_code: "",
        uniform_primary: "#2563eb",
        uniform_secondary: "#f97316",
        uniform_pattern: "SOLID",
      },
    },
    { skip: Boolean(teamSettingsProp) }
  );

  const resolvedTeamSettings = useMemo<TeamSettings>(() => {
    if (teamSettingsProp) return teamSettingsProp;
    const t = teamApiData.team;
    return {
      uniformPrimary: t.uniform_primary || "#2563eb",
      uniformSecondary: t.uniform_secondary || "#f97316",
      uniformPattern: t.uniform_pattern || "SOLID",
    };
  }, [teamSettingsProp, teamApiData]);

  // ── Board state (local, hydrated from API) ──
  const defaultBoardState = useMemo<BoardState>(() => ({
    formationId: defaultFormation.id,
    placements: Object.fromEntries(defaultFormation.slots.map((slot) => [slot.id, null])),
  }), [defaultFormation]);

  const [boardState, setBoardState] = useState<BoardState>(defaultBoardState);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<BoardState | null>(null);

  // Hydrate board state from API data whenever squadsData or activeQuarter changes
  useEffect(() => {
    if (squadsLoading) return;

    const row = squadsData.squads.find((s) => s.quarter_number === activeQuarter);
    if (row) {
      const formation = formationTemplates.find((f) => f.id === row.formation) ?? defaultFormation;
      const normalizedPlacements: Record<string, Placement | null> = {};
      formation.slots.forEach((slot) => {
        normalizedPlacements[slot.id] = row.positions?.[slot.id] ?? null;
      });
      setBoardState({ formationId: formation.id, placements: normalizedPlacements });
    } else {
      setBoardState({
        formationId: defaultFormation.id,
        placements: Object.fromEntries(defaultFormation.slots.map((slot) => [slot.id, null])),
      });
    }
    setHydrated(true);
  }, [squadsData, squadsLoading, activeQuarter, defaultFormation]);

  // ── Debounced save to API ──
  const saveToApi = useCallback(async (state: BoardState) => {
    setSaving(true);
    await apiMutate("/api/squads", "POST", {
      matchId,
      quarterNumber: activeQuarter,
      formation: state.formationId,
      positions: state.placements,
    });
    setSaving(false);
  }, [matchId, activeQuarter]);

  const debouncedSave = useCallback((state: BoardState) => {
    pendingSaveRef.current = state;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      if (pendingSaveRef.current) {
        saveToApi(pendingSaveRef.current);
        pendingSaveRef.current = null;
      }
    }, SAVE_DEBOUNCE_MS);
  }, [saveToApi]);

  // Flush pending saves on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      if (pendingSaveRef.current) {
        saveToApi(pendingSaveRef.current);
      }
    };
  }, [saveToApi]);

  // Wrapper that updates local state and triggers debounced save
  const updateBoardState = useCallback((updater: BoardState | ((prev: BoardState) => BoardState)) => {
    setBoardState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      debouncedSave(next);
      return next;
    });
  }, [debouncedSave]);

  const [uniformMode, setUniformMode] = useState<"HOME" | "AWAY">("HOME");
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ slotId: string } | null>(null);

  const formation = useMemo(
    () => formationTemplates.find((item) => item.id === boardState.formationId) ?? defaultFormation,
    [boardState.formationId, defaultFormation]
  );

  const placements = useMemo(() => {
    const normalized: Record<string, Placement | null> = {};
    formation.slots.forEach((slot) => {
      normalized[slot.id] = boardState.placements[slot.id] ?? null;
    });
    return normalized;
  }, [boardState.placements, formation.slots]);

  const assignedPlayers = useMemo(() => {
    const map = new Map<string, string>();
    Object.entries(placements).forEach(([slotId, placement]) => {
      if (placement) {
        map.set(placement.playerId, slotId);
      }
    });
    return map;
  }, [placements]);

  const sortedRoster = useMemo(() => {
    const unassigned: Player[] = [];
    const assigned: Player[] = [];
    roster.forEach((player) => {
      if (assignedPlayers.has(player.id)) {
        assigned.push(player);
      } else {
        unassigned.push(player);
      }
    });
    return [...unassigned, ...assigned];
  }, [assignedPlayers, roster]);

  function parseHexColor(hexColor: string) {
    const color = hexColor.replace("#", "");
    const r = parseInt(color.slice(0, 2), 16) || 0;
    const g = parseInt(color.slice(2, 4), 16) || 0;
    const b = parseInt(color.slice(4, 6), 16) || 0;
    return { r, g, b };
  }

  function getTextColor(primary: string, secondary: string) {
    const c1 = parseHexColor(primary);
    const c2 = parseHexColor(secondary);
    const r = (c1.r + c2.r) / 2;
    const g = (c1.g + c2.g) / 2;
    const b = (c1.b + c2.b) / 2;
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.62 ? "#0a0e14" : "#f0f4f8";
  }

  function getUniformStyle(primary: string, secondary: string, pattern: string) {
    if (pattern === "STRIPES_VERTICAL") {
      return {
        backgroundColor: primary,
        backgroundImage: `repeating-linear-gradient(90deg, ${primary} 0 10px, ${secondary} 10px 20px)`
      };
    }
    if (pattern === "STRIPES_HORIZONTAL") {
      return {
        backgroundColor: primary,
        backgroundImage: `repeating-linear-gradient(180deg, ${primary} 0 10px, ${secondary} 10px 20px)`
      };
    }
    if (pattern === "STRIPES_DIAGONAL") {
      return {
        backgroundColor: primary,
        backgroundImage: `repeating-linear-gradient(135deg, ${primary} 0 10px, ${secondary} 10px 20px)`
      };
    }
    return { backgroundColor: primary };
  }

  function getJerseyStyle(primary: string, secondary: string, pattern: string) {
    return {
      ...getUniformStyle(primary, secondary, pattern),
      clipPath:
        "polygon(12% 12%, 30% 12%, 34% 0%, 66% 0%, 70% 12%, 88% 12%, 100% 34%, 86% 48%, 86% 100%, 14% 100%, 14% 48%, 0% 34%)",
      borderRadius: "8px",
    } as const;
  }

  useEffect(() => {
    function handlePointerMove(event: Event) {
      if (!dragRef.current || !boardRef.current) return;
      const pointerEvent = event as PointerEvent;
      pointerEvent.preventDefault();
      const rect = boardRef.current.getBoundingClientRect();
      const x = clamp(((pointerEvent.clientX - rect.left) / rect.width) * 100, 5, 95);
      const y = clamp(((pointerEvent.clientY - rect.top) / rect.height) * 100, 6, 94);
      const slotId = dragRef.current.slotId;
      updateBoardState((prev) => {
        const current = prev.placements[slotId];
        if (!current) return prev;
        return {
          ...prev,
          placements: {
            ...prev.placements,
            [slotId]: { ...current, x, y },
          },
        };
      });
    }

    function handlePointerUp() {
      dragRef.current = null;
    }

    const options = { passive: false } as AddEventListenerOptions;
    window.addEventListener("pointermove", handlePointerMove, options);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove, options);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [updateBoardState]);

  function handleFormationChange(nextId: string) {
    const nextFormation = formationTemplates.find((item) => item.id === nextId) ?? defaultFormation;
    const nextPlacements: Record<string, Placement | null> = {};
    nextFormation.slots.forEach((slot) => {
      nextPlacements[slot.id] = null;
    });
    updateBoardState({ formationId: nextFormation.id, placements: nextPlacements });
    setActiveSlotId(null);
  }

  function handleSelectSlot(slotId: string) {
    setActiveSlotId(slotId);
  }

  function handleAssignPlayer(slotId: string, playerId: string) {
    if (assignedPlayers.has(playerId)) return;
    const slot = formation.slots.find((item) => item.id === slotId);
    if (!slot) return;
    updateBoardState((prev) => {
      const nextPlacements = { ...prev.placements };
      Object.entries(nextPlacements).forEach(([key, placement]) => {
        if (placement?.playerId === playerId) {
          nextPlacements[key] = null;
        }
      });
      nextPlacements[slotId] = { playerId, x: slot.x, y: slot.y };
      return { ...prev, placements: nextPlacements };
    });
  }

  function handleClearSlot(slotId: string) {
    updateBoardState((prev) => ({
      ...prev,
      placements: { ...prev.placements, [slotId]: null },
    }));
  }

  function clearBoard() {
    const reset: Record<string, Placement | null> = {};
    formation.slots.forEach((slot) => {
      reset[slot.id] = null;
    });
    updateBoardState({ formationId: formation.id, placements: reset });
    setActiveSlotId(null);
  }

  if (squadsLoading || (!teamSettingsProp && teamLoading) || !hydrated) {
    return <Card className="p-6">불러오는 중...</Card>;
  }

  return (
    <Card className="p-6">
      <CardContent className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary">Tactics</p>
            <h3 className="mt-1 font-heading text-xl font-bold uppercase text-foreground">전술판 편성</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1">
              {quarters.map((quarter) => (
                <Button
                  key={quarter}
                  type="button"
                  variant={activeQuarter === quarter ? "info" : "outline"}
                  size="sm"
                  onClick={() => {
                    setActiveQuarter(quarter);
                    setActiveSlotId(null);
                  }}
                  className="rounded-xl"
                >
                  {quarter}쿼터
                </Button>
              ))}
            </div>
            <Select value={formation.id} onValueChange={handleFormationChange}>
              <SelectTrigger className="w-auto min-w-[140px] rounded-xl text-xs font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {formationTemplates.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="secondary" className="flex items-center gap-1 rounded-xl px-1 py-1">
              <Button
                type="button"
                variant={uniformMode === "HOME" ? "default" : "outline"}
                size="sm"
                onClick={() => setUniformMode("HOME")}
                className="rounded-lg px-3 py-1 text-xs font-semibold"
              >
                홈
              </Button>
              <Button
                type="button"
                variant={uniformMode === "AWAY" ? "warning" : "outline"}
                size="sm"
                onClick={() => setUniformMode("AWAY")}
                className="rounded-lg px-3 py-1 text-xs font-semibold"
              >
                원정
              </Button>
            </Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearBoard}
              className="rounded-xl"
            >
              초기화
            </Button>
            {saving && (
              <span className="text-xs text-muted-foreground animate-pulse">저장 중...</span>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Soccer pitch */}
          <div
            ref={boardRef}
            className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-primary/20"
            style={{
              touchAction: "none",
              background: "linear-gradient(180deg, #14532d 0%, #166534 30%, #15803d 60%, #166534 100%)",
              backgroundImage:
                "linear-gradient(90deg, rgba(255,255,255,0.03) 0%, transparent 50%, rgba(255,255,255,0.03) 100%), repeating-linear-gradient(180deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 48px)"
            }}
          >
            <div className="absolute inset-4 rounded-xl border border-white/20"></div>
            <div className="absolute inset-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20"></div>
            <div className="absolute inset-x-8 top-6 h-16 rounded-lg border border-white/20"></div>
            <div className="absolute inset-x-8 bottom-6 h-16 rounded-lg border border-white/20"></div>
            <div className="absolute inset-x-0 top-1/2 h-px bg-white/15"></div>

            {formation.slots.map((slot) => {
              const placement = placements[slot.id];
              if (!placement) {
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => handleSelectSlot(slot.id)}
                    className={cn(
                      "absolute flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-[11px] font-bold text-white transition",
                      activeSlotId === slot.id
                        ? "border-primary/60 bg-primary/20 shadow-lg shadow-primary/20"
                        : "border-white/25 bg-black/25"
                    )}
                    style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                  >
                    {slot.label}
                  </button>
                );
              }

              const player = roster.find((item) => item.id === placement.playerId);
              const homePrimary = resolvedTeamSettings.uniformPrimary || "#2563eb";
              const homeSecondary = resolvedTeamSettings.uniformSecondary || "#f97316";
              const badgePrimary = uniformMode === "HOME" ? homePrimary : homeSecondary;
              const badgeSecondary = uniformMode === "HOME" ? homeSecondary : homePrimary;
              const badgePattern = resolvedTeamSettings.uniformPattern || "SOLID";
              const textColor = getTextColor(badgePrimary, badgeSecondary);
              const uniformStyle = getJerseyStyle(badgePrimary, badgeSecondary, badgePattern);
              return (
                <button
                  key={slot.id}
                  type="button"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.currentTarget.setPointerCapture(event.pointerId);
                    dragRef.current = { slotId: slot.id };
                  }}
                  onClick={() => handleSelectSlot(slot.id)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-xl px-2 py-2 text-[11px] font-bold shadow-lg shadow-black/40 transition"
                  style={{ left: `${placement.x}%`, top: `${placement.y}%`, touchAction: "none" }}
                >
                  <span className="flex flex-col items-center gap-1">
                    <span className="block h-10 w-10 border border-white/20" style={uniformStyle} />
                    <span
                      className="block max-w-[96px] truncate whitespace-nowrap text-[11px]"
                      style={{ color: textColor }}
                    >
                      {player?.name ?? "선수"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Roster panel */}
          <div className="space-y-4">
            <Card className="border-0 bg-secondary">
              <CardContent className="p-4">
                <p className="text-sm font-bold text-foreground">선택한 포지션</p>
                {activeSlotId ? (
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <p>
                      포지션: {formation.slots.find((slot) => slot.id === activeSlotId)?.label}
                    </p>
                    {placements[activeSlotId] ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleClearSlot(activeSlotId)}
                        className="rounded-xl"
                      >
                        배치 해제
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground">선수를 선택해주세요.</p>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">포지션을 선택하세요.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 bg-secondary">
              <CardContent className="p-4">
                <p className="text-sm font-bold text-foreground">선수 선택</p>
                <div className="mt-3 grid gap-2">
                  {sortedRoster.map((player) => {
                    const assignedSlot = assignedPlayers.get(player.id);
                    const isAssigned = Boolean(assignedSlot);
                    return (
                      <Button
                        key={player.id}
                        type="button"
                        variant={!activeSlotId || isAssigned ? "outline" : "success"}
                        disabled={!activeSlotId || isAssigned}
                        onClick={() => activeSlotId && !isAssigned && handleAssignPlayer(activeSlotId, player.id)}
                        className={cn(
                          "flex w-full min-w-0 items-center justify-between gap-2 overflow-hidden rounded-xl px-4 py-3 text-left text-sm h-auto",
                          (!activeSlotId || isAssigned) && "text-muted-foreground"
                        )}
                      >
                        <span className="min-w-0 flex-1 truncate font-semibold">{player.name}</span>
                        <span className="max-w-[45%] shrink-0 truncate whitespace-nowrap text-xs text-muted-foreground">
                          {assignedSlot
                            ? `배치됨 · ${formation.slots.find((slot) => slot.id === assignedSlot)?.label}`
                            : "선택"}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground">
              포지션을 클릭해 선수를 배치하고, 배치된 선수는 드래그해서 위치를 조정하세요.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
