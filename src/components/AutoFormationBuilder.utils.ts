import type { PreferredPosition, Position } from "@/lib/types";
import { PREF_TO_POSITION } from "@/lib/types";
import type { FormationSlot } from "@/lib/formations";

/* ── Fuzzy player matching (AI 한글 hallucination 폴백) ── */
// AI가 "테스트피벗1" → "테스트피벳1" 같이 받침/자모 1글자 변형해서 응답하는 케이스 자동 복구
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const al = a.length, bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;
  const prev = new Array(bl + 1);
  const curr = new Array(bl + 1);
  for (let j = 0; j <= bl; j++) prev[j] = j;
  for (let i = 1; i <= al; i++) {
    curr[0] = i;
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= bl; j++) prev[j] = curr[j];
  }
  return prev[bl];
}

export function fuzzyMatchPlayer<T extends { id: string; name: string }>(
  target: string,
  candidates: T[],
  used: Set<string>,
): T | null {
  // 짧은 이름(3자 이하)은 fuzzy 미적용 — "김선휘" vs "김선화" 오매칭 위험
  if (target.length < 4) return null;
  let bestDist = Infinity;
  let bestList: T[] = [];
  for (const c of candidates) {
    if (used.has(c.id)) continue;
    if (Math.abs(c.name.length - target.length) > 1) continue;
    const dist = levenshtein(c.name, target);
    if (dist > 1) continue;
    if (dist < bestDist) {
      bestDist = dist;
      bestList = [c];
    } else if (dist === bestDist) {
      bestList.push(c);
    }
  }
  // 후보 1명일 때만 허용 (모호하면 거부)
  return bestList.length === 1 ? bestList[0] : null;
}

/* ── Position helpers ── */

/** 포메이션 슬롯 → 세분화 포지션 매핑 */
export function getSlotSubPosition(slot: FormationSlot): PreferredPosition {
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
export function getSlotCategory(slot: FormationSlot): Position {
  return PREF_TO_POSITION[getSlotSubPosition(slot)];
}

export const POS_LABEL: Record<PreferredPosition, string> = {
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

export const POS_COLOR: Record<PreferredPosition, string> = {
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
