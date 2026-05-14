/**
 * P4 마이그레이션 — 레거시(attack/defense phase) 영상을 평면 영상으로 분리.
 *
 * 각 phase → 별도 영상 1개로 분리:
 *  - name: "{원본명} - {phase.label}" (label 빈 경우 "{공격|수비} {idx+1}")
 *  - animation_data: { steps: phase.steps, category, defaultRate, attack:[], defense:[] }
 *  - is_default: 원본이 default이면 첫 번째 새 영상만 true
 *
 * 안전:
 *  - docs/backups/ 에 사전 백업 (dry-run 단계에서 이미 수행)
 *  - INSERT 모두 성공 후 원본 DELETE — 부분 실패 시 새 row 남고 원본도 남음(중복) 가능하나 90팀+ 영향 적음
 *  - 이미 평면(steps 있음) 영상은 SKIP
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

function inferCategory(mode, label) {
  const lbl = (label || "").toLowerCase();
  if (/세트피스|코너|프리킥|페널티|throw|kick/.test(lbl)) return "SETPIECE";
  if (/전환|역습|카운터|trans/.test(lbl)) return "TRANSITION";
  return mode === "defense" ? "DEFENSE" : "ATTACK";
}

function fallbackLabel(mode, idx) {
  return (mode === "defense" ? "수비 " : "공격 ") + (idx + 1);
}

const { data: all, error: readErr } = await db.from("team_tactical_animations").select("*");
if (readErr) {
  console.error("READ error:", readErr);
  process.exit(1);
}

let migrated = 0;
let skipped = 0;
let created = 0;
let failed = 0;

for (const row of all) {
  const ad = row.animation_data || {};
  if (Array.isArray(ad.steps) && ad.steps.length > 0) {
    skipped++;
    console.log("SKIP (already flat):", row.name);
    continue;
  }

  const attack = ad.attack || [];
  const defense = ad.defense || [];
  if (attack.length === 0 && defense.length === 0) {
    skipped++;
    console.log("SKIP (no phases):", row.name);
    continue;
  }

  const newRows = [];
  const phases = [
    ...attack.map((p, i) => ({ mode: "attack", phase: p, idx: i })),
    ...defense.map((p, i) => ({ mode: "defense", phase: p, idx: i })),
  ];

  // 분리 영상은 모두 is_default=false로. 유니크 제약 충돌 회피 + 사용자가
  // 분리 후 어떤 영상을 대표로 둘지 직접 결정하는 편이 자연스러움.
  for (const { mode, phase, idx } of phases) {
    const label = (phase.label || "").trim() || fallbackLabel(mode, idx);
    const category = inferCategory(mode, phase.label);
    newRows.push({
      team_id: row.team_id,
      formation_id: row.formation_id,
      name: `${row.name} - ${label}`,
      description: row.description,
      animation_data: {
        steps: phase.steps || [],
        attack: [],
        defense: [],
        category,
        ...(ad.defaultRate ? { defaultRate: ad.defaultRate } : {}),
      },
      is_default: false,
      created_by: row.created_by,
    });
  }

  console.log(`Migrating "${row.name}" → ${newRows.length} flat animations…`);
  const { error: insertErr } = await db.from("team_tactical_animations").insert(newRows);
  if (insertErr) {
    failed++;
    console.error("  INSERT failed:", insertErr.message);
    continue;
  }
  created += newRows.length;

  const { error: delErr } = await db
    .from("team_tactical_animations")
    .delete()
    .eq("id", row.id);
  if (delErr) {
    console.error("  DELETE failed (new rows already created):", delErr.message);
    failed++;
    continue;
  }
  migrated++;
}

console.log("\n=== Migration complete ===");
console.log("migrated:", migrated, "legacy animations");
console.log("created:", created, "flat animations");
console.log("skipped:", skipped);
console.log("failed:", failed);
