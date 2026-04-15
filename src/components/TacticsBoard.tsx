"use client";
/* v0-design-v2 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { formationTemplates, getFormationsForSportAndCount, getFutsalFieldCounts } from "@/lib/formations";
import { useApi, apiMutate } from "@/lib/useApi";
import type { DetailedPosition, SportType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/lib/ConfirmContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getUniformStyle, getJerseyStyle } from "@/lib/uniformUtils";
import { useIsMobile } from "@/lib/useIsMobile";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { RotateCcw, Coffee, Share2, Copy, BarChart3 } from "lucide-react";

type Player = {
  id: string;
  name: string;
  role: DetailedPosition;
  /** 멤버 프로필의 전체 선호 포지션 배열 (슬롯 포지션 매칭 표시용) */
  preferredPositions?: DetailedPosition[];
};

/** DetailedPosition → 카테고리(GK/DF/MF/FW) */
function positionCategory(role: DetailedPosition): "GK" | "DF" | "MF" | "FW" {
  if (role === "GK") return "GK";
  if (["RB", "RCB", "CB", "LCB", "LB", "RWB", "LWB"].includes(role)) return "DF";
  if (["RDM", "LDM", "CDM", "RCM", "CM", "LCM", "CAM", "RAM", "LAM", "RM", "LM", "MF"].includes(role)) return "MF";
  return "FW"; // RW, LW, CF, ST, RS, LS, FW
}

/** 선수의 선호 포지션 중 하나라도 슬롯 포지션과 같은 카테고리면 true */
function isPositionMatched(player: Player | null | undefined, slotRole: DetailedPosition): boolean {
  if (!player) return false;
  const prefs = player.preferredPositions && player.preferredPositions.length > 0
    ? player.preferredPositions
    : [player.role];
  const slotCat = positionCategory(slotRole);
  return prefs.some((p) => positionCategory(p) === slotCat);
}

type TacticsBoardProps = {
  matchId: string;
  roster: Player[];
  quarterCount: number;
  sportType?: SportType;
  /** 경기별 참가 인원 (축구 8/9/10/11, 풋살 3~6). 미지정 시 11(축구) 또는 기존 풋살 UI */
  playerCount?: number;
  teamSettings?: TeamSettings;
  initialSquads?: SquadRow[]; // 외부에서 주입 시 API fetch skip
  defaultFormationId?: string; // 팀 기본 포메이션
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

type UniformSet = { primary: string; secondary: string; pattern: string };
type TeamSettings = {
  uniformPrimary: string;
  uniformSecondary: string;
  uniformPattern?: "SOLID" | "STRIPES_VERTICAL" | "STRIPES_HORIZONTAL" | "STRIPES_DIAGONAL";
  uniforms?: { home?: UniformSet; away?: UniformSet; third?: UniformSet | null } | null;
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
    uniforms?: TeamSettings["uniforms"];
  };
};

