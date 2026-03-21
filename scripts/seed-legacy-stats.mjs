/**
 * legacy_player_stats 시드 — 엑셀에서 2011~2024 데이터 파싱 후 DB 삽입
 * 실행: SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-legacy-stats.mjs
 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

import { createClient } from "@supabase/supabase-js";
const SUPABASE_URL = "https://agcmuvjwiydfppjlbhcx.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_KEY) { console.error("SUPABASE_SERVICE_ROLE_KEY 필요"); process.exit(1); }
const db = createClient(SUPABASE_URL, SUPABASE_KEY);
const teamId = "f1678029-1b44-4a80-93fc-0a6036bbaba2";

// 엑셀 파싱
const wb = XLSX.readFile("scripts/2345.xlsx");
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

// 년도 컬럼 위치 파악
const header0 = rows[0];
const yearConfigs = [];
for (let c = 0; c < header0.length; c++) {
  const label = String(header0[c]);
  const match = label.match(/(\d{4})년/);
  if (match) {
    yearConfigs.push({ year: parseInt(match[1]), startCol: c });
  }
}

console.log(`년도 ${yearConfigs.length}개:`, yearConfigs.map(y => y.year).join(", "));

// 서브헤더: 출석, 경기, 승, 무, 패, 골, 어시 (7개 컬럼)
// 각 년도는 startCol부터 7개 컬럼

async function main() {
  // 팀 멤버 이름→ID 매핑
  const { data: members } = await db.from("team_members").select("id, pre_name, users(name)").eq("team_id", teamId);
  const nameToMemberId = new Map();
  for (const m of members ?? []) {
    const name = m.users?.name ?? m.pre_name;
    if (name) nameToMemberId.set(name, m.id);
  }
  console.log(`멤버 ${nameToMemberId.size}명 매핑 준비`);

  // 기존 레거시 데이터 삭제 (중복 방지)
  const { error: delErr } = await db.from("legacy_player_stats").delete().eq("team_id", teamId);
  if (delErr) console.log("기존 데이터 삭제 실패:", delErr.message);
  else console.log("기존 레거시 데이터 초기화");

  const allStats = [];
  let skippedEmpty = 0;

  // 데이터 행 파싱 (row 2부터, row 0=년도헤더, row 1=컬럼헤더)
  for (let r = 2; r < rows.length; r++) {
    const row = rows[r];
    const name = String(row[0] ?? "").trim();
    if (!name) continue;

    for (const yc of yearConfigs) {
      const c = yc.startCol;
      const attendance = Number(row[c] ?? 0) || 0;
      const games = Number(row[c + 1] ?? 0) || 0;
      const wins = Number(row[c + 2] ?? 0) || 0;
      const draws = Number(row[c + 3] ?? 0) || 0;
      const losses = Number(row[c + 4] ?? 0) || 0;
      const goals = Number(row[c + 5] ?? 0) || 0;
      const assists = Number(row[c + 6] ?? 0) || 0;

      // 모든 값이 0이면 건너뜀 (활동 안 한 시즌)
      if (attendance === 0 && games === 0 && goals === 0 && assists === 0) {
        skippedEmpty++;
        continue;
      }

      const memberId = nameToMemberId.get(name) ?? null;

      allStats.push({
        team_id: teamId,
        member_name: name,
        member_id: memberId,
        year: yc.year,
        attendance,
        games,
        wins,
        draws,
        losses,
        goals,
        assists,
      });
    }
  }

  console.log(`\n파싱 완료: ${allStats.length}개 통계 (빈 시즌 ${skippedEmpty}개 건너뜀)`);

  // 배치 삽입 (50개씩)
  let inserted = 0;
  let errors = 0;
  for (let i = 0; i < allStats.length; i += 50) {
    const batch = allStats.slice(i, i + 50);
    const { error } = await db.from("legacy_player_stats").insert(batch);
    if (error) {
      console.log(`  ❌ batch ${i}: ${error.message}`);
      errors++;
    } else {
      inserted += batch.length;
    }
  }

  console.log(`\n완료: ${inserted}개 삽입, ${errors}개 에러`);

  // 년도별 요약
  const yearSummary = new Map();
  for (const s of allStats) {
    if (!yearSummary.has(s.year)) yearSummary.set(s.year, { players: 0, totalGoals: 0, totalAssists: 0 });
    const y = yearSummary.get(s.year);
    y.players++;
    y.totalGoals += s.goals;
    y.totalAssists += s.assists;
  }
  console.log("\n년도별 요약:");
  for (const [year, summary] of [...yearSummary].sort((a, b) => a[0] - b[0])) {
    console.log(`  ${year}: ${summary.players}명, 골 ${summary.totalGoals}, 어시 ${summary.totalAssists}`);
  }
}

main().catch(console.error);
