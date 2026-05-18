/**
 * 카테고리별 default 자동 부여 — default=0인 그룹만.
 *
 * 그룹 정의 (매치 노출 정책과 1:1):
 *   · ATTACK·DEFENSE: (team_id, formation_id, category)
 *   · SETPIECE·OTHER: (team_id, category)  ← formation_id 무관
 *
 * 각 그룹에서:
 *   · 이미 default 1개 이상 있으면 → 건드리지 않음 (사용자 의도 보존)
 *   · default 0개 → 그룹 최신 영상 1개를 default=true로 UPDATE
 *
 * 결과: 영상은 만들었는데 ⭐ 안 누른 운영진의 매치 자동 노출 즉시 시작.
 */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

readFileSync(".env", "utf8")
  .split(/\r?\n/)
  .forEach((l) => {
    const m = l.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  });

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

function inferCategory(data) {
  if (data?.category) return data.category;
  // 폴백 — 평면화 후엔 거의 발생 안 함
  const all = [...(data?.attack ?? []), ...(data?.defense ?? [])].map((p) => (p.label ?? "").toLowerCase()).join(" ");
  if (/(세트피스|코너|프리킥|페널티)/.test(all)) return "SETPIECE";
  const a = (data?.attack ?? []).length;
  const d = (data?.defense ?? []).length;
  if (d > a) return "DEFENSE";
  return "ATTACK";
}

function groupKey(row) {
  const cat = inferCategory(row.animation_data);
  // 매치 노출 정책과 동일 — SETPIECE·OTHER는 포메이션 무관
  if (cat === "SETPIECE" || cat === "OTHER") {
    return `${row.team_id}::${cat}`;
  }
  return `${row.team_id}::${row.formation_id}::${cat}`;
}

const { data: all, error } = await db
  .from("team_tactical_animations")
  .select("id, team_id, formation_id, name, animation_data, is_default, created_at")
  .order("created_at", { ascending: false });

if (error) {
  console.error("READ error:", error);
  process.exit(1);
}

// 그룹별로 묶기
const groups = new Map();
for (const row of all) {
  const k = groupKey(row);
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(row);
}

let groupsWithDefault = 0;
let groupsToFix = 0;
const toUpdate = [];

for (const [k, rows] of groups) {
  const hasDefault = rows.some((r) => r.is_default);
  if (hasDefault) {
    groupsWithDefault++;
    continue;
  }
  groupsToFix++;
  // 최신 1개 (이미 created_at desc 정렬됨)
  const target = rows[0];
  toUpdate.push(target);
  console.log("  +", k, "→", target.name);
}

console.log("\n=== Plan ===");
console.log("그룹 총", groups.size, "(이미 default 있음:", groupsWithDefault, "/ 자동 부여 예정:", groupsToFix + ")");

if (toUpdate.length === 0) {
  console.log("작업 없음 — 모든 그룹에 이미 default 있음.");
  process.exit(0);
}

console.log("\nUPDATE 진행...");
let updated = 0;
let failed = 0;
for (const row of toUpdate) {
  const { error: updErr } = await db
    .from("team_tactical_animations")
    .update({ is_default: true })
    .eq("id", row.id);
  if (updErr) {
    failed++;
    console.error("  FAIL", row.id, updErr.message);
  } else {
    updated++;
  }
}

console.log("\n=== Done ===");
console.log("updated:", updated, "/ failed:", failed);
