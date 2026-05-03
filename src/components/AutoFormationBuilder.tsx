"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  getFormationsForSportAndCount,
  formationTemplates,
  type FormationSlot,
  type FormationTemplate,
} from "@/lib/formations";
import { apiMutate } from "@/lib/useApi";
import type { Position, PreferredPosition, SportType } from "@/lib/types";
import { PREF_TO_POSITION, PREF_POSITION_SHORT } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/lib/ConfirmContext";
import { Zap, Sparkles, Loader2, Palette } from "lucide-react";

/* ── Types ── */

export type AttendingPlayer = {
  /** 표시용 메인 id — 연동 회원은 users.id, 미연동·용병은 team_members.id / match_guests.id */
  id: string;
  name: string;
  preferredPosition: PreferredPosition; // 주 포지션 (하위 호환)
  preferredPositions?: PreferredPosition[]; // 복수 선호 포지션
  /** 용병 여부 — AI 프롬프트에 전달해 실력 불확실성 반영 */
  isGuest?: boolean;
  /**
   * 연동 회원의 users.id — squad가 user_id 또는 member_id 어느 쪽으로 저장돼도 매칭하기 위해 별도 보존.
   * 회원: id === userId 일 수 있고 그 경우 memberId도 있음. 미연동/용병은 undefined.
   */
  userId?: string;
  /**
   * team_members.id — 연동 회원이면 user_id 외에도 함께 보존. 미연동 회원은 id === memberId.
   */
  memberId?: string;
};

type PlayerAssignment = AttendingPlayer & {
  quarters: number; // 0, 0.5, 1, ... quarterCount
  isGK: boolean;
};

type SlotAssignment = {
  slotId: string;
  slotLabel: string;
  playerId: string;
  playerName: string;
  type: "full" | "first_half" | "second_half";
};

type QuarterResult = {
  quarter: number;
  assignments: SlotAssignment[];
  /** 쿼터별 다른 포메이션 사용 시 (AI 풀 플랜 적용). 없으면 상위 formation 사용 */
  formationId?: string;
};

export type GeneratedSquad = {
  quarter_number: number;
  formation: string;
  positions: Record<string, { playerId: string; x: number; y: number; secondPlayerId?: string }>;
};

type Props = {
  matchId: string;
  quarterCount: number;
  attendingPlayers: AttendingPlayer[];
  sportType?: SportType;
  /** 경기별 참가 인원 (축구 8/9/10/11, 풋살 3~6) */
  playerCount?: number;
  defaultFormationId?: string;
  side?: "A" | "B";
  /** 이미 전술판에 편성이 저장된 상태인지 — 덮어쓰기 확인 다이얼로그 표시 기준 */
  hasExistingFormation?: boolean;
  /**
   * DB 에 저장된 쿼터별 편성 원본 — 새로고침·재진입 후 빌더 UI 복원용.
   * MatchTacticsTab 이 /api/squads 에서 fetch 해둔 dbSquads 를 그대로 전달.
   */
  initialSquads?: Array<{
    quarter_number: number;
    formation: string;
    positions: Record<string, { playerId: string; x: number; y: number; secondPlayerId?: string } | null>;
  }>;
  onGenerated?: (squads: GeneratedSquad[]) => void;
  /** AI 풀 플랜 응답의 coaching 본문을 상위에 전달 — AiCoachAnalysisCard 즉시 갱신용 */
  onAiCoachingReady?: (payload: { analysis: string; source: "ai" | "rule" }) => void;
  /** 자동 편성 결과가 바뀔 때 AI 코치 분석에 필요한 컨텍스트를 상위에 제공 */
  onAnalysisContextReady?: (ctx: {
    placement: Array<{ slot: string; playerName: string }>;
    quarterPlacements: Array<{ quarter: number; assignments: Array<{ slot: string; playerName: string }> }>;
    /** 쿼터별 포메이션 이름 — AI 가 가짜 포메이션 창작 방지용 */
    quarterFormations: Array<{ quarter: number; formation: string }>;
    attendees: Array<{ name: string; preferredPosition?: string | null; isGuest?: boolean }>;
    formationName: string;
    quarterCount: number;
    allSlotsFilled: boolean;
    /**
     * 편성을 어떤 방식으로 생성했는지 — AI 코치 어투 분기용.
     * - "rule": 팀 기본 포메이션 + 규칙 기반 배치 (AI가 포메이션 고른 것 아님)
     * - "ai-fixed": 팀 포메이션 고정, 배치만 AI 최적화
     * - "ai-free": AI 가 쿼터별로 포메이션을 직접 설계 (풀 플랜)
     * - "manual": DB 복원·수동 편집 케이스 (이번 세션에서 생성 버튼 안 누름)
     */
    generationMode: "rule" | "ai-fixed" | "ai-free" | "manual";
  } | null) => void;
  /** AI 코치 분석 버튼 표시 여부 (김선휘 Feature Flag) */
  enableAi?: boolean;
  /** 분석에 전달할 경기 맥락 */
  matchContext?: {
    matchType: "REGULAR" | "INTERNAL" | "EVENT";
    opponent: string | null;
  };
};

/* ── Position helpers ── */

/** 포메이션 슬롯 → 세분화 포지션 매핑 */
function getSlotSubPosition(slot: FormationSlot): PreferredPosition {
  if (slot.role === "GK") return "GK";
  if (["CB", "LCB", "RCB"].includes(slot.role)) return "CB";
  if (["LB", "LWB"].includes(slot.role)) return "LB";
  if (["RB", "RWB"].includes(slot.role)) return "RB";
  if (["CDM", "LDM", "RDM"].includes(slot.role)) return "CDM";
  if (["CM", "LCM", "RCM"].includes(slot.role)) return "CM";
  if (slot.role === "LM") return "LW";
  if (slot.role === "RM") return "RW";
  if (slot.role === "CAM") return "CAM";
  if (slot.role === "LAM") return "LW";
  if (slot.role === "RAM") return "RW";
  if (slot.role === "LW") return "LW";
  if (slot.role === "RW") return "RW";
  // 풋살 slot — DetailedPosition 풋살 코드 매핑 (41차 풋살 활성화 후속)
  if (slot.role === "FIXO") return "FIXO";
  if (slot.role === "ALA") return "ALA";
  if (slot.role === "PIVO") return "PIVO";
  return "ST"; // ST, CF, LS, RS
}

/** 포메이션 슬롯 → 상위 4분류 */
function getSlotCategory(slot: FormationSlot): Position {
  return PREF_TO_POSITION[getSlotSubPosition(slot)];
}

const POS_LABEL: Record<PreferredPosition, string> = {
  GK: "GK",
  CB: "CB",
  LB: "LB",
  RB: "RB",
  CDM: "CDM",
  CM: "CM",
  CAM: "CAM",
  LW: "LW",
  RW: "RW",
  ST: "ST",
  FIXO: "FIXO",
  ALA: "ALA",
  PIVO: "PIVO",
};
const POS_COLOR: Record<PreferredPosition, string> = {
  GK: "bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30",
  CB: "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30",
  LB: "bg-sky-500/20 text-sky-700 dark:text-sky-400 border-sky-500/30",
  RB: "bg-sky-500/20 text-sky-700 dark:text-sky-400 border-sky-500/30",
  CDM: "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30",
  CM: "bg-teal-500/20 text-teal-700 dark:text-teal-400 border-teal-500/30",
  CAM: "bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border-cyan-500/30",
  LW: "bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30",
  RW: "bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30",
  ST: "bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-500/30",
  FIXO: "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30",
  ALA: "bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border-cyan-500/30",
  PIVO: "bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-500/30",
};

