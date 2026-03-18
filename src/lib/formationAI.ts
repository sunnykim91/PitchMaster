import { getFormationsForSport, type FormationTemplate, type FormationSlot } from "@/lib/formations";
import type { PreferredPosition, Position, SportType } from "@/lib/types";
import { PREF_TO_POSITION } from "@/lib/types";

/* ── Types ── */

export type PlayerInput = {
  id: string;
  name: string;
  preferredPosition: PreferredPosition;
  /** Recent season stats (optional, for ranking) */
  goals?: number;
  assists?: number;
  mvp?: number;
  attendanceRate?: number;
};

export type AIRecommendation = {
  formation: FormationTemplate;
  score: number;
  reason: string;
  assignments: Record<string, string>; // slotId → playerId
};

/* ── Slot → PreferredPosition mapping ── */

function slotToPreferred(slot: FormationSlot): PreferredPosition {
  if (slot.role === "GK") return "GK";
  if (["CB", "LCB", "RCB"].includes(slot.role)) return "CB";
  if (["LB", "LWB"].includes(slot.role)) return "LB";
  if (["RB", "RWB"].includes(slot.role)) return "RB";
  if (["CDM", "LDM", "RDM"].includes(slot.role)) return "CDM";
  if (["CAM", "LAM", "RAM", "CM", "LCM", "RCM", "LM", "RM"].includes(slot.role)) return "CAM";
  if (slot.role === "LW") return "LW";
  if (slot.role === "RW") return "RW";
  return "ST";
}

function slotToCategory(slot: FormationSlot): Position {
  return PREF_TO_POSITION[slotToPreferred(slot)];
}

/* ── Scoring ── */

function playerScore(p: PlayerInput): number {
  return (p.goals ?? 0) * 3 + (p.assists ?? 0) * 2 + (p.mvp ?? 0) * 5 + (p.attendanceRate ?? 0) * 10;
}

/* ── Core Algorithm ── */

/**
 * Recommend the best formation and player assignments.
 *
 * Algorithm:
 * 1. Filter formations by player count (need at least 7 for meaningful play)
 * 2. For each formation, score based on position match:
 *    - Exact preferred position match: +10
 *    - Same position category (DF/MF/FW): +5
 *    - Mismatch (except GK): +1
 * 3. Use Hungarian-style greedy assignment for best fit
 * 4. Return top recommendation with explanation
 */
