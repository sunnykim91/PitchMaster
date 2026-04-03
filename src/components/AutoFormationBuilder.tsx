"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getFormationsForSport,
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

/* ── Types ── */

export type AttendingPlayer = {
  id: string;
  name: string;
  preferredPosition: PreferredPosition; // 주 포지션 (하위 호환)
  preferredPositions?: PreferredPosition[]; // 복수 선호 포지션
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
  defaultFormationId?: string;
  side?: "A" | "B";
  onGenerated?: (squads: GeneratedSquad[]) => void;
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
  GK: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  CB: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  LB: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  RB: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  CDM: "bg-green-500/20 text-green-400 border-green-500/30",
  CM: "bg-teal-500/20 text-teal-400 border-teal-500/30",
  CAM: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  LW: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  RW: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  ST: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  FIXO: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  ALA: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  PIVO: "bg-rose-500/20 text-rose-400 border-rose-500/30",
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

    const validPositions = new Set<string>(["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST"]);

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

    results.push({ quarter: q, assignments });
  }

  return results;
}

/* ── Component ── */

export default function AutoFormationBuilder({
  matchId,
  quarterCount,
  attendingPlayers,
  sportType = "SOCCER",
  defaultFormationId,
  side,
  onGenerated,
}: Props) {
  const filteredFormations = getFormationsForSport(sportType);
  const [isOpen, setIsOpen] = useState(false);
  const defaultId = (defaultFormationId && filteredFormations.some(f => f.id === defaultFormationId)) ? defaultFormationId : (filteredFormations[0]?.id ?? "");
  const [formationId, setFormationId] = useState(defaultId);
  const [assignments, setAssignments] = useState<PlayerAssignment[]>(
    [],
  );
  const [results, setResults] = useState<QuarterResult[] | null>(null);
  const [saving, setSaving] = useState(false);

  const formation = useMemo(
    () =>
      filteredFormations.find((f) => f.id === formationId) ??
      filteredFormations[0],
    [formationId, filteredFormations],
  );

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

  function autoDistribute() {
    const dist = calculateFairDistribution(
      fieldPlayers.length,
      quarterCount,
      slotsPerQ,
    );
    setAssignments((prev) => {
      let highCount = 0;
      return prev.map((a) => {
        if (a.isGK) return a;
        if (highCount < dist.highCount) {
          highCount++;
          return { ...a, quarters: dist.high };
        }
        return { ...a, quarters: dist.low };
      });
    });
    setResults(null);
  }

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

  function generate() {
    const res = scheduleQuarters(assignments, quarterCount, formation);
    setResults(res);
  }

  async function saveToTacticsBoard() {
    if (!results) return;
    setSaving(true);

    const squads: GeneratedSquad[] = results.map((qr) => {
      const positions: Record<
        string,
        { playerId: string; x: number; y: number; secondPlayerId?: string }
      > = {};
      for (const a of qr.assignments) {
        const slot = formation.slots.find((s) => s.id === a.slotId);
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
        formation: formation.id,
        positions,
      };
    });

    // 생성된 스쿼드를 API에 저장 (나갔다 들어와도 유지)
    for (const sq of squads) {
      await apiMutate("/api/squads", "POST", {
        matchId, quarterNumber: sq.quarter_number,
        formation: sq.formation, positions: sq.positions,
        side: side ?? null,
      });
    }

    setSaving(false);
    onGenerated?.(squads);
  }

  // Player × quarter map for result display
  const playerQuarterMap = useMemo(() => {
    if (!results) return null;
    const map = new Map<
      string,
      Map<number, "full" | "first_half" | "second_half">
    >();
    for (const qr of results) {
      for (const a of qr.assignments) {
        if (!map.has(a.playerId))
          map.set(a.playerId, new Map());
        map.get(a.playerId)!.set(qr.quarter, a.type);
      }
    }
    return map;
  }, [results]);

  // Player → assigned position label from results
  const playerPositionLabel = useMemo(() => {
    if (!results) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const qr of results) {
      for (const a of qr.assignments) {
        if (!map.has(a.playerId)) {
          map.set(a.playerId, a.slotLabel);
        }
      }
    }
    return map;
  }, [results]);

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

  /* ── Closed state ── */
  if (!isOpen) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
              Auto Formation
            </p>
            <CardTitle className="mt-1 font-heading text-xl font-bold uppercase">
              자동 포메이션 편성
            </CardTitle>
          </div>
          <Button size="sm" onClick={() => setIsOpen(true)}>
            편성 시작
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            참석 인원을 기반으로 공정하게 쿼터를 분배하고 포메이션을
            자동으로 편성합니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  /* ── Open state ── */
  return (
    <Card className="rounded-xl border-border/30 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-bold">
          <span className="text-primary">⚡</span> 자동 편성
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">{attendingPlayers.length}명</Badge>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground" onClick={() => setIsOpen(false)}>✕</Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ── 통계 3열 ── */}
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

        {/* ── 슬롯 프로그레스바 ── */}
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

        {/* ── Controls ── */}
        <div className="flex flex-wrap items-center gap-2">
          <NativeSelect
            value={formationId}
            onChange={(e) => { setFormationId(e.target.value); setResults(null); }}
            className="w-auto"
          >
            {filteredFormations.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </NativeSelect>
          <Button size="sm" variant="outline" className="rounded-lg" onClick={autoDistribute}>자동 분배</Button>
        </div>

        {/* ── Player list ── */}
        <div className="space-y-1">
          {sortedAssignments.map((player, idx) => (
            <div
              key={player.id}
              className={cn("rounded-xl p-3 transition-colors", idx % 2 === 0 ? "bg-secondary/30" : "bg-secondary/15")}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    {/* GK toggle */}
                    <button
                      type="button"
                      onClick={() => toggleGK(player.id)}
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold transition",
                        player.isGK ? "bg-amber-500/30 text-amber-400" : "bg-muted text-muted-foreground hover:bg-muted/80",
                      )}
                      title="골키퍼 지정/해제"
                    >G</button>
                    <span className="truncate text-sm font-semibold">{player.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(player.preferredPositions ?? [player.preferredPosition]).map((pos) => (
                      <Badge key={pos} className={cn("text-[10px] px-1.5 py-0 border-0", POS_COLOR[pos])}>
                        {POS_LABEL[pos] ?? pos}
                      </Badge>
                    ))}
                  </div>
                </div>
                {/* Quarter +/- buttons */}
                <div className="flex shrink-0 items-center gap-1.5">
                  {player.isGK ? (
                    <span className="min-w-[52px] text-center text-xs font-semibold text-amber-400">
                      {gks.length <= 1 ? `${quarterCount}Q` : `${Math.ceil(quarterCount / gks.length)}Q`}
                    </span>
                  ) : (
                    <>
                      <button type="button"
                        onClick={() => setPlayerQuarters(player.id, Math.max(0, player.quarters - 0.5))}
                        disabled={player.quarters <= 0}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/50 text-sm transition-colors hover:bg-secondary disabled:opacity-30"
                      >−</button>
                      <div className={cn("flex h-8 min-w-[52px] items-center justify-center rounded-lg text-sm font-bold",
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
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/50 text-sm transition-colors hover:bg-secondary disabled:opacity-30"
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

        {/* ── Generate button ── */}
        <Button
          className="w-full min-h-[48px] rounded-xl font-semibold"
          onClick={generate}
          disabled={!isBalanced || fieldPlayers.length === 0}
        >
          {results ? "다시 생성" : "자동 편성 실행"}
        </Button>

        {/* ── Results ── */}
        {results && playerQuarterMap && (
          <div className="space-y-4 border-t border-border pt-4">
            {/* Legend */}
            <div className="flex items-center gap-3">
              <h4 className="text-sm font-bold">편성 결과</h4>
              <div className="ml-auto flex gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-3 w-5 rounded-sm bg-primary/60" />
                  풀타임
                </span>
                <span className="flex items-center gap-1">
                  <span
                    className="inline-block h-3 w-5 overflow-hidden rounded-sm"
                    style={{
                      background:
                        "linear-gradient(90deg, rgba(16,185,129,0.6) 50%, var(--secondary) 50%)",
                    }}
                  />
                  전반
                </span>
                <span className="flex items-center gap-1">
                  <span
                    className="inline-block h-3 w-5 overflow-hidden rounded-sm"
                    style={{
                      background:
                        "linear-gradient(90deg, var(--secondary) 50%, rgba(16,185,129,0.6) 50%)",
                    }}
                  />
                  후반
                </span>
              </div>
            </div>

            {/* Player × quarter grid */}
            <div className="overflow-x-auto">
              <div className="min-w-[280px]">
                {/* Header row */}
                <div className="flex items-center gap-1 px-1 pb-1">
                  <span className="w-16 text-xs font-bold text-muted-foreground">
                    선수
                  </span>
                  <span className="w-8 shrink-0 text-center text-xs font-bold text-muted-foreground">
                    합계
                  </span>
                  {Array.from({ length: quarterCount }, (_, i) => (
                    <span
                      key={i}
                      className="flex-1 text-center text-xs font-bold text-muted-foreground"
                    >
                      Q{i + 1}
                    </span>
                  ))}
                  <span className="w-10 text-center text-xs font-bold text-muted-foreground">
                    배치
                  </span>
                </div>

                {/* Player rows */}
                {sortedAssignments
                  .filter((a) => a.quarters > 0 || a.isGK)
                  .map((player) => {
                    const qmap = playerQuarterMap.get(player.id);
                    // 실제 배정된 쿼터 합산 (full=1, half=0.5)
                    let totalQ = 0;
                    if (qmap) {
                      for (const type of qmap.values()) {
                        totalQ += type === "full" ? 1 : 0.5;
                      }
                    }
                    return (
                      <div
                        key={player.id}
                        className="flex items-center gap-1 px-1 py-0.5"
                      >
                        <span className="w-16 truncate text-xs font-medium">
                          {player.name}
                        </span>
                        {/* 총 쿼터 수 */}
                        <span className={cn(
                          "w-8 shrink-0 text-center text-xs font-bold",
                          totalQ % 1 !== 0 ? "text-sky-400" : "text-muted-foreground",
                        )}>
                          {totalQ % 1 !== 0 ? `${totalQ}` : `${totalQ}`}Q
                        </span>
                        {Array.from(
                          { length: quarterCount },
                          (_, i) => {
                            const q = i + 1;
                            const type = qmap?.get(q);
                            return (
                              <div
                                key={q}
                                className="flex flex-1 justify-center"
                              >
                                <div className="relative flex h-5 w-8 overflow-hidden rounded-sm border border-border/50">
                                  <div
                                    className={cn(
                                      "flex-1 transition-colors",
                                      type === "full" ||
                                        type === "first_half"
                                        ? "bg-primary/60"
                                        : "bg-muted",
                                    )}
                                  />
                                  {/* 중앙 구분선 (half일 때 강조) */}
                                  {(type === "first_half" || type === "second_half") && (
                                    <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
                                  )}
                                  <div
                                    className={cn(
                                      "flex-1 transition-colors",
                                      type === "full" ||
                                        type === "second_half"
                                        ? "bg-primary/60"
                                        : "bg-muted",
                                    )}
                                  />
                                  {/* 0.5Q 텍스트 라벨 */}
                                  {type === "first_half" && (
                                    <span className="absolute inset-0 flex items-center justify-center text-[7px] font-bold text-white/80">전</span>
                                  )}
                                  {type === "second_half" && (
                                    <span className="absolute inset-0 flex items-center justify-center text-[7px] font-bold text-white/80">후</span>
                                  )}
                                </div>
                              </div>
                            );
                          },
                        )}
                        <span className="w-10 text-center text-xs text-muted-foreground">
                          {playerPositionLabel.get(player.id) ?? "-"}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Per-quarter lineups */}
            <div className="grid gap-2 sm:grid-cols-2">
              {results.map((qr) => (
                <Card
                  key={qr.quarter}
                  className="border-0 bg-secondary shadow-none"
                >
                  <CardContent className="p-3">
                    <p className="mb-2 text-xs font-bold">
                      Q{qr.quarter} 라인업
                    </p>
                    <div className="space-y-0.5">
                      {qr.assignments.map((a) => (
                        <div
                          key={`${a.slotId}-${a.playerId}`}
                          className="flex items-center gap-2 text-xs"
                        >
                          <Badge
                            variant="outline"
                            className="w-9 justify-center px-0 text-xs"
                          >
                            {a.slotLabel}
                          </Badge>
                          <span className="min-w-0 flex-1 truncate font-medium">
                            {a.playerName}
                          </span>
                          {a.type !== "full" && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "ml-auto shrink-0 text-xs font-bold",
                                a.type === "first_half"
                                  ? "border-sky-500/40 bg-sky-500/10 text-sky-400"
                                  : "border-violet-500/40 bg-violet-500/10 text-violet-400",
                              )}
                            >
                              {a.type === "first_half"
                                ? "0.5Q 전반"
                                : "0.5Q 후반"}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Save button */}
            <Button
              className="w-full"
              onClick={saveToTacticsBoard}
              disabled={saving}
            >
              {saving ? "저장 중..." : "전술판에 적용"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
