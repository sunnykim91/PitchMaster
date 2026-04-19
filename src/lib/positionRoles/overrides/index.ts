/**
 * 포메이션 ID → 오버라이드 맵
 *
 * 지원 포메이션 (축구 11인제 9종):
 * - 4-2-3-1 · 4-4-2 · 4-3-3 · 3-5-2 · 3-4-3
 * - 4-1-4-1 · 4-5-1 · 5-3-2
 * - 3-4-2-1 · 4-3-2-1
 *
 * 축구 8/9/10인제 및 풋살은 미지원 — 오버라이드 없으면 getPositionRole null 반환.
 */

import type { FormationOverrideMap } from "../types";
import { OVERRIDE_4231 } from "./4-2-3-1";
import { OVERRIDE_442 } from "./4-4-2";
import { OVERRIDE_433 } from "./4-3-3";
import { OVERRIDE_352 } from "./3-5-2";
import { OVERRIDE_343 } from "./3-4-3";
import { OVERRIDE_4141 } from "./4-1-4-1";
import { OVERRIDE_451 } from "./4-5-1";
import { OVERRIDE_532 } from "./5-3-2";
import { OVERRIDE_3421 } from "./3-4-2-1";
import { OVERRIDE_4321 } from "./4-3-2-1";

export const FORMATION_OVERRIDES: Record<string, FormationOverrideMap> = {
  "4-2-3-1": OVERRIDE_4231,
  "4-4-2": OVERRIDE_442,
  "4-3-3": OVERRIDE_433,
  "3-5-2": OVERRIDE_352,
  "3-4-3": OVERRIDE_343,
  "4-1-4-1": OVERRIDE_4141,
  "4-5-1": OVERRIDE_451,
  "5-3-2": OVERRIDE_532,
  "3-4-2-1": OVERRIDE_3421,
  "4-3-2-1": OVERRIDE_4321,
};