export function recommendFormation(
  players: PlayerInput[],
  fieldPlayerCount?: number,
  sportType: SportType = "SOCCER",
): AIRecommendation | null {
  if (players.length < 2) return null;

  const defaultPlayerCount = sportType === "FUTSAL" ? 5 : 11;
  const targetCount = fieldPlayerCount ?? Math.min(players.length, defaultPlayerCount);

  const formations = getFormationsForSport(sportType);

  // Rank players by performance score
  const rankedPlayers = [...players].sort((a, b) => playerScore(b) - playerScore(a));

  // Separate GK candidates
  const gkCandidates = rankedPlayers.filter((p) => p.preferredPosition === "GK");
  const fieldCandidates = rankedPlayers.filter((p) => p.preferredPosition !== "GK");

  // If no dedicated GK, pick lowest-scored field player
  let gk: PlayerInput;
  let availableField: PlayerInput[];
  if (gkCandidates.length > 0) {
    gk = gkCandidates[0];
    availableField = [...fieldCandidates, ...gkCandidates.slice(1)];
  } else {
    gk = rankedPlayers[rankedPlayers.length - 1];
    availableField = rankedPlayers.slice(0, -1);
  }

  // Limit to target field count (minus GK)
  const fieldSlotCount = targetCount - 1;
  const fieldPlayers = availableField.slice(0, fieldSlotCount);

  // Count position distribution
  const posCounts: Record<Position, number> = { GK: 0, DF: 0, MF: 0, FW: 0 };
  for (const p of fieldPlayers) {
    posCounts[PREF_TO_POSITION[p.preferredPosition]]++;
  }

  // Score each formation
  let bestFormation: FormationTemplate | null = null;
  let bestScore = -1;
  let bestAssignments: Record<string, string> = {};
  let bestReason = "";

  for (const formation of formations) {
    const fieldSlots = formation.slots.filter((s) => s.role !== "GK");
    if (fieldSlots.length !== fieldSlotCount) continue;

    // Count slots by category
    const slotCats: Record<Position, number> = { GK: 0, DF: 0, MF: 0, FW: 0 };
    for (const slot of fieldSlots) {
      slotCats[slotToCategory(slot)]++;
    }

    // Formation-level score: how well does player distribution match?
    let formationScore = 0;
    for (const cat of ["DF", "MF", "FW"] as Position[]) {
      const supply = posCounts[cat];
      const demand = slotCats[cat];
      formationScore += Math.min(supply, demand) * 10;
      formationScore -= Math.abs(supply - demand) * 3;
    }

    // Greedy assignment: match players to slots
    const assignments: Record<string, string> = {};
    const usedPlayers = new Set<string>();

    // GK slot
    const gkSlot = formation.slots.find((s) => s.role === "GK");
    if (gkSlot) {
      assignments[gkSlot.id] = gk.id;
      usedPlayers.add(gk.id);
    }

    // First pass: exact preferred position matches
    for (const slot of fieldSlots) {
      const pref = slotToPreferred(slot);
      const match = fieldPlayers.find(
        (p) => p.preferredPosition === pref && !usedPlayers.has(p.id)
      );
      if (match) {
        assignments[slot.id] = match.id;
        usedPlayers.add(match.id);
        formationScore += 5;
      }
    }

    // Second pass: same category matches
    for (const slot of fieldSlots) {
      if (assignments[slot.id]) continue;
      const cat = slotToCategory(slot);
      const match = fieldPlayers.find(
        (p) => PREF_TO_POSITION[p.preferredPosition] === cat && !usedPlayers.has(p.id)
      );
      if (match) {
        assignments[slot.id] = match.id;
        usedPlayers.add(match.id);
        formationScore += 2;
      }
    }

    // Third pass: fill remaining with any available
    for (const slot of fieldSlots) {
      if (assignments[slot.id]) continue;
      const remaining = fieldPlayers.find((p) => !usedPlayers.has(p.id));
      if (remaining) {
        assignments[slot.id] = remaining.id;
        usedPlayers.add(remaining.id);
      }
    }

    if (formationScore > bestScore) {
      bestScore = formationScore;
      bestFormation = formation;
      bestAssignments = assignments;

      // Generate reason
      const exactMatches = Object.keys(assignments).filter((slotId) => {
        const slot = formation.slots.find((s) => s.id === slotId);
        const player = fieldPlayers.find((p) => p.id === assignments[slotId]);
        return slot && player && slotToPreferred(slot) === player.preferredPosition;
      }).length;

      bestReason = `${formation.name} 추천 — 선호 포지션 일치 ${exactMatches}/${fieldSlotCount}명` +
        ` (수비 ${slotCats.DF} · 미드 ${slotCats.MF} · 공격 ${slotCats.FW})`;
    }
  }

  if (!bestFormation) return null;

  return {
    formation: bestFormation,
    score: bestScore,
    reason: bestReason,
    assignments: bestAssignments,
  };
}

/**
 * Get a text summary of the recommendation.
 */
export function formatRecommendation(
  rec: AIRecommendation,
  players: PlayerInput[],
): string {
  const playerMap = new Map(players.map((p) => [p.id, p]));
  const lines = [rec.reason, ""];

  for (const slot of rec.formation.slots) {
    const playerId = rec.assignments[slot.id];
    const player = playerId ? playerMap.get(playerId) : null;
    lines.push(`  ${slot.label}: ${player?.name ?? "미배정"}`);
  }

  return lines.join("\n");
}