/* ── Distribution calculator ── */

function calculateFairDistribution(
  fieldCount: number,
  quarters: number,
  slotsPerQ: number = 10,
) {
  if (fieldCount === 0)
    return { high: 0, low: 0, highCount: 0, lowCount: 0 };

  const total = slotsPerQ * quarters;
  const avg = total / fieldCount;

  if (avg >= quarters)
    return {
      high: quarters,
      low: quarters,
      highCount: fieldCount,
      lowCount: 0,
    };

  const high = Math.ceil(avg * 2) / 2;
  const low = Math.floor(avg * 2) / 2;

  if (high === low)
    return { high, low, highCount: fieldCount, lowCount: 0 };

  const lowCount = Math.round(
    (fieldCount * high - total) / (high - low),
  );
  return { high, low, highCount: fieldCount - lowCount, lowCount };
}

/* ── Quarter scheduling algorithm (v2 — capacity-constrained) ── */

function scheduleQuarters(
  players: PlayerAssignment[],
  quarterCount: number,
  formation: FormationTemplate,
): QuarterResult[] {
  const slotsPerQ = formation.slots.length - 1; // GK 제외 필드 슬롯
  const gks = players.filter((p) => p.isGK);
  // 필드 선수 셔플 — 같은 조건이면 순서에 따라 결과가 달라지므로 매번 다른 편성 생성
  const field = players.filter((p) => !p.isGK && p.quarters > 0)
    .sort(() => Math.random() - 0.5);

  // ── GK per quarter ──
  const gkPerQ: Record<number, { playerId: string; name: string }> = {};
  if (gks.length === 1) {
    for (let q = 1; q <= quarterCount; q++)
      gkPerQ[q] = { playerId: gks[0].id, name: gks[0].name };
  } else if (gks.length >= 2) {
    for (let q = 1; q <= quarterCount; q++) {
      const gk = gks[(q - 1) % gks.length];
      gkPerQ[q] = { playerId: gk.id, name: gk.name };
    }
  }

  // ── Separate full / half-quarter field players ──
  const fullQPlayers = field.filter((p) => p.quarters % 1 === 0);
  const halfQPlayers = field.filter((p) => p.quarters % 1 !== 0);

  // ── Pair half-quarter players ──
  const pairs: [PlayerAssignment, PlayerAssignment | null][] = [];
  for (let i = 0; i < halfQPlayers.length; i += 2) {
    pairs.push([halfQPlayers[i], halfQPlayers[i + 1] ?? null]);
  }

  // remaining[qi] = 남은 슬롯 수 (0-indexed)
  const remaining = new Array(quarterCount).fill(slotsPerQ);

  const playerQMap = new Map<
    string,
    { quarter: number; type: "full" | "first_half" | "second_half" }[]
  >();
  field.forEach((p) => playerQMap.set(p.id, []));

  // ── Step 1: 하프 쿼터 페어를 먼저 배정 (각 페어 = 1슬롯) ──
  const pairQuarterIdx: number[] = [];
  for (const [p1, p2] of pairs) {
    // 남은 슬롯이 가장 많은 쿼터에 배정
    let bestQi = 0;
    for (let qi = 1; qi < quarterCount; qi++) {
      if (remaining[qi] > remaining[bestQi]) bestQi = qi;
    }
    pairQuarterIdx.push(bestQi);
    remaining[bestQi] -= 1;
    playerQMap.get(p1.id)!.push({
      quarter: bestQi + 1,
      type: p2 ? "first_half" : "full",
    });
    if (p2) {
      playerQMap.get(p2.id)!.push({
        quarter: bestQi + 1,
        type: "second_half",
      });
    }
  }

  // ── Step 2: 풀 쿼터 배정 (용량 제한 준수) ──
  type FullReq = {
    playerId: string;
    needed: number;
    assignedQs: Set<number>;
  };
  const reqs: FullReq[] = [];

  for (const p of fullQPlayers) {
    reqs.push({ playerId: p.id, needed: p.quarters, assignedQs: new Set() });
  }
  for (let pi = 0; pi < pairs.length; pi++) {
    const [p1, p2] = pairs[pi];
    const pairQi = pairQuarterIdx[pi];
    reqs.push({
      playerId: p1.id,
      needed: Math.floor(p1.quarters),
      assignedQs: new Set([pairQi]),
    });
    if (p2) {
      reqs.push({
        playerId: p2.id,
        needed: Math.floor(p2.quarters),
        assignedQs: new Set([pairQi]),
      });
    }
  }

  // 분산이 필요한 선수(2Q) 먼저, 그 다음 제약이 큰 선수(assignedQs 있는 하프), 마지막 3Q+
  reqs.sort((a, b) => {
    // 하프쿼터로 이미 배정된 선수 우선 (선택지가 적으므로)
    if (a.assignedQs.size !== b.assignedQs.size) return b.assignedQs.size - a.assignedQs.size;
    // 적게 뛰는 선수(2Q) 먼저 배정해야 분산 배치 가능
    if (a.needed !== b.needed) return a.needed - b.needed;
    return 0;
  });

  for (const req of reqs) {
    // 남은 용량이 있고 아직 배정 안 된 쿼터만 후보
    const available = Array.from({ length: quarterCount }, (_, i) => i)
      .filter((qi) => remaining[qi] > 0 && !req.assignedQs.has(qi));

    let selected: number[];
    const skip = available.length - req.needed; // 빠질 쿼터 수

    if (skip === 0 || req.needed <= 1) {
      // 전부 뛰거나 1쿼터: remaining 많은 순
      selected = available.sort((a, b) => remaining[b] - remaining[a]).slice(0, req.needed);
    } else if (skip >= req.needed) {
      // 절반 이하만 뛰는 경우 (예: 2Q/4Q) → 균등 간격 분산
      const idealGap = quarterCount / req.needed;
      const combos: number[][] = [];
      const pick = (start: number, chosen: number[]) => {
        if (chosen.length === req.needed) { combos.push([...chosen]); return; }
        for (let i = start; i < available.length; i++) {
          chosen.push(available[i]);
          pick(i + 1, chosen);
          chosen.pop();
        }
      };
      pick(0, []);
      selected = combos.sort((a, b) => {
        const scoreCombo = (c: number[]) => {
          const gaps = c.slice(1).map((v, i) => v - c[i]);
          return gaps.reduce((s, g) => s + Math.abs(g - idealGap), 0);
        };
        const diff = scoreCombo(a) - scoreCombo(b);
        if (diff !== 0) return diff;
        return b.reduce((s, qi) => s + remaining[qi], 0) - a.reduce((s, qi) => s + remaining[qi], 0);
      })[0] ?? available.slice(0, req.needed);
    } else {
      // 대부분 뛰고 1~2개만 빠지는 경우 (예: 3Q/4Q) → remaining 가장 적은 쿼터를 빼기
      const sorted = [...available].sort((a, b) => remaining[a] - remaining[b]);
      const toSkip = new Set(sorted.slice(0, skip));
      selected = available.filter((qi) => !toSkip.has(qi));
    }

    for (const qi of selected) {
      playerQMap.get(req.playerId)!.push({ quarter: qi + 1, type: "full" });
      remaining[qi] -= 1;
    }
  }

  // ── Step 3: 쿼터별 슬롯 배정 ──
  const results: QuarterResult[] = [];

  for (let q = 1; q <= quarterCount; q++) {
    const assignments: SlotAssignment[] = [];

    // GK slot
    const gkSlot = formation.slots.find((s) => s.role === "GK");
    if (gkSlot && gkPerQ[q]) {
      assignments.push({
        slotId: gkSlot.id,
        slotLabel: gkSlot.label,
        playerId: gkPerQ[q].playerId,
        playerName: gkPerQ[q].name,
        type: "full",
      });
    }

    // 이 쿼터에 배정된 필드 선수
    const qFull: { id: string }[] = [];
    const qFirstHalf: { id: string }[] = [];
    const qSecondHalf: { id: string }[] = [];
    for (const [pid, qList] of playerQMap) {
      const match = qList.find((x) => x.quarter === q);
      if (!match) continue;
      if (match.type === "full") qFull.push({ id: pid });
      else if (match.type === "first_half") qFirstHalf.push({ id: pid });
      else qSecondHalf.push({ id: pid });
    }

    // 하프 페어: first_half + second_half 를 하나의 슬롯으로 묶기
    type SlotReq = {
      ids: string[];
      type: "full" | "first_half" | "second_half";
      preferredPos: PreferredPosition;
    };
    const slotReqs: SlotReq[] = [];

    const validPositions = new Set<string>(["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST", "FIXO", "ALA", "PIVO"]);

    /** 선수의 유효한 선호 포지션 목록 반환 */
    const getAllPos = (id: string): PreferredPosition[] => {
      const p = field.find((f) => f.id === id);
      const positions = (p?.preferredPositions ?? [p?.preferredPosition]).filter(
        (pos): pos is PreferredPosition => !!pos && validPositions.has(pos)
      );
      return positions.length > 0 ? positions : ["CAM"];
    };

    /** 이전 쿼터에서 선수가 배정된 포지션 카테고리 추적 (로테이션용) */
    const playerPosHistory: Record<string, Record<string, number>> = {}; // playerId → { PreferredPosition: count }
    for (const prev of results) {
      for (const a of prev.assignments) {
        if (!playerPosHistory[a.playerId]) playerPosHistory[a.playerId] = {};
        // slotLabel(LCB,RCB,LDM 등) → PreferredPosition(CB,CDM 등)으로 변환
        const slot = formation.slots.find((s) => s.id === a.slotId);
        const posKey = slot ? getSlotSubPosition(slot) : a.slotLabel;
        playerPosHistory[a.playerId][posKey] = (playerPosHistory[a.playerId][posKey] ?? 0) + 1;
      }
    }

    /** 포지션 겹침 시 양보: 이전에 덜 한 포지션 우선 */
    const getBestPos = (id: string): PreferredPosition => {
      const positions = getAllPos(id);
      if (positions.length === 1) return positions[0];
      const history = playerPosHistory[id] ?? {};
      // 이전 쿼터에서 덜 배정된 포지션을 우선 선택
      return [...positions].sort((a, b) => (history[a] ?? 0) - (history[b] ?? 0))[0];
    };

    // 풀타임 선수
    for (const fp of qFull) {
      slotReqs.push({ ids: [fp.id], type: "full", preferredPos: getBestPos(fp.id) });
    }

    // 하프 페어 — first_half[i] + second_half[i]가 같은 슬롯
    const pairCount = Math.min(qFirstHalf.length, qSecondHalf.length);
    for (let i = 0; i < pairCount; i++) {
      slotReqs.push({
        ids: [qFirstHalf[i].id, qSecondHalf[i].id],
        type: "first_half",
        preferredPos: getBestPos(qFirstHalf[i].id),
      });
    }
    // 남은 미페어 하프 (있으면 풀타임 처리)
    for (let i = pairCount; i < qFirstHalf.length; i++) {
      slotReqs.push({ ids: [qFirstHalf[i].id], type: "full", preferredPos: getBestPos(qFirstHalf[i].id) });
    }
    for (let i = pairCount; i < qSecondHalf.length; i++) {
      slotReqs.push({ ids: [qSecondHalf[i].id], type: "full", preferredPos: getBestPos(qSecondHalf[i].id) });
    }

    // 슬롯을 세분화 포지션별로 분류
    const fieldSlots = formation.slots.filter((s) => s.role !== "GK");
    const slotsBySubPos: Record<PreferredPosition, FormationSlot[]> = {
      GK: [], CB: [], LB: [], RB: [], CDM: [], CM: [], CAM: [], LW: [], RW: [], ST: [], FIXO: [], ALA: [], PIVO: [],
    };
    fieldSlots.forEach((s) => slotsBySubPos[getSlotSubPosition(s)].push(s));

    // 슬롯 요청을 선호 포지션별로 분류
    const reqsBySubPos: Record<PreferredPosition, SlotReq[]> = {
      GK: [], CB: [], LB: [], RB: [], CDM: [], CM: [], CAM: [], LW: [], RW: [], ST: [], FIXO: [], ALA: [], PIVO: [],
    };
    for (const sr of slotReqs) {
      const bucket = reqsBySubPos[sr.preferredPos];
      if (bucket) bucket.push(sr);
      else reqsBySubPos["CAM"].push(sr);
    }

    const usedSlots = new Set<string>();
    const assignedReqs = new Set<SlotReq>();

    // 슬롯 요청을 슬롯에 배정하는 헬퍼
    function assignSlotReq(slot: FormationSlot, sr: SlotReq) {
      if (sr.ids.length === 2) {
        const p1 = players.find((p) => p.id === sr.ids[0])!;
        const p2 = players.find((p) => p.id === sr.ids[1])!;
        assignments.push({
          slotId: slot.id, slotLabel: slot.label,
          playerId: p1.id, playerName: p1.name, type: "first_half",
        });
        assignments.push({
          slotId: slot.id, slotLabel: slot.label,
          playerId: p2.id, playerName: p2.name, type: "second_half",
        });
      } else {
        const p = players.find((pl) => pl.id === sr.ids[0])!;
        assignments.push({
          slotId: slot.id, slotLabel: slot.label,
          playerId: p.id, playerName: p.name, type: sr.type,
        });
      }
      usedSlots.add(slot.id);
      assignedReqs.add(sr);
    }

    // 슬롯 요청에 선수의 모든 선호 포지션 정보 첨부
    type EnrichedSlotReq = SlotReq & { allPositions: PreferredPosition[] };
    const enrichedReqs: EnrichedSlotReq[] = slotReqs.map((sr) => ({
      ...sr,
      allPositions: getAllPos(sr.ids[0]),
    }));

    // 선택지가 적은 선수부터 배정 (포지션 1개인 선수가 밀리지 않도록)
    const sortedReqs = [...enrichedReqs].sort((a, b) => a.allPositions.length - b.allPositions.length);

    // 1차: 선호 포지션 정확 매칭 (선택지 적은 순)
    for (const sr of sortedReqs) {
      if (assignedReqs.has(sr)) continue;
      const history = playerPosHistory[sr.ids[0]] ?? {};
      const sortedPositions = [...sr.allPositions].sort(
        (a, b) => (history[a] ?? 0) - (history[b] ?? 0)
      );
      for (const pos of sortedPositions) {
        const slot = slotsBySubPos[pos]?.find((s) => !usedSlots.has(s.id));
        if (slot) { assignSlotReq(slot, sr); break; }
      }
    }

    // 2차: 같은 카테고리 매칭 (선택지 적은 순)
    for (const sr of sortedReqs) {
      if (assignedReqs.has(sr)) continue;
      const history = playerPosHistory[sr.ids[0]] ?? {};
      const sortedPositions = [...sr.allPositions].sort(
        (a, b) => (history[a] ?? 0) - (history[b] ?? 0)
      );
      for (const pos of sortedPositions) {
        const cat = PREF_TO_POSITION[pos];
        const slot = fieldSlots.find((s) => !usedSlots.has(s.id) && getSlotCategory(s) === cat);
        if (slot) { assignSlotReq(slot, sr); break; }
      }
    }

    // 3차: 그래도 남은 요청 → 인접 카테고리 슬롯 우선 배정
    // DF→CDM→CM, FW→CAM→CM, MF→아무 순서로 가까운 슬롯 우선
    const posProximity: Record<string, PreferredPosition[]> = {
      DF: ["CDM", "CM", "CAM", "LW", "RW", "ST"],
      MF: ["LW", "RW", "CB", "LB", "RB", "ST"],
      FW: ["CAM", "CM", "CDM", "LW", "RW", "CB"],
    };
    const finalRemReqs = enrichedReqs.filter((sr) => !assignedReqs.has(sr));
    for (const sr of finalRemReqs) {
      const cat = PREF_TO_POSITION[sr.preferredPos] ?? "MF";
      const nearby = posProximity[cat] ?? [];
      let placed = false;
      for (const pos of nearby) {
        const slot = slotsBySubPos[pos]?.find((s) => !usedSlots.has(s.id));
        if (slot) { assignSlotReq(slot, sr); placed = true; break; }
      }
      if (!placed) {
        const anySlot = fieldSlots.find((s) => !usedSlots.has(s.id));
        if (anySlot) assignSlotReq(anySlot, sr);
      }
    }
    // 혹시 남은 미배정 (거의 없음)
    const finalRemSlots = fieldSlots.filter((s) => !usedSlots.has(s.id));
    const stillRemReqs = enrichedReqs.filter((sr) => !assignedReqs.has(sr));
    for (let i = 0; i < Math.min(finalRemSlots.length, stillRemReqs.length); i++) {
      assignSlotReq(finalRemSlots[i], finalRemReqs[i]);
    }

    results.push({ quarter: q, assignments, formationId: formation.id });
  }

  return results;
}