const SAVE_DEBOUNCE_MS = 300;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export default function TacticsBoard({ matchId, roster, quarterCount, sportType = "SOCCER", playerCount, teamSettings: teamSettingsProp, initialSquads, defaultFormationId: teamDefaultFormationId, readOnly = false, side }: TacticsBoardProps) {
  const confirm = useConfirm();
  const isMobile = useIsMobile();
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [quarterMatrixOpen, setQuarterMatrixOpen] = useState(false);
  const isFutsal = sportType === "FUTSAL";
  const futsalFieldCounts = useMemo(() => (isFutsal ? getFutsalFieldCounts() : []), [isFutsal]);
  const [futsalFieldCount, setFutsalFieldCount] = useState(isFutsal ? (playerCount ?? 5) : 0);

  // 축구: 경기 playerCount (8~11) 로 포메이션 필터
  const soccerFieldCount = !isFutsal ? (playerCount ?? 11) : undefined;

  const filteredFormations = useMemo(
    () => getFormationsForSportAndCount(
      sportType,
      isFutsal ? futsalFieldCount : soccerFieldCount
    ),
    [sportType, isFutsal, futsalFieldCount, soccerFieldCount]
  );
  const defaultFormation = (teamDefaultFormationId ? filteredFormations.find(f => f.id === teamDefaultFormationId) : null) ?? filteredFormations[0] ?? formationTemplates[0];
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
      uniforms: t.uniforms ?? null,
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

  const [uniformMode, setUniformMode] = useState<"HOME" | "AWAY" | "THIRD">("HOME");
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
        if (placement.secondPlayerId) {
          map.set(placement.secondPlayerId, slotId);
        }
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
  // 캡처 중에는 필드의 '적합' 표시(녹색 링·pill·상단 레전드) 숨김
  const [isCapturing, setIsCapturing] = useState(false);

  /** 공통 캡처 → 클립보드 복사 / Web Share / 다운로드 */
  async function captureAndShare(target: HTMLElement, filename: string) {
    // 동시 실행 방지 (더블 클릭 등)
    if (sharingRef.current) return;
    sharingRef.current = true;
    setShareMsg("캡처 중...");

    // 적합 표시 숨기고 React 리렌더 반영까지 2 프레임 대기
    setIsCapturing(true);
    await new Promise<void>((r) =>
      requestAnimationFrame(() => requestAnimationFrame(() => r()))
    );

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
      setIsCapturing(false);
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

  // ref로 최신 updateBoardState 참조 (effect가 드래그 중 재등록되지 않도록)
  const updateBoardStateRef = useRef(updateBoardState);
  useEffect(() => { updateBoardStateRef.current = updateBoardState; }, [updateBoardState]);

  useEffect(() => {
    function handlePointerMove(event: Event) {
      if (!dragRef.current || !boardRef.current) return;
      const pointerEvent = event as PointerEvent;
      pointerEvent.preventDefault();
      const rect = boardRef.current.getBoundingClientRect();
      const x = clamp(((pointerEvent.clientX - rect.left) / rect.width) * 100, 5, 95);
      const y = clamp(((pointerEvent.clientY - rect.top) / rect.height) * 100, 6, 94);
      const slotId = dragRef.current.slotId;
      updateBoardStateRef.current((prev) => {
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
  }, []);

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

  // "assign" = 일반 배치 대기, "assign_second" = 후반 선수 선택 중
  type SlotMode = "assign" | "assign_second";
  const [slotMode, setSlotMode] = useState<SlotMode>("assign");

  function handleSelectSlot(slotId: string) {
    if (readOnly) return;
    setActiveSlotId(slotId);
    setSlotMode("assign");
    if (isMobile) setMobileSheetOpen(true);
  }

  function handleAssignPlayer(slotId: string, playerId: string) {
    if (assignedPlayers.has(playerId)) return;

    if (slotMode === "assign_second") {
      // 후반 선수 배정
      updateBoardState((prev) => {
        const current = prev.placements[slotId];
        if (!current) return prev;
        return {
          ...prev,
          placements: {
            ...prev.placements,
            [slotId]: { ...current, secondPlayerId: playerId },
          },
        };
      });
      setSlotMode("assign");
      setActiveSlotId(null);
      if (isMobile) setMobileSheetOpen(false);
      return;
    }

    // 바로 풀타임 배치
    const slot = formation.slots.find((item) => item.id === slotId);
    if (!slot) return;
    updateBoardState((prev) => {
      const nextPlacements = { ...prev.placements };
      Object.entries(nextPlacements).forEach(([key, placement]) => {
        if (placement?.playerId === playerId) nextPlacements[key] = null;
      });
      nextPlacements[slotId] = { playerId, x: slot.x, y: slot.y };
      return { ...prev, placements: nextPlacements };
    });
    if (isMobile) setMobileSheetOpen(false);
  }

  /** 후반 선수 추가 모드 진입 (배치된 슬롯에서 호출) */
  function startAssignSecond(slotId: string) {
    setActiveSlotId(slotId);
    setSlotMode("assign_second");
    if (isMobile) setMobileSheetOpen(true);
  }

  function handleClearSecondPlayer(slotId: string) {
    updateBoardState((prev) => {
      const current = prev.placements[slotId];
      if (!current?.secondPlayerId) return prev;
      const { secondPlayerId: _, ...rest } = current;
      return { ...prev, placements: { ...prev.placements, [slotId]: rest } };
    });
    setActiveSlotId(null);
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

  async function clearBoard() {
    const ok = await confirm({ title: "이 쿼터 초기화", description: "이 쿼터의 배치를 초기화할까요? 되돌릴 수 없습니다.", variant: "destructive", confirmLabel: "초기화" });
    if (!ok) return;
    const reset: Record<string, Placement | null> = {};
    formation.slots.forEach((slot) => {
      reset[slot.id] = null;
    });
    const newState: BoardState = { formationId: formation.id, placements: reset };
    setBoardState(newState);
    saveToApi(newState, activeQuarterRef.current);
    setActiveSlotId(null);
  }

  async function clearAllQuarters() {
    const ok = await confirm({ title: "전체 쿼터 초기화", description: "모든 쿼터의 배치를 초기화할까요? 되돌릴 수 없습니다.", variant: "destructive", confirmLabel: "전체 초기화" });
    if (!ok) return;
    const reset: Record<string, Placement | null> = {};
    formation.slots.forEach((slot) => {
      reset[slot.id] = null;
    });
    const emptyState: BoardState = { formationId: formation.id, placements: reset };
    for (let q = 1; q <= quarterCount; q++) {
      await saveToApi(emptyState, q);
    }
    setBoardState(emptyState);
    setActiveSlotId(null);
  }

  if (squadsLoading || (!teamSettingsProp && teamLoading) || !hydrated) {
    return <Card className="p-6">불러오는 중...</Card>;
  }

  return (
    <>
    <Card className="p-6">
      <CardContent className="p-0">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Tactics</p>
            <h3 className="mt-1 font-heading text-xl font-bold uppercase text-foreground">전술판 편성</h3>
          </div>
          {saving && <span className="text-xs text-muted-foreground animate-pulse">저장 중...</span>}
          {shareMsg && <span className="text-xs text-primary animate-pulse">{shareMsg}</span>}
        </div>

        {/* 쿼터 선택 — 세그먼트 컨트롤 */}
        <div className="mt-4 flex items-center gap-2">
          <div className="flex-1 rounded-lg bg-secondary p-1">
            <div className="grid grid-cols-4 gap-1">
              {quarters.map((quarter) => (
                <button
                  key={quarter}
                  type="button"
                  onClick={() => {
                    flushPendingSave();
                    setActiveQuarter(quarter);
                    setActiveSlotId(null);
                  }}
                  className={cn(
                    "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all",
                    activeQuarter === quarter
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Q{quarter}
                </button>
              ))}
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={() => setQuarterMatrixOpen(true)}
            title="쿼터별 출전 현황"
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
        </div>

        {/* 포메이션 + 유니폼 + 리셋 */}
        <div className="mt-3 flex items-center gap-2">
          {!readOnly ? (
            <Select value={formation.id} onValueChange={handleFormationChange}>
              <SelectTrigger className="h-11 flex-1 rounded-lg border-0 bg-secondary text-sm font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {filteredFormations.map((item) => (
                  <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex h-11 flex-1 items-center rounded-lg bg-secondary px-3 text-sm font-semibold">{formation.name}</div>
          )}

          {isFutsal && !readOnly && (
            <Select value={String(futsalFieldCount)} onValueChange={(v) => handleFutsalFieldCountChange(Number(v))}>
              <SelectTrigger className="h-11 w-auto min-w-[80px] rounded-lg border-0 bg-secondary text-sm font-semibold"><SelectValue /></SelectTrigger>
              <SelectContent>
                {futsalFieldCounts.map((count) => (
                  <SelectItem key={count} value={String(count)}>{count}vs{count}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {!readOnly && (
            <Button type="button" variant="secondary" size="icon" className="h-11 w-11 shrink-0" onClick={clearBoard} title="이 쿼터 초기화">
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* 액션 버튼 */}
        <div className="mt-2 flex gap-2">
          {!readOnly && (
            <Button type="button" variant="outline" className="flex-1 text-xs" onClick={clearAllQuarters}>전체 초기화</Button>
          )}
          <Button type="button" variant="outline" className="flex-1 text-xs gap-1.5" onClick={handleShareFormation}>
            <Share2 className="h-3.5 w-3.5" />공유
          </Button>
          <Button type="button" variant="outline" className="flex-1 text-xs gap-1.5" onClick={handleShareAll}>
            <Copy className="h-3.5 w-3.5" />전체 공유
          </Button>
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
          {/* 매칭 레전드 — 1개라도 매칭된 배치가 있을 때만 노출. 캡처 중엔 숨김 */}
          {!isCapturing && (() => {
            const matchedCount = formation.slots.reduce((acc, slot) => {
              const placement = placements[slot.id];
              if (!placement) return acc;
              const player = roster.find((r) => r.id === placement.playerId);
              const second = placement.secondPlayerId ? roster.find((r) => r.id === placement.secondPlayerId) : null;
              const a = isPositionMatched(player, slot.role) ? 1 : 0;
              const b = isPositionMatched(second, slot.role) ? 1 : 0;
              return acc + a + b;
            }, 0);
            if (matchedCount === 0) return null;
            return (
              <div className="flex items-center gap-2 rounded-lg bg-[hsl(var(--success))]/10 px-3 py-1.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--success))]" />
                <span className="text-[11px] font-semibold text-[hsl(var(--success))]">
                  초록 표시 = 선호 포지션에 잘 배치된 선수 · {matchedCount}명
                </span>
              </div>
            );
          })()}
          <div
            ref={boardRef}
            className={cn("relative w-full overflow-hidden rounded-2xl border-2 border-white/20 shadow-xl shadow-black/30", isFutsal ? "aspect-[3/2]" : "aspect-[4/5]")}
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
            <div className="absolute inset-3 rounded-sm border-2 border-white/50" />
            {/* 센터라인 */}
            <div className="absolute inset-x-3 top-1/2 h-0.5 -translate-y-px bg-white/30" />
            {/* 센터서클 */}
            <div className="absolute left-1/2 top-1/2 h-[18%] w-[28%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/50" />
            {/* 센터스팟 */}
            <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40" />
            {/* 상단 페널티 박스 */}
            <div className="absolute inset-x-[20%] top-3 h-[16%] border-2 border-t-0 border-white/50" />
            {/* 상단 골 에어리어 */}
            <div className="absolute inset-x-[32%] top-3 h-[8%] border-2 border-t-0 border-white/50" />
            {/* 상단 페널티 아크 */}
            <div className="absolute left-1/2 top-[18.5%] h-[6%] w-[16%] -translate-x-1/2 rounded-b-full border-2 border-t-0 border-white/50" />
            {/* 하단 페널티 박스 */}
            <div className="absolute inset-x-[20%] bottom-3 h-[16%] border-2 border-b-0 border-white/50" />
            {/* 하단 골 에어리어 */}
            <div className="absolute inset-x-[32%] bottom-3 h-[8%] border-2 border-b-0 border-white/50" />
            {/* 하단 페널티 아크 */}
            <div className="absolute left-1/2 bottom-[18.5%] h-[6%] w-[16%] -translate-x-1/2 rounded-t-full border-2 border-b-0 border-white/50" />
            {/* 코너 아크 (4개) */}
            <div className="absolute left-3 top-3 h-4 w-4 rounded-br-full border-b-2 border-r-2 border-white/50" />
            <div className="absolute right-3 top-3 h-4 w-4 rounded-bl-full border-b-2 border-l-2 border-white/50" />
            <div className="absolute bottom-3 left-3 h-4 w-4 rounded-tr-full border-r-2 border-t-2 border-white/50" />
            <div className="absolute bottom-3 right-3 h-4 w-4 rounded-tl-full border-l-2 border-t-2 border-white/50" />

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
                        : "border-white/40 bg-black/25"
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
              const uniforms = resolvedTeamSettings.uniforms;
              let badgePrimary: string, badgeSecondary: string, badgePattern: string;
              if (uniformMode === "THIRD" && uniforms?.third) {
                badgePrimary = uniforms.third.primary;
                badgeSecondary = uniforms.third.secondary;
                badgePattern = uniforms.third.pattern;
              } else if (uniformMode === "AWAY" && uniforms?.away) {
                badgePrimary = uniforms.away.primary;
                badgeSecondary = uniforms.away.secondary;
                badgePattern = uniforms.away.pattern;
              } else if (uniforms?.home) {
                badgePrimary = uniforms.home.primary;
                badgeSecondary = uniforms.home.secondary;
                badgePattern = uniforms.home.pattern;
              } else {
                const homePrimary = resolvedTeamSettings.uniformPrimary || "#2563eb";
                const homeSecondary = resolvedTeamSettings.uniformSecondary || "#f97316";
                badgePrimary = uniformMode === "HOME" ? homePrimary : homeSecondary;
                badgeSecondary = uniformMode === "HOME" ? homeSecondary : homePrimary;
                badgePattern = resolvedTeamSettings.uniformPattern || "SOLID";
              }
              const uniformStyle = getJerseyStyle(badgePrimary, badgeSecondary, badgePattern);
              const displayName = secondPlayer
                ? `${player?.name ?? "선수"}/${secondPlayer.name}`
                : (player?.name ?? "선수");
              const isActive = activeSlotId === slot.id;
              // 캡처 중엔 적합 표시 숨김 (공유 이미지에 노이즈 제거)
              const firstMatched = !isCapturing && isPositionMatched(player, slot.role);
              const secondMatched = !isCapturing && isPositionMatched(secondPlayer, slot.role);
              const singleMatched = !secondPlayer && firstMatched;
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
                  className={cn(
                    "absolute -translate-x-1/2 -translate-y-1/2 rounded-xl px-2 py-1.5 text-xs font-bold transition-all",
                    isActive && "z-20"
                  )}
                  style={{ left: `${placement.x}%`, top: `${placement.y}%`, touchAction: "none" }}
                >
                  <span className="flex flex-col items-center gap-0.5">
                    {/* 선택 표시 화살표 */}
                    {isActive && (
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-primary text-lg animate-bounce">▼</span>
                    )}
                    <span className="block h-8 w-8 rounded-sm border border-white/40 shadow-md shadow-black/30 sm:h-10 sm:w-10" style={uniformStyle} />
                    {secondPlayer ? (
                      <span
                        className={cn(
                          "flex flex-col items-center rounded-md px-1 py-0.5 shadow-sm sm:px-1.5",
                          (firstMatched || secondMatched)
                            ? "bg-[hsl(var(--success))]/90 ring-2 ring-[hsl(var(--success))] shadow-[0_0_10px_hsl(var(--success)/0.5)]"
                            : "bg-black/70"
                        )}
                        title={(firstMatched || secondMatched) ? "선호 포지션과 일치" : undefined}
                      >
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-white sm:text-xs">
                          <span className="rounded bg-sky-500/40 px-0.5">전</span>
                          {firstMatched && <span className="hidden sm:inline rounded bg-white/25 px-0.5 text-[9px]">적합</span>}
                          {(player?.name ?? "선수").slice(0, 3)}
                        </span>
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-white sm:text-xs">
                          <span className="rounded bg-violet-500/40 px-0.5">후</span>
                          {secondMatched && <span className="hidden sm:inline rounded bg-white/25 px-0.5 text-[9px]">적합</span>}
                          {secondPlayer.name.slice(0, 3)}
                        </span>
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "flex max-w-[64px] items-center gap-1 whitespace-nowrap rounded-md px-1 py-0.5 text-[10px] font-bold shadow-sm sm:max-w-[110px] sm:px-1.5 sm:text-xs",
                          singleMatched
                            ? "bg-[hsl(var(--success))] text-white ring-2 ring-[hsl(var(--success))] shadow-[0_0_10px_hsl(var(--success)/0.6)]"
                            : "bg-black/60 text-foreground"
                        )}
                        title={singleMatched ? "선호 포지션과 일치" : undefined}
                      >
                        {singleMatched && (
                          <span className="hidden sm:inline-block shrink-0 rounded bg-white/25 px-1 text-[9px] font-bold text-white">적합</span>
                        )}
                        <span className="truncate">{displayName}</span>
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 쉬는 인원 (캡처 영역 내) */}
          {restingPlayers.length > 0 && (
            <div className="rounded-xl bg-secondary/50 px-4 py-3">
              <div className="mb-2 flex items-center gap-2">
                <Coffee className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">쉬는 선수</span>
                <Badge variant="secondary" className="text-xs">{restingPlayers.length}</Badge>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {restingPlayers.map((player) => (
                  <Badge key={player.id} variant="secondary" className="text-xs">
                    {player.name}
                  </Badge>
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
          {/* 역할 배정 — 모바일용 (captureRef 밖) */}
          {!readOnly && isMobile && (
            <div className="rounded-xl bg-secondary/50 px-4 py-3">
              <p className="mb-2 text-sm font-bold">역할 배정</p>
              <div className="space-y-3">
                {[
                  { key: "__referee" as const, label: "심판", current: referee },
                  { key: "__camera" as const, label: "촬영", current: camera },
                ].map(({ key, label, current }) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="w-10 text-sm text-muted-foreground">{label}</span>
                    <select
                      value={current}
                      onChange={(e) => handleRoleAssign(key, e.target.value)}
                      className="flex h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">미배정</option>
                      {(() => {
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
            </div>
          )}

          </div>{/* end captureRef */}

          {/* Roster panel — PC: 인라인, 모바일: 바텀시트 */}
          {!readOnly && !isMobile && (
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
                      <div className="mt-3 space-y-2">
                        <p className="text-xs">
                          {placements[activeSlotId]?.secondPlayerId ? "전반" : "배치"}: {roster.find((r) => r.id === placements[activeSlotId]?.playerId)?.name ?? "알 수 없음"}
                          {placements[activeSlotId]?.secondPlayerId && (
                            <> / 후반: {roster.find((r) => r.id === placements[activeSlotId]?.secondPlayerId)?.name ?? "알 수 없음"}</>
                          )}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {!placements[activeSlotId]?.secondPlayerId && (
                            <Button type="button" variant="outline" size="sm" onClick={() => startAssignSecond(activeSlotId)} className="rounded-xl text-[hsl(var(--info))] border-[hsl(var(--info))]/30">
                              + 후반 선수 추가
                            </Button>
                          )}
                          {placements[activeSlotId]?.secondPlayerId && (
                            <Button type="button" variant="outline" size="sm" onClick={() => handleClearSecondPlayer(activeSlotId)} className="rounded-xl text-[hsl(var(--accent))]">
                              후반 선수 해제
                            </Button>
                          )}
                          <Button type="button" variant="outline" size="sm" onClick={() => handleClearSlot(activeSlotId)} className="rounded-xl">
                            배치 해제
                          </Button>
                        </div>
                        {slotMode === "assign_second" && (
                          <p className="text-xs font-bold text-[hsl(var(--info))]">아래에서 후반 선수를 선택하세요</p>
                        )}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">선수를 선택해주세요.</p>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">포지션을 선택하세요.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 bg-secondary">
              <CardContent className="p-4">
                {(() => {
                  const activeSlotRole = activeSlotId
                    ? formation.slots.find((s) => s.id === activeSlotId)?.role ?? null
                    : null;
                  const recommendCount = activeSlotRole
                    ? sortedRoster.filter(
                        (p) => !assignedPlayers.has(p.id) && isPositionMatched(p, activeSlotRole)
                      ).length
                    : 0;
                  return (
                    <>
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-bold text-foreground">선수 선택</p>
                        {activeSlotId && recommendCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--success))]/15 px-2 py-0.5 text-[10px] font-bold text-[hsl(var(--success))]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--success))]" />
                            추천 {recommendCount}명
                          </span>
                        )}
                      </div>
                      {activeSlotId && (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          이 포지션의 선호 포지션과 일치하는 선수가 초록색으로 표시됩니다
                        </p>
                      )}
                      <div className="mt-3 grid gap-2">
                        {sortedRoster.map((player) => {
                          const assignedSlot = assignedPlayers.get(player.id);
                          const isAssigned = Boolean(assignedSlot);
                          const isCurrentSlotPlayer = activeSlotId ? placements[activeSlotId]?.playerId === player.id : false;
                          const isDisabled = !activeSlotId || isAssigned || (slotMode === "assign_second" && isCurrentSlotPlayer);
                          const playedQuarters = playerQuarterMap.get(player.id) ?? [];
                          const qCount = playedQuarters.length;
                          const matched = !isDisabled && activeSlotRole
                            ? isPositionMatched(player, activeSlotRole)
                            : false;
                          // variant 결정: 매칭 추천만 success(초록), 일반 선택은 outline(중립)
                          const variant: "outline" | "success" | "default" = isDisabled
                            ? "outline"
                            : slotMode === "assign_second"
                              ? "default"
                              : matched
                                ? "success"
                                : "outline";
                          return (
                            <Button
                              key={player.id}
                              type="button"
                              variant={variant}
                              disabled={isDisabled}
                              onClick={() => activeSlotId && !isDisabled && handleAssignPlayer(activeSlotId, player.id)}
                              title={matched ? "선호 포지션과 일치" : undefined}
                              className={cn(
                                "flex w-full min-w-0 items-center justify-between gap-2 overflow-hidden rounded-xl px-4 py-3 text-left text-sm h-auto",
                                isAssigned && "text-muted-foreground"
                              )}
                            >
                              <span className="min-w-0 flex-1 truncate font-semibold">{player.name}</span>
                              <span className={cn(
                                "flex shrink-0 items-center gap-1.5 text-xs",
                                matched ? "text-white/85" : "text-muted-foreground"
                              )}>
                                {matched && (
                                  <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                    추천
                                  </span>
                                )}
                                {qCount > 0 && !matched && (
                                  <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
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
                    </>
                  );
                })()}
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

          {/* 모바일 바텀시트 */}
          {!readOnly && isMobile && (
            <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
              <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto rounded-t-2xl">
                <SheetTitle className="text-base font-bold">
                  {activeSlotId ? `${formation.slots.find((s) => s.id === activeSlotId)?.label ?? "포지션"} — 선수 배치` : "선수 배치"}
                </SheetTitle>

                {/* 배치된 슬롯 정보 + 후반 추가 옵션 */}
                {activeSlotId && placements[activeSlotId] && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {placements[activeSlotId]?.secondPlayerId ? "전반" : "배치"}: {roster.find((r) => r.id === placements[activeSlotId]?.playerId)?.name ?? ""}
                      {placements[activeSlotId]?.secondPlayerId && (
                        <> / 후반: {roster.find((r) => r.id === placements[activeSlotId]?.secondPlayerId)?.name ?? ""}</>
                      )}
                    </p>
                    <div className="flex gap-2">
                      {!placements[activeSlotId]?.secondPlayerId && slotMode !== "assign_second" && (
                        <Button type="button" variant="outline" size="sm" onClick={() => { setSlotMode("assign_second"); }} className="rounded-xl text-[hsl(var(--info))] border-[hsl(var(--info))]/30">
                          + 후반 선수 추가
                        </Button>
                      )}
                      {placements[activeSlotId]?.secondPlayerId && (
                        <Button type="button" variant="outline" size="sm" onClick={() => handleClearSecondPlayer(activeSlotId)} className="rounded-xl text-[hsl(var(--accent))]">후반 해제</Button>
                      )}
                      <Button type="button" variant="outline" size="sm" onClick={() => { handleClearSlot(activeSlotId); setMobileSheetOpen(false); }} className="rounded-xl">배치 해제</Button>
                    </div>
                    {slotMode === "assign_second" && (
                      <p className="text-xs font-bold text-[hsl(var(--info))]">후반 선수를 선택하세요</p>
                    )}
                  </div>
                )}

                {(() => {
                  const activeSlotRole = activeSlotId
                    ? formation.slots.find((s) => s.id === activeSlotId)?.role ?? null
                    : null;
                  const recommendCount = activeSlotRole
                    ? sortedRoster.filter(
                        (p) => !assignedPlayers.has(p.id) && isPositionMatched(p, activeSlotRole)
                      ).length
                    : 0;
                  return (
                    <>
                      {activeSlotId && recommendCount > 0 && (
                        <div className="mt-3 flex items-center gap-2 rounded-lg bg-[hsl(var(--success))]/10 px-3 py-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--success))]" />
                          <span className="text-[11px] font-semibold text-[hsl(var(--success))]">
                            추천 {recommendCount}명 · 선호 포지션과 일치하는 선수
                          </span>
                        </div>
                      )}
                      <div className="mt-4 grid gap-2">
                        {sortedRoster.map((player) => {
                          const isAssigned = assignedPlayers.has(player.id);
                          const isCurrentSlotPlayer = activeSlotId ? placements[activeSlotId]?.playerId === player.id : false;
                          const isDisabled = !activeSlotId || isAssigned || (slotMode === "assign_second" && isCurrentSlotPlayer);
                          const matched = !isDisabled && activeSlotRole
                            ? isPositionMatched(player, activeSlotRole)
                            : false;
                          const variant: "outline" | "success" | "default" = isDisabled
                            ? "outline"
                            : slotMode === "assign_second"
                              ? "default"
                              : matched
                                ? "success"
                                : "outline";
                          return (
                            <Button
                              key={player.id}
                              type="button"
                              variant={variant}
                              disabled={isDisabled}
                              onClick={() => activeSlotId && !isDisabled && handleAssignPlayer(activeSlotId, player.id)}
                              title={matched ? "선호 포지션과 일치" : undefined}
                              className={cn(
                                "flex w-full items-center justify-between gap-2 rounded-xl px-4 py-3 text-left text-sm h-auto",
                                isDisabled && "text-muted-foreground"
                              )}
                            >
                              <span className="truncate font-semibold">{player.name}</span>
                              <span className={cn(
                                "flex shrink-0 items-center gap-1.5 text-xs",
                                matched ? "text-white/85" : "text-muted-foreground"
                              )}>
                                {matched && (
                                  <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                    추천
                                  </span>
                                )}
                                {isAssigned && (
                                  formation.slots.find((s) => s.id === assignedPlayers.get(player.id))?.label ?? "배치됨"
                                )}
                              </span>
                            </Button>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
              </SheetContent>
            </Sheet>
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

          const capUniforms = resolvedTeamSettings.uniforms;
          let capPrimary: string, capSecondary: string, capPattern: string;
          if (uniformMode === "THIRD" && capUniforms?.third) {
            capPrimary = capUniforms.third.primary; capSecondary = capUniforms.third.secondary; capPattern = capUniforms.third.pattern;
          } else if (uniformMode === "AWAY" && capUniforms?.away) {
            capPrimary = capUniforms.away.primary; capSecondary = capUniforms.away.secondary; capPattern = capUniforms.away.pattern;
          } else if (capUniforms?.home) {
            capPrimary = capUniforms.home.primary; capSecondary = capUniforms.home.secondary; capPattern = capUniforms.home.pattern;
          } else {
            const hp = resolvedTeamSettings.uniformPrimary || "#2563eb";
            const hs = resolvedTeamSettings.uniformSecondary || "#f97316";
            capPrimary = uniformMode === "HOME" ? hp : hs; capSecondary = uniformMode === "HOME" ? hs : hp;
            capPattern = resolvedTeamSettings.uniformPattern || "SOLID";
          }
          const uStyle = getJerseyStyle(capPrimary, capSecondary, capPattern);

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
                  aspectRatio: isFutsal ? "3/2" : "4/5",
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

    {/* 쿼터별 출전 현황 매트릭스 */}
    <Sheet open={quarterMatrixOpen} onOpenChange={setQuarterMatrixOpen}>
      <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto">
        <SheetTitle className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          쿼터별 출전 현황
        </SheetTitle>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30">
                <th className="py-2 pr-3 text-left text-xs font-medium text-muted-foreground">선수</th>
                {quarters.map((q) => (
                  <th key={q} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground">Q{q}</th>
                ))}
                <th className="pl-3 py-2 text-center text-xs font-medium text-muted-foreground">합계</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((player) => {
                const playedQuarters = playerQuarterMap.get(player.id) ?? [];
                const qSet = new Set(playedQuarters);
                return (
                  <tr key={player.id} className="border-b border-border/10">
                    <td className="py-2 pr-3 text-sm font-medium whitespace-nowrap">{player.name}</td>
                    {quarters.map((q) => (
                      <td key={q} className="px-2 py-2 text-center">
                        {qSet.has(q) ? (
                          <span className={cn(
                            "inline-block h-5 w-5 rounded-full text-[10px] font-bold leading-5 text-center",
                            q === activeQuarter
                              ? "bg-primary text-white"
                              : "bg-primary/20 text-primary"
                          )}>●</span>
                        ) : (
                          <span className="inline-block h-5 w-5 text-center text-muted-foreground/30">—</span>
                        )}
                      </td>
                    ))}
                    <td className="pl-3 py-2 text-center">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {playedQuarters.length}/{quarters.length}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SheetContent>
    </Sheet>
    </>
  );
}
