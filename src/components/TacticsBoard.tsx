"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { formationTemplates, getFormationsForSportAndCount, getFutsalFieldCounts } from "@/lib/formations";
import { useApi, apiMutate } from "@/lib/useApi";
import type { DetailedPosition, SportType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getUniformStyle, getJerseyStyle } from "@/lib/uniformUtils";

type Player = {
  id: string;
  name: string;
  role: DetailedPosition;
};

type TacticsBoardProps = {
  matchId: string;
  roster: Player[];
  quarterCount: number;
  sportType?: SportType;
  teamSettings?: TeamSettings;
  initialSquads?: SquadRow[]; // 외부에서 주입 시 API fetch skip
  readOnly?: boolean; // MEMBER: 조회만 가능
  side?: "A" | "B"; // 자체전 팀 구분
};

type Placement = {
  playerId: string;
  x: number;
  y: number;
  secondPlayerId?: string; // 0.5Q 후반 선수
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

const SAVE_DEBOUNCE_MS = 300;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export default function TacticsBoard({ matchId, roster, quarterCount, sportType = "SOCCER", teamSettings: teamSettingsProp, initialSquads, readOnly = false, side }: TacticsBoardProps) {
  const isFutsal = sportType === "FUTSAL";
  const futsalFieldCounts = useMemo(() => (isFutsal ? getFutsalFieldCounts() : []), [isFutsal]);
  const [futsalFieldCount, setFutsalFieldCount] = useState(isFutsal ? 5 : 0);

  const filteredFormations = useMemo(
    () => getFormationsForSportAndCount(sportType, isFutsal ? futsalFieldCount : undefined),
    [sportType, isFutsal, futsalFieldCount]
  );
  const defaultFormation = filteredFormations[0] ?? formationTemplates[0];
  const quarters = useMemo(
    () => Array.from({ length: Math.max(1, quarterCount) }, (_, index) => index + 1),
    [quarterCount]
  );
  const [activeQuarter, setActiveQuarter] = useState(quarters[0]);

  // ── Fetch squads from API (skip if initialSquads provided) ──
  const {
    data: squadsApiData,
    setData: setSquadsApiData,
    loading: squadsApiLoading,
  } = useApi<SquadsApiResponse>(
    `/api/squads?matchId=${matchId}${side ? `&side=${side}` : ""}`,
    initialSquads ? { squads: initialSquads } : { squads: [] },
    { skip: Boolean(initialSquads) }
  );
  // initialSquads는 최초 hydrate용 — 로컬 저장 후에는 squadsApiData가 진실의 원천
  const squadsData = squadsApiData;
  const squadsLoading = initialSquads ? false : squadsApiLoading;

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
      // 풋살: 저장된 포메이션의 fieldCount로 인원수 복원
      if (isFutsal && formation.fieldCount) {
        setFutsalFieldCount(formation.fieldCount);
      }
      const normalizedPlacements: Record<string, Placement | null> = {};
      formation.slots.forEach((slot) => {
        normalizedPlacements[slot.id] = row.positions?.[slot.id] ?? null;
      });
      // 심판/촬영 역할도 복원
      if (row.positions?.["__referee"]) normalizedPlacements["__referee"] = row.positions["__referee"] as Placement;
      if (row.positions?.["__camera"]) normalizedPlacements["__camera"] = row.positions["__camera"] as Placement;
      setBoardState({ formationId: formation.id, placements: normalizedPlacements });
    } else {
      setBoardState({
        formationId: defaultFormation.id,
        placements: Object.fromEntries(defaultFormation.slots.map((slot) => [slot.id, null])),
      });
    }
    setHydrated(true);
  }, [squadsData, squadsLoading, activeQuarter, defaultFormation]);

  // ── Save to API (쿼터 번호를 명시적으로 전달) ──
  const activeQuarterRef = useRef(activeQuarter);
  activeQuarterRef.current = activeQuarter;

  const saveToApi = useCallback(async (state: BoardState, quarterNum: number) => {
    setSaving(true);
    await apiMutate("/api/squads", "POST", {
      matchId,
      quarterNumber: quarterNum,
      formation: state.formationId,
      positions: state.placements,
      side: side ?? null,
    });
    // 로컬 squadsData도 동기화 (쿼터 전환 시 즉시 반영)
    setSquadsApiData((prev) => {
      const existing = prev.squads.filter((s) => s.quarter_number !== quarterNum);
      return {
        squads: [
          ...existing,
          {
            id: `local-${quarterNum}`,
            match_id: matchId,
            quarter_number: quarterNum,
            formation: state.formationId,
            positions: state.placements,
          },
        ],
      };
    });
    setSaving(false);
  }, [matchId, setSquadsApiData]);

  /** Pending save에 쿼터 번호도 함께 저장 */
  const pendingQuarterRef = useRef(activeQuarter);

  const debouncedSave = useCallback((state: BoardState) => {
    pendingSaveRef.current = state;
    pendingQuarterRef.current = activeQuarterRef.current;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      if (pendingSaveRef.current) {
        saveToApi(pendingSaveRef.current, pendingQuarterRef.current);
        pendingSaveRef.current = null;
      }
    }, SAVE_DEBOUNCE_MS);
  }, [saveToApi]);

  /** 쿼터 전환 시 pending save 즉시 flush */
  const flushPendingSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (pendingSaveRef.current) {
      saveToApi(pendingSaveRef.current, pendingQuarterRef.current);
      pendingSaveRef.current = null;
    }
  }, [saveToApi]);

  // Flush pending saves on unmount
  useEffect(() => {
    return () => flushPendingSave();
  }, [flushPendingSave]);

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
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const sharingRef = useRef(false);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const allQuartersRef = useRef<HTMLDivElement | null>(null);
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
    // 심판/촬영 역할도 보존
    if (boardState.placements["__referee"]) normalized["__referee"] = boardState.placements["__referee"];
    if (boardState.placements["__camera"]) normalized["__camera"] = boardState.placements["__camera"];
    return normalized;
  }, [boardState.placements, formation.slots]);

  // 심판/촬영 역할 (쿼터별 positions에 __referee, __camera 키로 저장)
  const referee = placements["__referee"]?.playerId ?? "";
  const camera = placements["__camera"]?.playerId ?? "";

  function handleRoleAssign(role: "__referee" | "__camera", playerId: string) {
    updateBoardState((prev) => ({
      ...prev,
      placements: {
        ...prev.placements,
        [role]: playerId ? { playerId, x: 0, y: 0 } : null,
      },
    }));
  }

  const assignedPlayers = useMemo(() => {
    const map = new Map<string, string>();
    Object.entries(placements).forEach(([slotId, placement]) => {
      if (placement) {
        map.set(placement.playerId, slotId);
      }
    });
    return map;
  }, [placements]);

  /** 전체 쿼터에서 각 선수의 출전 쿼터 번호 목록 (저장된 데이터 + 현재 편집 중인 쿼터) */
  const playerQuarterMap = useMemo(() => {
    const map = new Map<string, Set<number>>();

    const addPlayer = (pid: string, q: number) => {
      if (!pid || pid === "__referee" || pid === "__camera") return;
      if (!map.has(pid)) map.set(pid, new Set());
      map.get(pid)!.add(q);
    };

    // 1. 저장된 스쿼드 데이터
    for (const squad of squadsData.squads) {
      if (!squad.positions) continue;
      for (const [key, placement] of Object.entries(squad.positions)) {
        if (!placement || key.startsWith("__")) continue;
        const p = placement as Placement;
        if (p.playerId) addPlayer(p.playerId, squad.quarter_number);
        if (p.secondPlayerId) addPlayer(p.secondPlayerId, squad.quarter_number);
      }
    }

    // 2. 현재 편집 중인 쿼터 (아직 저장 안 됐을 수 있음)
    for (const [key, placement] of Object.entries(placements)) {
      if (!placement || key.startsWith("__")) continue;
      if (placement.playerId) addPlayer(placement.playerId, activeQuarter);
      if (placement.secondPlayerId) addPlayer(placement.secondPlayerId, activeQuarter);
    }

    // Set → 정렬된 배열로 변환
    const result = new Map<string, number[]>();
    for (const [pid, qs] of map) {
      result.set(pid, [...qs].sort((a, b) => a - b));
    }
    return result;
  }, [squadsData.squads, placements, activeQuarter]);

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

  // 현재 쿼터 쉬는 인원
  const restingPlayers = useMemo(() => {
    return roster.filter((p) => !assignedPlayers.has(p.id));
  }, [roster, assignedPlayers]);

  const captureRef = useRef<HTMLDivElement | null>(null);

  /** 공통 캡처 → 클립보드 복사 / Web Share / 다운로드 */
  async function captureAndShare(target: HTMLElement, filename: string) {
    // 동시 실행 방지 (더블 클릭 등)
    if (sharingRef.current) return;
    sharingRef.current = true;
    setShareMsg("캡처 중...");

    // 오프스크린 요소면 임시로 화면에 표시
    const wasOffScreen = target.style.left === "-9999px";
    if (wasOffScreen) {
      target.style.left = "0";
      target.style.position = "fixed";
      target.style.top = "0";
      target.style.zIndex = "9999";
      target.style.opacity = "1";
      // 레이아웃 계산 대기
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }

    try {
      const bgColor = getComputedStyle(document.documentElement).getPropertyValue("--background").trim();
      const captureBackground = bgColor ? `hsl(${bgColor})` : "#0a0e14";
      const dataUrl = await toPng(target, {
        backgroundColor: captureBackground,
        pixelRatio: 2,
        cacheBust: true,
        // 전체 높이를 명시적으로 지정해 잘림 방지
        height: target.scrollHeight,
        width: target.scrollWidth,
      });

      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: "image/png" });

      // 1순위: Web Share API (모바일 카톡 등)
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ title: filename.replace(".png", ""), files: [file] });
          setShareMsg("공유 완료!");
        } catch {
          setShareMsg(null);
          return;
        }
      }
      // 2순위: 클립보드 복사
      else if (navigator.clipboard?.write) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          setShareMsg("클립보드에 복사됨! 붙여넣기하세요");
        } catch {
          // 클립보드 실패 시 다운로드 폴백
          const a = document.createElement("a");
          a.href = dataUrl;
          a.download = filename;
          a.click();
          setShareMsg("이미지가 저장되었습니다!");
        }
      }
      // 3순위: 다운로드
      else {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = filename;
        a.click();
        setShareMsg("이미지가 저장되었습니다!");
      }
      setTimeout(() => setShareMsg(null), 3000);
    } catch (err) {
      console.error("캡처 실패:", err);
      setShareMsg("캡처 실패");
      setTimeout(() => setShareMsg(null), 2000);
    } finally {
      if (wasOffScreen) {
        target.style.left = "-9999px";
        target.style.position = "absolute";
        target.style.top = "0";
        target.style.zIndex = "";
        target.style.opacity = "";
      }
      sharingRef.current = false;
    }
  }

  function handleShareFormation() {
    if (captureRef.current) captureAndShare(captureRef.current, `lineup-Q${activeQuarter}.png`);
  }

  function handleShareAll() {
    if (allQuartersRef.current) captureAndShare(allQuartersRef.current, "lineup-all.png");
  }

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
    return luminance > 0.62 ? "hsl(var(--background))" : "hsl(var(--foreground))";
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

    // 기존 배치된 선수들을 새 포메이션 슬롯에 포지션 유사도 기반으로 재배치
    const posCategory = (role: DetailedPosition): "GK" | "DF" | "MF" | "FW" => {
      if (role === "GK") return "GK";
      if (["RB", "RCB", "CB", "LCB", "LB", "RWB", "LWB"].includes(role)) return "DF";
      if (["RDM", "LDM", "CDM", "RCM", "CM", "LCM", "CAM", "RAM", "LAM", "RM", "LM"].includes(role)) return "MF";
      return "FW"; // RW, LW, CF, ST, RS, LS
    };

    // 기존 배치에서 선수 정보 수집 (slotRole → player)
    const oldPlayers: { playerId: string; secondPlayerId?: string; category: "GK" | "DF" | "MF" | "FW" }[] = [];
    formation.slots.forEach((slot) => {
      const p = placements[slot.id];
      if (p) {
        oldPlayers.push({ playerId: p.playerId, secondPlayerId: p.secondPlayerId, category: posCategory(slot.role) });
      }
    });

    // 새 슬롯에 카테고리별로 매칭
    const nextPlacements: Record<string, Placement | null> = {};
    const usedPlayerIds = new Set<string>();
    nextFormation.slots.forEach((slot) => {
      nextPlacements[slot.id] = null;
    });

    // 1차: 같은 카테고리 매칭
    nextFormation.slots.forEach((slot) => {
      const cat = posCategory(slot.role);
      const match = oldPlayers.find((p) => p.category === cat && !usedPlayerIds.has(p.playerId));
      if (match) {
        usedPlayerIds.add(match.playerId);
        nextPlacements[slot.id] = { playerId: match.playerId, x: slot.x, y: slot.y, secondPlayerId: match.secondPlayerId };
      }
    });

    // 2차: 남은 선수를 빈 슬롯에 배치
    const remaining = oldPlayers.filter((p) => !usedPlayerIds.has(p.playerId));
    nextFormation.slots.forEach((slot) => {
      if (!nextPlacements[slot.id] && remaining.length > 0) {
        const player = remaining.shift()!;
        nextPlacements[slot.id] = { playerId: player.playerId, x: slot.x, y: slot.y, secondPlayerId: player.secondPlayerId };
      }
    });

    updateBoardState({ formationId: nextFormation.id, placements: nextPlacements });
    setActiveSlotId(null);
  }

  /** 풋살 인원수 변경 → 해당 인원의 첫 번째 포메이션으로 전환 */
  function handleFutsalFieldCountChange(count: number) {
    setFutsalFieldCount(count);
    const formations = getFormationsForSportAndCount("FUTSAL", count);
    if (formations.length > 0) {
      handleFormationChange(formations[0].id);
    }
  }

  function handleSelectSlot(slotId: string) {
    if (readOnly) return;
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
    const newState: BoardState = {
      ...boardState,
      placements: { ...boardState.placements, [slotId]: null },
    };
    setBoardState(newState);
    // debounce 건너뛰고 즉시 저장
    saveToApi(newState, activeQuarterRef.current);
    setActiveSlotId(null);
  }

  function clearBoard() {
    const reset: Record<string, Placement | null> = {};
    formation.slots.forEach((slot) => {
      reset[slot.id] = null;
    });
    const newState: BoardState = { formationId: formation.id, placements: reset };
    setBoardState(newState);
    // debounce 건너뛰고 즉시 저장
    saveToApi(newState, activeQuarterRef.current);
    setActiveSlotId(null);
  }

  if (squadsLoading || (!teamSettingsProp && teamLoading) || !hydrated) {
    return <Card className="p-6">불러오는 중...</Card>;
  }

  return (
    <>
    <Card className="p-6">
      <CardContent className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Tactics</p>
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
                    flushPendingSave(); // 이전 쿼터 저장 즉시 flush
                    setActiveQuarter(quarter);
                    setActiveSlotId(null);
                  }}
                  className="rounded-xl"
                >
                  {quarter}쿼터
                </Button>
              ))}
            </div>
            {/* 풋살 인원 수 선택 */}
            {isFutsal && !readOnly && (
              <Select value={String(futsalFieldCount)} onValueChange={(v) => handleFutsalFieldCountChange(Number(v))}>
                <SelectTrigger className="w-auto min-w-[90px] rounded-xl text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {futsalFieldCounts.map((count) => (
                    <SelectItem key={count} value={String(count)}>
                      {count}vs{count}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {isFutsal && readOnly && (
              <Badge variant="secondary" className="rounded-xl px-3 py-1 text-xs font-semibold">
                {futsalFieldCount}인제
              </Badge>
            )}
            {!readOnly && (
              <Select value={formation.id} onValueChange={handleFormationChange}>
                <SelectTrigger className="w-auto min-w-[140px] rounded-xl text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {filteredFormations.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {readOnly && (
              <Badge variant="secondary" className="rounded-xl px-3 py-1 text-xs font-semibold">
                {formation.name}
              </Badge>
            )}
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
            {!readOnly && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearBoard}
                className="rounded-xl"
              >
                초기화
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleShareFormation}
              className="rounded-xl"
            >
              공유
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleShareAll}
              className="rounded-xl"
            >
              전체 공유
            </Button>
            {saving && (
              <span className="text-xs text-muted-foreground animate-pulse">저장 중...</span>
            )}
            {shareMsg && (
              <span className="text-xs text-primary animate-pulse">{shareMsg}</span>
            )}
          </div>
        </div>

        <div className={cn("mt-5 grid gap-5", !readOnly && "lg:grid-cols-[1.2fr_0.8fr]")}>
          {/* Soccer pitch + resting (capture area) */}
          <div ref={captureRef} className="space-y-3" style={{ backgroundColor: "hsl(var(--background))", padding: "0 0 8px 0" }}>
          {/* 쿼터 표시 (캡처 이미지에 포함) */}
          <div className="flex items-center justify-between px-1">
            <span className="text-sm font-bold text-foreground">
              {activeQuarter}쿼터 · {formation.name}
            </span>
            <span className="text-xs text-muted-foreground/50">PitchMaster</span>
          </div>
          <div
            ref={boardRef}
            className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border-2 border-white/10 shadow-xl shadow-black/30"
            style={{
              touchAction: "none",
              background: "hsl(var(--pitch))",
              backgroundImage: [
                // 진한/연한 잔디 가로 줄무늬 (실제 축구장 느낌)
                "repeating-linear-gradient(180deg, rgba(255,255,255,0) 0px, rgba(255,255,255,0) 38px, rgba(255,255,255,0.06) 38px, rgba(255,255,255,0.06) 76px)",
                // 잔디 텍스처 노이즈 느낌
                "repeating-linear-gradient(90deg, rgba(0,0,0,0.02) 0px, transparent 2px, transparent 4px)",
                // 전체 그라데이션 (가장자리 살짝 어둡게)
                "radial-gradient(ellipse at 50% 50%, rgba(34,197,94,0.15) 0%, transparent 70%)",
              ].join(", "),
            }}
          >
            {/* 경기장 외곽선 */}
            <div className="absolute inset-3 rounded-sm border-2 border-white/30" />
            {/* 센터라인 */}
            <div className="absolute inset-x-3 top-1/2 h-0.5 -translate-y-px bg-white/30" />
            {/* 센터서클 */}
            <div className="absolute left-1/2 top-1/2 h-[18%] w-[28%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/30" />
            {/* 센터스팟 */}
            <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40" />
            {/* 상단 페널티 박스 */}
            <div className="absolute inset-x-[20%] top-3 h-[16%] border-2 border-t-0 border-white/30" />
            {/* 상단 골 에어리어 */}
            <div className="absolute inset-x-[32%] top-3 h-[8%] border-2 border-t-0 border-white/30" />
            {/* 상단 페널티 아크 */}
            <div className="absolute left-1/2 top-[18.5%] h-[6%] w-[16%] -translate-x-1/2 rounded-b-full border-2 border-t-0 border-white/30" />
            {/* 하단 페널티 박스 */}
            <div className="absolute inset-x-[20%] bottom-3 h-[16%] border-2 border-b-0 border-white/30" />
            {/* 하단 골 에어리어 */}
            <div className="absolute inset-x-[32%] bottom-3 h-[8%] border-2 border-b-0 border-white/30" />
            {/* 하단 페널티 아크 */}
            <div className="absolute left-1/2 bottom-[18.5%] h-[6%] w-[16%] -translate-x-1/2 rounded-t-full border-2 border-b-0 border-white/30" />
            {/* 코너 아크 (4개) */}
            <div className="absolute left-3 top-3 h-4 w-4 rounded-br-full border-b-2 border-r-2 border-white/30" />
            <div className="absolute right-3 top-3 h-4 w-4 rounded-bl-full border-b-2 border-l-2 border-white/30" />
            <div className="absolute bottom-3 left-3 h-4 w-4 rounded-tr-full border-r-2 border-t-2 border-white/30" />
            <div className="absolute bottom-3 right-3 h-4 w-4 rounded-tl-full border-l-2 border-t-2 border-white/30" />

            {formation.slots.map((slot) => {
              const placement = placements[slot.id];
              if (!placement) {
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => handleSelectSlot(slot.id)}
                    className={cn(
                      "absolute flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-xs font-bold text-white transition",
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
              const secondPlayer = placement.secondPlayerId
                ? roster.find((item) => item.id === placement.secondPlayerId)
                : null;
              const homePrimary = resolvedTeamSettings.uniformPrimary || "#2563eb";
              const homeSecondary = resolvedTeamSettings.uniformSecondary || "#f97316";
              const badgePrimary = uniformMode === "HOME" ? homePrimary : homeSecondary;
              const badgeSecondary = uniformMode === "HOME" ? homeSecondary : homePrimary;
              const badgePattern = resolvedTeamSettings.uniformPattern || "SOLID";
              const uniformStyle = getJerseyStyle(badgePrimary, badgeSecondary, badgePattern);
              const displayName = secondPlayer
                ? `${player?.name ?? "선수"}/${secondPlayer.name}`
                : (player?.name ?? "선수");
              return (
                <button
                  key={slot.id}
                  type="button"
                  onPointerDown={(event) => {
                    if (readOnly) return;
                    event.preventDefault();
                    event.currentTarget.setPointerCapture(event.pointerId);
                    dragRef.current = { slotId: slot.id };
                  }}
                  onClick={() => handleSelectSlot(slot.id)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-xl px-2 py-1.5 text-xs font-bold transition"
                  style={{ left: `${placement.x}%`, top: `${placement.y}%`, touchAction: "none" }}
                >
                  <span className="flex flex-col items-center gap-0.5">
                    <span className="block h-10 w-10 rounded-sm border border-white/25 shadow-md shadow-black/30" style={uniformStyle} />
                    {secondPlayer ? (
                      <span className="flex flex-col items-center rounded-md bg-black/70 px-1.5 py-0.5 shadow-sm">
                        <span className="flex items-center gap-0.5 text-xs font-bold text-[hsl(var(--info))]">
                          <span className="rounded bg-sky-500/30 px-0.5">전</span>
                          {player?.name ?? "선수"}
                        </span>
                        <span className="flex items-center gap-0.5 text-xs font-bold text-[hsl(var(--accent))]">
                          <span className="rounded bg-violet-500/30 px-0.5">후</span>
                          {secondPlayer.name}
                        </span>
                      </span>
                    ) : (
                      <span className="block max-w-[96px] truncate whitespace-nowrap rounded-md bg-black/60 px-1.5 py-0.5 text-xs font-bold text-foreground shadow-sm">
                        {displayName}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 쉬는 인원 (캡처 영역 내) */}
          {restingPlayers.length > 0 && (
            <div className="rounded-xl bg-amber-500/10 px-4 py-3">
              <p className="text-sm font-bold text-amber-400">
                쉬는 선수 ({restingPlayers.length}명)
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {restingPlayers.map((player) => (
                  <span
                    key={player.id}
                    className="inline-block rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400"
                  >
                    {player.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 심판/촬영 역할 표시 (캡처 영역 내) */}
          {(referee || camera) && (
            <div className="rounded-xl bg-sky-500/10 px-4 py-3">
              <div className="flex flex-wrap gap-3">
                {referee && (() => {
                  const p = roster.find((r) => r.id === referee);
                  return p ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-sky-400">심판</span>
                      <span className="inline-block rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-400">
                        {p.name}
                      </span>
                    </div>
                  ) : null;
                })()}
                {camera && (() => {
                  const p = roster.find((r) => r.id === camera);
                  return p ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-violet-400">촬영</span>
                      <span className="inline-block rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-400">
                        {p.name}
                      </span>
                    </div>
                  ) : null;
                })()}
              </div>
            </div>
          )}
          </div>{/* end captureRef */}

          {/* Roster panel (편집 모드에서만 표시) */}
          {!readOnly && (
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
                    const playedQuarters = playerQuarterMap.get(player.id) ?? [];
                    const qCount = playedQuarters.length;
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
                        <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                          {qCount > 0 && (
                            <span className={cn(
                              "rounded-full px-1.5 py-0.5 text-xs font-bold",
                              "bg-primary/15 text-primary"
                            )}>
                              {qCount}Q
                            </span>
                          )}
                          {assignedSlot
                            ? formation.slots.find((slot) => slot.id === assignedSlot)?.label ?? "배치됨"
                            : qCount > 0 ? playedQuarters.map(q => `${q}Q`).join(" ") : "미출전"}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* 심판/촬영 역할 배정 */}
            <Card className="border-0 bg-secondary">
              <CardContent className="p-4">
                <p className="text-sm font-bold text-foreground">역할 배정</p>
                <div className="mt-3 space-y-3">
                  {[
                    { key: "__referee" as const, label: "심판", current: referee },
                    { key: "__camera" as const, label: "촬영", current: camera },
                  ].map(({ key, label, current }) => (
                    <div key={key} className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
                      <select
                        value={current}
                        onChange={(e) => handleRoleAssign(key, e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="">미배정</option>
                        {(() => {
                          // 쉬는 선수 + 현재 이 역할에 배정된 선수도 옵션에 포함
                          const currentPlayer = current ? roster.find((r) => r.id === current) : null;
                          const options = currentPlayer && !restingPlayers.some((p) => p.id === current)
                            ? [currentPlayer, ...restingPlayers]
                            : restingPlayers;
                          return options.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ));
                        })()}
                      </select>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground">
              포지션을 클릭해 선수를 배치하고, 배치된 선수는 드래그해서 위치를 조정하세요.
            </p>
          </div>
          )}
        </div>
      </CardContent>
    </Card>

    {/* 전체 쿼터 캡처용 (오프스크린) */}
    <div
      ref={allQuartersRef}
      style={{ position: "absolute", left: "-9999px", top: 0, width: 800, backgroundColor: "hsl(var(--background))", padding: 16 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: "hsl(var(--foreground))" }}>
          전체 라인업 · {formation.name}
        </span>
        <span style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>PitchMaster</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {quarters.map((q) => {
          const row = squadsData.squads.find((s) => s.quarter_number === q);
          const qFormation = row
            ? formationTemplates.find((f) => f.id === row.formation) ?? defaultFormation
            : defaultFormation;
          const qPlacements: Record<string, Placement | null> = {};
          qFormation.slots.forEach((slot) => {
            qPlacements[slot.id] = row?.positions?.[slot.id] ?? null;
          });

          const homePrimary = resolvedTeamSettings.uniformPrimary || "#2563eb";
          const homeSecondary = resolvedTeamSettings.uniformSecondary || "#f97316";
          const badgePrimary = uniformMode === "HOME" ? homePrimary : homeSecondary;
          const badgeSecondary = uniformMode === "HOME" ? homeSecondary : homePrimary;
          const badgePattern = resolvedTeamSettings.uniformPattern || "SOLID";
          const uStyle = getJerseyStyle(badgePrimary, badgeSecondary, badgePattern);

          // 쉬는 선수 계산
          const assignedIds = new Set<string>();
          Object.values(qPlacements).forEach((p) => {
            if (p) {
              assignedIds.add(p.playerId);
              if (p.secondPlayerId) assignedIds.add(p.secondPlayerId);
            }
          });
          const qResting = roster.filter((r) => !assignedIds.has(r.id));

          return (
            <div key={q} style={{ backgroundColor: "hsl(var(--card))", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "8px 12px", fontSize: 13, fontWeight: 700, color: "hsl(var(--foreground))" }}>
                {q}쿼터
              </div>
              <div
                style={{
                  position: "relative",
                  aspectRatio: "4/5",
                  width: "100%",
                  background: "hsl(var(--pitch))",
                  backgroundImage: [
                    "repeating-linear-gradient(180deg, rgba(255,255,255,0) 0px, rgba(255,255,255,0) 38px, rgba(255,255,255,0.06) 38px, rgba(255,255,255,0.06) 76px)",
                    "radial-gradient(ellipse at 50% 50%, rgba(34,197,94,0.15) 0%, transparent 70%)",
                  ].join(", "),
                }}
              >
                {/* 하프라인 */}
                <div style={{ position: "absolute", top: "50%", left: "5%", right: "5%", height: 2, backgroundColor: "rgba(255,255,255,0.35)" }} />
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 60, height: 60, border: "2px solid rgba(255,255,255,0.35)", borderRadius: "50%" }} />
                {/* 선수 배치 */}
                {qFormation.slots.map((slot) => {
                  const pl = qPlacements[slot.id];
                  if (!pl) return null;
                  const player = roster.find((r) => r.id === pl.playerId);
                  const secondPlayer = pl.secondPlayerId ? roster.find((r) => r.id === pl.secondPlayerId) : null;
                  return (
                    <div
                      key={slot.id}
                      style={{
                        position: "absolute",
                        left: `${pl.x}%`,
                        top: `${pl.y}%`,
                        transform: "translate(-50%,-50%)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 2,
                      }}
                    >
                      <div style={{ ...uStyle, width: 28, height: 28, borderRadius: 4 }} />
                      {secondPlayer ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 4, padding: "1px 4px" }}>
                          <span style={{ fontSize: 7, fontWeight: 700, color: "hsl(var(--info))" }}>전 {player?.name ?? ""}</span>
                          <span style={{ fontSize: 7, fontWeight: 700, color: "hsl(var(--accent))" }}>후 {secondPlayer.name}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 8, fontWeight: 700, color: "hsl(var(--foreground))", backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 4, padding: "1px 4px", whiteSpace: "nowrap" }}>
                          {player?.name ?? ""}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* 쉬는 선수 + 역할 */}
              {(() => {
                const qRef = row?.positions?.["__referee"] as Placement | null | undefined;
                const qCam = row?.positions?.["__camera"] as Placement | null | undefined;
                const refName = qRef?.playerId ? roster.find((r) => r.id === qRef.playerId)?.name : null;
                const camName = qCam?.playerId ? roster.find((r) => r.id === qCam.playerId)?.name : null;
                return (
                  <div style={{ padding: "6px 10px", fontSize: 10 }}>
                    {qResting.length > 0 && (
                      <div style={{ color: "hsl(var(--warning))" }}>쉬는 선수: {qResting.map((r) => r.name).join(", ")}</div>
                    )}
                    {(refName || camName) && (
                      <div style={{ color: "hsl(var(--muted-foreground))", marginTop: 2 }}>
                        {refName && <span>심판: {refName}</span>}
                        {refName && camName && <span> · </span>}
                        {camName && <span>촬영: {camName}</span>}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
    </>
  );
}