/* ── Component ── */

export default function AutoFormationBuilder({
  matchId,
  quarterCount,
  attendingPlayers,
  sportType = "SOCCER",
  playerCount,
  defaultFormationId,
  side,
  hasExistingFormation = false,
  initialSquads,
  onGenerated,
  onAiCoachingReady,
  onAnalysisContextReady,
  enableAi = false,
  matchContext,
}: Props) {
  const confirm = useConfirm();
  // 경기 인원 수에 맞는 포메이션만 필터 (미지정 시 축구 11, 풋살 5 기본)
  const effectiveFieldCount = playerCount ?? (sportType === "FUTSAL" ? 5 : 11);
  const filteredFormations = useMemo(
    () => {
      const filtered = getFormationsForSportAndCount(sportType, effectiveFieldCount);
      // 폴백: 매칭 없으면 해당 스포츠 전체 (레거시 player_count=7 등 대응)
      return filtered.length > 0 ? filtered : getFormationsForSportAndCount(sportType);
    },
    [sportType, effectiveFieldCount]
  );
  const [isOpen, setIsOpen] = useState(false);
  const defaultId = (defaultFormationId && filteredFormations.some(f => f.id === defaultFormationId)) ? defaultFormationId : (filteredFormations[0]?.id ?? "");
  const [formationId, setFormationId] = useState(defaultId);
  // defaultFormationId가 /api/teams 비동기 응답으로 뒤늦게 채워지는 경우를 대비해 1회 동기화.
  // 사용자가 수동으로 바꾼 후엔 prop이 바뀌어도 덮어쓰지 않음.
  const defaultSyncedRef = useRef(false);
  useEffect(() => {
    if (defaultSyncedRef.current) return;
    if (!defaultFormationId) return;
    if (!filteredFormations.some(f => f.id === defaultFormationId)) return;
    if (formationId === defaultFormationId) { defaultSyncedRef.current = true; return; }
    setFormationId(defaultFormationId);
    defaultSyncedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultFormationId, filteredFormations]);
  const [assignments, setAssignments] = useState<PlayerAssignment[]>(
    [],
  );
  const [results, setResults] = useState<QuarterResult[] | null>(null);
  const [saving, setSaving] = useState(false);
  /** 초기 복원 한 번만 실행 — 사용자가 새 편성 생성 후 prop 변경돼도 덮어쓰지 않기 위함 */
  const [initialRestored, setInitialRestored] = useState(false);
  /**
   * 마지막 편성이 어떻게 생성됐는지 — AI 코치 어투 분기용.
   * - 초기엔 "manual" (복원되지 않은 상태는 null → manual 기본값)
   * - generate() → "rule"
   * - handleAiPlanGenerate(true) 성공 → "ai-fixed"
   * - handleAiPlanGenerate(false) 적용 → "ai-free"
   */
  const [lastGenerationMode, setLastGenerationMode] = useState<"rule" | "ai-fixed" | "ai-free" | "manual">("manual");

  // DB 에 저장된 편성이 있으면 빌더 results state 로 복원 (mount 1회).
  // 사용자가 생성 버튼 누르면 덮어쓰기 confirm 이 별도로 걸리므로 충돌 없음.
  //
  // 중요: attendingPlayers 가 아직 로드되지 않은 상태(빈 배열)에서 실행하면
  // nameMap 이 비어 매핑 실패 → converted 빈 배열 → restored=true 로 잠겨버림.
  // 그래서 nameMap 매칭 실패해도 placeholder 이름으로 복원해 allSlotsFilled 판정이
  // playerId 존재 여부만으로 결정되도록 한다.
  useEffect(() => {
    if (initialRestored) return;
    if (!initialSquads || initialSquads.length === 0) return;
    const nameMap = new Map<string, string>();
    for (const p of attendingPlayers) nameMap.set(p.id, p.name);

    const converted: QuarterResult[] = [];
    const sorted = [...initialSquads].sort((a, b) => a.quarter_number - b.quarter_number);
    for (const sq of sorted) {
      const tpl = formationTemplates.find((f) => f.id === sq.formation);
      if (!tpl) continue;
      const assignments: SlotAssignment[] = [];
      for (const [slotId, pos] of Object.entries(sq.positions ?? {})) {
        if (!pos || slotId.startsWith("__")) continue;
        const slot = tpl.slots.find((s) => s.id === slotId);
        if (!slot) continue;
        // 이름 매핑 실패해도 복원 — AI 코치 allSlotsFilled 판정은 playerId 기준
        const playerName = nameMap.get(pos.playerId) ?? `선수(${pos.playerId.slice(0, 6)})`;
        assignments.push({
          slotId: slot.id,
          slotLabel: slot.label,
          playerId: pos.playerId,
          playerName,
          type: pos.secondPlayerId ? "first_half" : "full",
        });
        if (pos.secondPlayerId) {
          const secondName = nameMap.get(pos.secondPlayerId) ?? `선수(${pos.secondPlayerId.slice(0, 6)})`;
          assignments.push({
            slotId: slot.id,
            slotLabel: slot.label,
            playerId: pos.secondPlayerId,
            playerName: secondName,
            type: "second_half",
          });
        }
      }
      if (assignments.length > 0) {
        converted.push({ quarter: sq.quarter_number, assignments, formationId: sq.formation });
      }
    }

    // converted.length === 0 인 경우는 initialSquads 에 실제 배치 데이터가 없는 케이스
    // (포메이션만 저장된 빈 전술판). 이 때도 restored=true 로 잠가서 재시도 안 함.
    if (converted.length > 0) {
      setResults(converted);
    }
    setInitialRestored(true);
  }, [initialSquads, attendingPlayers, initialRestored]);
  /**
   * 편성 방식:
   * - rule: 규칙 기반 (주어진 포메이션 + scheduleQuarters, 감독지정→선호포지션 순)
   * - ai-free: AI 추천 — 우리 기록·참석자 기반으로 포메이션과 배치 전부 AI 설계
   */
  type PlanMode = "rule" | "ai-free";
  const [planMode, setPlanMode] = useState<PlanMode>("rule");
  const [aiPlans, setAiPlans] = useState<Array<{ quarter: number; formation: string; placement: Array<{ slot: string; playerName: string }>; note?: string }> | null>(null);
  const [aiPlanLoading, setAiPlanLoading] = useState(false);
  const [aiPlanError, setAiPlanError] = useState<string | null>(null);
  const [aiPlanSource, setAiPlanSource] = useState<"ai" | "rule" | null>(null);
  /**
   * AI-free 모드: applyAiPlanToResults에서 results 클로저가 null일 수 있어
   * AI가 일부 쿼터를 누락하면 fallback 불가 → 해당 쿼터 드롭 → 전술판 빈 화면.
   * AI fetch 전에 계산한 기본 스케줄을 ref에 보존해 즉시 적용 시 fallback으로 사용.
   */
  const aiFreeFallbackRef = useRef<QuarterResult[] | null>(null);

  const formation = useMemo(
    () =>
      filteredFormations.find((f) => f.id === formationId) ??
      filteredFormations[0],
    [formationId, filteredFormations],
  );

  // 자동 편성 결과 변할 때 AI 코치 분석 컨텍스트를 상위에 전달 (Phase B — 전술판 아래 AiCoachAnalysisCard용)
  // ⚠️ isBalanced는 이 훅보다 아래(686번)에 선언되므로 내부에서 직접 계산
  useEffect(() => {
    if (!onAnalysisContextReady) return;
    if (!results || !formation) {
      onAnalysisContextReady(null);
      return;
    }
    const firstQuarter = results[0];
    if (!firstQuarter) {
      onAnalysisContextReady(null);
      return;
    }
    const placement = firstQuarter.assignments.map((a) => ({
      slot: a.slotLabel,
      playerName: a.playerName,
    }));
    // 전체 쿼터 배치 (AI 코치가 교체 패턴 분석용)
    const quarterPlacements = results.map((qr) => ({
      quarter: qr.quarter,
      assignments: qr.assignments.map((a) => ({
        slot: a.slotLabel,
        playerName: a.playerName,
      })),
    }));
    // 쿼터별 포메이션 이름 — AI 풀 플랜 쓰면 쿼터마다 다른 formationId, 아니면 전체 동일
    const quarterFormations = results.map((qr) => {
      const fid = qr.formationId ?? formation.id;
      const tpl = formationTemplates.find((f) => f.id === fid);
      return { quarter: qr.quarter, formation: tpl?.name ?? fid };
    });
    const attendees = attendingPlayers.map((p) => ({
      name: p.name,
      preferredPosition: p.preferredPosition,
      isGuest: p.isGuest ?? false,
    }));
    // 전술판이 모두 채워졌는지: 각 쿼터의 unique slotId 수가 (슬롯수 - GK) 이상인지로 판정.
    // 반쿼터 교체(first_half + second_half)는 같은 slotId로 들어오므로 Set으로 중복 제거해야 과대 계산 방지.
    const slotsPerQtr = formation.slots.length - 1; // GK 슬롯 제외
    const allSlotsFilled = results.length >= quarterCount && results.every((qr) => {
      const uniqueFieldSlots = new Set(
        qr.assignments
          .filter((a) => !a.slotLabel.toUpperCase().includes("GK"))
          .map((a) => a.slotId),
      );
      return uniqueFieldSlots.size >= slotsPerQtr;
    });
    onAnalysisContextReady({
      placement,
      quarterPlacements,
      quarterFormations,
      attendees,
      formationName: formation.name,
      quarterCount,
      allSlotsFilled,
      generationMode: lastGenerationMode,
    });
  }, [results, formation, attendingPlayers, quarterCount, onAnalysisContextReady, lastGenerationMode]);

  // Sync assignments when attendingPlayers changes — auto-distribute on init
  useEffect(() => {
    const gkCount = attendingPlayers.filter(
      (p) => (p.preferredPositions ?? [p.preferredPosition]).includes("GK"),
    ).length;
    const fieldCount = attendingPlayers.length - gkCount;
    const slotsPerQuarter =
      (filteredFormations.find((f) => f.id === formationId) ??
        filteredFormations[0]
      ).slots.length - 1;
    const dist = calculateFairDistribution(
      fieldCount,
      quarterCount,
      slotsPerQuarter,
    );

    let highAssigned = 0;
    setAssignments(
      attendingPlayers.map((p) => {
        const isGK = (p.preferredPositions ?? [p.preferredPosition]).includes("GK");
        if (isGK) {
          return { ...p, isGK: true, quarters: quarterCount };
        }
        let q: number;
        if (highAssigned < dist.highCount) {
          q = dist.high;
          highAssigned++;
        } else {
          q = dist.low;
        }
        return { ...p, isGK: false, quarters: q };
      }),
    );
    setResults(null);
  }, [attendingPlayers, quarterCount, formationId]);

  const gks = useMemo(
    () => assignments.filter((a) => a.isGK),
    [assignments],
  );
  const fieldPlayers = useMemo(
    () => assignments.filter((a) => !a.isGK),
    [assignments],
  );

  const slotsPerQ = formation.slots.length - 1; // GK 제외
  const totalNeeded = slotsPerQ * quarterCount;
  const totalAssigned = useMemo(
    () => fieldPlayers.reduce((s, p) => s + p.quarters, 0),
    [fieldPlayers],
  );
  const isBalanced = Math.abs(totalAssigned - totalNeeded) < 0.01;

  // Quarter step options: 0, 0.5, 1, ... quarterCount
  const quarterOptions = useMemo(
    () =>
      Array.from(
        { length: quarterCount * 2 + 1 },
        (_, i) => i * 0.5,
      ),
    [quarterCount],
  );

  function setPlayerQuarters(id: string, q: number) {
    setAssignments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, quarters: q } : a)),
    );
    setResults(null);
  }

  function toggleGK(id: string) {
    setAssignments((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const newGK = !a.isGK;
        return {
          ...a,
          isGK: newGK,
          preferredPosition: newGK
            ? ("GK" as PreferredPosition)
            : (a.preferredPositions ?? [a.preferredPosition]).includes("GK") && !newGK
              ? ((a.preferredPositions?.find(p => p !== "GK") ?? "CAM") as PreferredPosition)
              : a.preferredPosition,
          quarters: newGK ? quarterCount : 0,
        };
      }),
    );
    setResults(null);
  }

  async function generate() {
    // 이미 전술판에 편성이 있으면 덮어쓰기 확인
    if (hasExistingFormation) {
      const ok = await confirm({
        title: "기존 편성을 덮어쓸까요?",
        description: "전술판에 이미 편성된 내용이 있습니다. 규칙 기반 자동 편성 결과로 교체하면 되돌릴 수 없어요.",
        confirmLabel: "덮어쓰기",
        cancelLabel: "취소",
        variant: "destructive",
      });
      if (!ok) return;
    }
    const res = scheduleQuarters(assignments, quarterCount, formation);
    setResults(res);
    setLastGenerationMode("rule");
    // 규칙 기반 모드도 1클릭 흐름: 생성 직후 전술판까지 자동 반영
    await saveToTacticsBoard(res);
  }

  async function saveToTacticsBoard(forceResults?: QuarterResult[]) {
    const effective = forceResults ?? results;
    if (!effective) return;
    setSaving(true);

    const squads: GeneratedSquad[] = effective.map((qr) => {
      // 쿼터별 다른 포메이션 지원 (AI 풀 플랜 적용 시) — formationId가 있으면 그걸 사용
      const qFormation = qr.formationId
        ? (formationTemplates.find((f) => f.id === qr.formationId) ?? formation)
        : formation;
      const positions: Record<
        string,
        { playerId: string; x: number; y: number; secondPlayerId?: string }
      > = {};
      for (const a of qr.assignments) {
        const slot = qFormation.slots.find((s) => s.id === a.slotId);
        if (!slot) continue;
        if (a.type === "full" || a.type === "first_half") {
          positions[a.slotId] = {
            playerId: a.playerId,
            x: slot.x,
            y: slot.y,
          };
        } else if (a.type === "second_half" && positions[a.slotId]) {
          // 같은 슬롯의 후반 선수
          positions[a.slotId].secondPlayerId = a.playerId;
        }
      }
      return {
        quarter_number: qr.quarter,
        formation: qFormation.id,
        positions,
      };
    });

    // 생성된 스쿼드를 API에 저장 (나갔다 들어와도 유지)
    // positions가 비어있는 쿼터는 전술판을 초기화할 수 있으므로 건너뜀
    for (const sq of squads) {
      if (Object.keys(sq.positions).length === 0) continue;
      await apiMutate("/api/squads", "POST", {
        matchId, quarterNumber: sq.quarter_number,
        formation: sq.formation, positions: sq.positions,
        side: side ?? null,
      });
    }
    // 역할 가이드 등 외부 구독자에게 저장 완료 알림
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("match-squads-saved", { detail: { matchId } })
      );
    }

    setSaving(false);
    // positions가 비어있는 쿼터는 TacticsBoard에 전달하지 않음.
    // 빈 positions를 initialSquads로 넘기면 TacticsBoard가 해당 쿼터를 빈 화면으로 표시함.
    const validSquads = squads.filter((sq) => Object.keys(sq.positions).length > 0);
    // 전 쿼터 정상 저장 → 직접 전달. 일부 누락 → 빈 배열 전달(TacticsBoard가 DB refetch).
    onGenerated?.(validSquads.length === squads.length ? validSquads : []);
  }

  async function handleAiPlanGenerate(singleFormation: boolean) {
    if (aiPlanLoading) return;
    // AI 호출 전 덮어쓰기 확인 — 토큰·시간 낭비 방지
    if (hasExistingFormation || results !== null) {
      const ok = await confirm({
        title: "기존 편성을 덮어쓸까요?",
        description: singleFormation
          ? "현재 편성을 AI 추천 편성(팀 포메이션 유지)으로 교체합니다. AI 호출이 진행돼요."
          : "현재 편성을 AI 쿼터별 플랜으로 교체합니다. AI 호출이 진행되고, 결과 검토 후 적용할 수 있어요.",
        confirmLabel: "계속",
        cancelLabel: "취소",
        variant: "destructive",
      });
      if (!ok) return;
    }
    setAiPlanLoading(true);
    setAiPlanError(null);
    setAiPlans(null);
    setAiPlanSource(null);
    try {
      // 쿼터별 가용 명단 — AI-fixed 모드에만 제약으로 전달 (로테이션 고정)
      // AI-free 모드는 쿼터별 로테이션까지 AI 가 자유롭게 설계하도록 미전달
      let currentResults = results;
      if (singleFormation && !currentResults) {
        // scheduleQuarters로 초기 로테이션만 계산 — AI 응답 전에 setResults 호출하지 않음.
        // 조기 setResults는 컴포넌트 re-render를 유발해 applyAiPlanToResults 클로저가
        // stale results(=null)를 참조하는 버그를 일으킴.
        // setResults는 AI 성공 후 applyAiPlanToResults 내부에서 한 번만 호출함.
        currentResults = scheduleQuarters(assignments, quarterCount, formation);
      }
      // AI-free 모드: sheet apply 시점에 results 클로저가 null일 수 있으므로
      // 기본 스케줄을 미리 ref에 보존 → applyAiPlanToResults fallback으로 사용
      aiFreeFallbackRef.current = currentResults ?? scheduleQuarters(assignments, quarterCount, formation);

      const availableByQuarter: Record<number, string[]> = {};
      if (singleFormation && currentResults) {
        for (const qr of currentResults) {
          availableByQuarter[qr.quarter] = Array.from(new Set(qr.assignments.map((a) => a.playerName)));
        }
      }
      const attendees = attendingPlayers.map((p) => ({
        name: p.name,
        preferredPosition: p.preferredPosition,
        isGuest: p.isGuest ?? false,
      }));
      const payload = {
        formationName: formation.name,
        quarterCount,
        attendees,
        placement: [],
        matchType: matchContext?.matchType ?? "REGULAR",
        opponent: matchContext?.opponent ?? null,
        warnings: [],
        // AI-free 는 로테이션도 자유롭게 — availableByQuarter 미전달
        ...(singleFormation ? { availableByQuarter } : {}),
        singleFormation,     // 고정 포메이션 모드 여부
        sportType,
        playerCount,
      };
      const res = await fetch("/api/ai/full-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 429) setAiPlanError(body.message ?? "일일 사용 한도 도달");
        else if (body.error === "ai_not_available") setAiPlanError("AI 풀 플랜은 관리자 계정 전용");
        else setAiPlanError("AI 풀 플랜 요청 실패");
        return;
      }
      const data = await res.json();
      setAiPlans(data.plans);
      setAiPlanSource(data.source ?? null);
      // 서버에서 이미 rule fallback 적용된 상태 — validation 원문은 노출 안 하고 친절한 문구로 대체
      if (data.error) {
        const friendly = data.source === "rule"
          ? "AI 최적 편성에 실패해 기본 편성을 적용했습니다"
          : data.error;
        setAiPlanError(friendly);
      }
      // AI 코치 분석 카드에 coaching 즉시 전달 (React 콜백 경로 — 이벤트·네트워크·DB 레이스 모두 우회)
      if (typeof data.coaching === "string" && data.coaching.length > 0) {
        onAiCoachingReady?.({ analysis: data.coaching, source: data.source ?? "ai" });
      }
      if (Array.isArray(data.plans) && data.plans.length > 0) {
        // 덮어쓰기 confirm 은 함수 초입에서 이미 받음 → 응답 받으면 BottomSheet 없이 즉시 전술판 반영
        const applied = applyAiPlanToResults(data.plans, currentResults);
        if (applied) {
          setLastGenerationMode(singleFormation ? "ai-fixed" : "ai-free");
          await saveToTacticsBoard(applied);
        }
      }
    } catch {
      setAiPlanError("네트워크 오류");
    } finally {
      setAiPlanLoading(false);
    }
  }

  /**
   * AI 풀 플랜을 results(전술판 소스)에 반영.
   * 각 쿼터의 formation/placement를 QuarterResult로 변환.
   * 전부 반영할 수 없는 플랜은 해당 쿼터만 스킵 (기존 결과 유지).
   * @returns 병합된 QuarterResult[] (성공 시) 또는 null (전부 실패 시)
   */
  function applyAiPlanToResults(
    plans?: typeof aiPlans,
    fallbackResults?: QuarterResult[] | null
  ): QuarterResult[] | null {
    const source = plans ?? aiPlans;
    if (!source || source.length === 0) return null;
    const playerByName = new Map(attendingPlayers.map((p) => [p.name, p]));
    const newResults: QuarterResult[] = [];
    const skipped: number[] = [];

    for (const plan of source) {
      const fmt = formationTemplates.find((f) => f.name === plan.formation);
      if (!fmt) { skipped.push(plan.quarter); continue; }
      const slotByLabel = new Map(fmt.slots.map((s) => [s.label, s]));
      const assignments: SlotAssignment[] = [];
      let allOk = true;
      for (const p of plan.placement) {
        const slot = slotByLabel.get(p.slot);
        const player = playerByName.get(p.playerName);
        if (!slot || !player) { allOk = false; break; }
        assignments.push({
          slotId: slot.id,
          slotLabel: slot.label,
          playerId: player.id,
          playerName: player.name,
          type: "full",
        });
      }
      if (!allOk) { skipped.push(plan.quarter); continue; }
      // AI가 placement: [] 반환 시 allOk=true이지만 배치 없음 → 빈 positions → 전술판 초기화 버그
      // assignments가 비어있으면 fallback(currentResults)으로 처리
      if (assignments.length === 0) { skipped.push(plan.quarter); continue; }
      newResults.push({ quarter: plan.quarter, assignments, formationId: fmt.id });
    }

    if (newResults.length === 0) {
      setAiPlanError("AI 플랜을 전술판 형식으로 변환하지 못했습니다.");
      return null;
    }
    // 스킵된 쿼터: fallbackResults(명시 전달) → results 클로저 순으로 폴백
    // 모드 전환 시 results 클로저가 null일 수 있으므로 명시적 fallback 우선 사용
    const fallback = fallbackResults ?? results;
    const merged: QuarterResult[] = [];
    for (let q = 1; q <= quarterCount; q++) {
      const replaced = newResults.find((r) => r.quarter === q);
      if (replaced) {
        merged.push(replaced);
      } else {
        const prev = fallback?.find((r) => r.quarter === q);
        if (prev) merged.push(prev);
      }
    }
    setResults(merged);
    setAiPlanError(skipped.length > 0 ? `${skipped.join(",")}쿼터는 변환 실패로 기존 편성 유지` : null);
    return merged;
  }


  // Sort: GK → DF → MF → FW
  const sortedAssignments = useMemo(() => {
    const order: Record<PreferredPosition, number> = {
      GK: 0,
      CB: 1, LB: 2, RB: 2,
      CDM: 3, CM: 3.5, CAM: 4,
      LW: 5, RW: 5, ST: 6,
      FIXO: 1, ALA: 3, PIVO: 5,
    };
    return [...assignments].sort((a, b) => {
      if (a.isGK !== b.isGK) return a.isGK ? -1 : 1;
      return (
        (order[a.preferredPosition] ?? 9) -
        (order[b.preferredPosition] ?? 9)
      );
    });
  }, [assignments]);

  /* ── Collapsible card ── */
  return (
    <>
    <Card className="rounded-xl border-border/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-5 py-4 hover:bg-secondary/30 transition-colors"
      >
        <span className="flex items-center gap-2 text-base font-bold">
          <Zap className="h-4 w-4 text-primary" /> 자동 편성
        </span>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">{attendingPlayers.length}명</Badge>
          <svg className={cn("h-5 w-5 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
        </div>
      </button>

      {!isOpen && (
        <div className="px-5 pb-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            참석자 선호 포지션 기반으로 쿼터별 편성
          </p>
          {enableAi && (
            <p className="text-xs leading-snug text-muted-foreground">
              <span className="font-semibold text-primary">AI 코치</span>의 팀 맞춤 추천까지
            </p>
          )}
          <Button
            size="sm"
            className="w-full gap-2 rounded-lg"
            onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
          >
            <Zap className="h-4 w-4" />
            편성 시작
          </Button>
        </div>
      )}

      {isOpen && (
      <>

      <CardContent className="space-y-4">
        {/* ── ① 편성 방식 ── */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">편성 방식</p>
          <div className="space-y-1.5">
            {([
              { id: "rule" as const, label: "규칙 기반으로 빠르게", desc: "팀 포메이션 + 감독지정/선호 포지션 매칭", icon: <Zap className="h-3.5 w-3.5" /> },
              ...(enableAi ? [
                { id: "ai-free" as const, label: "AI 추천 — 쿼터별 포메이션 자유", desc: "우리 기록·참석자·상대 이력 기반으로 포메이션까지 AI가 설계", icon: <Palette className="h-3.5 w-3.5" /> },
              ] : []),
            ]).map((opt) => {
              const selected = planMode === opt.id;
              return (
                <label
                  key={opt.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 transition-colors",
                    selected ? "border-primary/50 bg-primary/5" : "border-border/40 hover:bg-secondary/30"
                  )}
                >
                  <input
                    type="radio"
                    name="planMode"
                    checked={selected}
                    onChange={() => { setPlanMode(opt.id); setResults(null); setAiPlans(null); setAiPlanError(null); }}
                    className="mt-0.5 h-4 w-4 accent-primary"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-sm font-semibold">
                      <span className={cn(selected ? "text-primary" : "text-muted-foreground")}>{opt.icon}</span>
                      <span>{opt.label}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{opt.desc}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* ── ② 포메이션 선택 ── */}
        <div className="flex flex-wrap items-center gap-2">
          {planMode === "ai-free" ? (
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-xs text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              포메이션은 AI가 결정
            </div>
          ) : (
            <NativeSelect
              value={formationId}
              onChange={(e) => { setFormationId(e.target.value); setResults(null); }}
              className="w-auto"
            >
              {filteredFormations.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </NativeSelect>
          )}
        </div>

        {/* ── ③ 통계 3열 ── */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-secondary/30 p-3 text-center">
            <div className="text-2xl font-bold">{attendingPlayers.length}</div>
            <div className="text-[11px] text-muted-foreground">총 선수</div>
          </div>
          <div className="rounded-xl bg-secondary/30 p-3 text-center">
            <div className="text-2xl font-bold">{formation?.slots.length ?? 0}</div>
            <div className="text-[11px] text-muted-foreground">포지션</div>
          </div>
          <div className="rounded-xl bg-secondary/30 p-3 text-center">
            <div className={cn("text-2xl font-bold", isBalanced ? "text-[hsl(var(--success))]" : "text-destructive")}>
              {totalAssigned}/{totalNeeded}
            </div>
            <div className="text-[11px] text-muted-foreground">슬롯</div>
          </div>
        </div>

        {/* ── ④ 슬롯 프로그레스바 ── */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">슬롯 배분</span>
            <span className={cn("font-semibold", isBalanced ? "text-[hsl(var(--success))]" : totalAssigned > totalNeeded ? "text-destructive" : "text-[hsl(var(--accent))]")}>
              {isBalanced ? "완료" : totalAssigned > totalNeeded ? `${totalAssigned - totalNeeded} 초과` : `${totalNeeded - totalAssigned} 부족`}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div className={cn("h-full rounded-full transition-all duration-300", isBalanced ? "bg-[hsl(var(--success))]" : totalAssigned > totalNeeded ? "bg-destructive" : "bg-[hsl(var(--accent))]")}
              style={{ width: `${Math.min(100, (totalAssigned / (totalNeeded || 1)) * 100)}%` }} />
          </div>
        </div>

        {/* ── ⑤ Player list ── */}
        <div className="space-y-1">
          {sortedAssignments.map((player, idx) => (
            <div
              key={player.id}
              className={cn("rounded-xl p-3 transition-colors", idx % 2 === 0 ? "bg-secondary/30" : "bg-secondary/15")}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">{player.name}</span>
                    {(player.preferredPositions ?? [player.preferredPosition]).includes("GK" as PreferredPosition) && (
                      <button
                        type="button"
                        onClick={() => toggleGK(player.id)}
                        className={cn(
                          "flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold transition-all",
                          player.isGK
                            ? "bg-amber-500/30 text-amber-700 dark:text-amber-400"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        )}
                      >
                        🥅 GK
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(player.preferredPositions ?? [player.preferredPosition]).filter((pos) => pos !== "GK").map((pos) => (
                      <Badge key={pos} className={cn("text-[10px] px-1.5 py-0 border-0", POS_COLOR[pos])}>
                        {POS_LABEL[pos] ?? pos}
                      </Badge>
                    ))}
                  </div>
                </div>
                {/* Quarter +/- buttons */}
                <div className="flex shrink-0 items-center gap-1.5">
                  {player.isGK ? (
                    <span className="min-w-[52px] text-center text-xs font-semibold text-amber-700 dark:text-amber-400">
                      {gks.length <= 1 ? `${quarterCount}Q` : `${Math.ceil(quarterCount / gks.length)}Q`}
                    </span>
                  ) : (
                    <>
                      <button type="button"
                        onClick={() => setPlayerQuarters(player.id, Math.max(0, player.quarters - 0.5))}
                        disabled={player.quarters <= 0}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/50 text-sm text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-30"
                      >−</button>
                      <div className={cn("flex h-8 w-14 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
                        player.quarters === quarterCount ? "bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]" :
                        player.quarters === 0 ? "bg-muted text-muted-foreground" :
                        player.quarters >= quarterCount * 0.75 ? "bg-primary/20 text-primary" :
                        "bg-[hsl(var(--accent))]/20 text-[hsl(var(--accent))]"
                      )}>
                        {player.quarters}Q
                      </div>
                      <button type="button"
                        onClick={() => setPlayerQuarters(player.id, Math.min(quarterCount, player.quarters + 0.5))}
                        disabled={player.quarters >= quarterCount}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/50 text-sm text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-30"
                      >+</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}

          {assignments.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              참석 투표한 인원이 없습니다. 출석 투표 후 다시
              시도해주세요.
            </p>
          )}
        </div>

        {/* ── ⑥ 단일 CTA 버튼 (모드에 따라 동작/라벨 동적) ── */}
        {(() => {
          const busy = aiPlanLoading || saving;
          const disabled = busy || !isBalanced || fieldPlayers.length === 0;
          let label: string;
          let icon = <Zap className="h-4 w-4" />;
          if (planMode === "rule") {
            label = results ? "다시 생성" : "자동 편성 실행";
          } else {
            label = aiPlanLoading ? "AI 풀 플랜 생성 중..." : "AI 풀 플랜 받기 (쿼터별 포메이션 자유)";
            icon = aiPlanLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />;
          }
          return (
            <Button
              className="w-full min-h-[48px] gap-2 rounded-xl font-semibold"
              onClick={() => {
                if (planMode === "rule") generate();
                else handleAiPlanGenerate(false);
              }}
              disabled={disabled}
            >
              {icon}
              {label}
            </Button>
          );
        })()}

        {/* AI 에러 */}
        {aiPlanError && (
          <p className="text-center text-xs text-destructive">{aiPlanError}</p>
        )}

        {/* AI 배치 진행 중 안내 — "편성 완료"와 혼동되지 않게 명확한 로딩 상태 표시 */}
        {aiPlanLoading && (
          <div className="space-y-2 border-t border-border/30 pt-3">
            <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-primary">
              <Loader2 className="h-3 w-3 animate-spin" />
              AI가 선수 배치 중입니다 (잠시만요)
            </p>
          </div>
        )}
      </CardContent>
      </>
      )}
    </Card>

    </>
  );
}
