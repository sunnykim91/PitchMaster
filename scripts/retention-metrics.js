#!/usr/bin/env node
/**
 * PitchMaster 활성화·잔존 지표 (외부 팀 기준)
 *
 * 가입 팀 수(구경꾼 포함)가 아니라 "실제로 시도한 팀"을 분모로 본다.
 * - 활성화율   : 신규팀(30일내) 중 경기 2개+ 만든 비율  ← 첫 습관 형성
 * - 진짜 잔존  : 커밋팀(멤버 10+ 또는 경기 3+) 중 최근 21일 활성 비율
 *
 * 사용법: node scripts/retention-metrics.js
 * .env 의 NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY 사용 (읽기 전용).
 */
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

const env = Object.fromEntries(
  fs
    .readFileSync(".env", "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/\r$/, "")];
    })
);

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// 데모 + 내부 운영 팀 제외 (이름 기반 근사 — 분포 분석용)
const DEMO = "192127c0-e2be-46b4-b340-7583730467da";
const isInternal = (n) => !n || /FCMZ|Rebirth|jsy|에스케이디앤디|DEMO|테스트|test/i.test(n);

async function fetchAll(table, cols) {
  let all = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select(cols).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    all = all.concat(data);
    if (data.length < 1000) break;
  }
  return all;
}

(async () => {
  const now = new Date();
  const [teams, matches, members] = await Promise.all([
    fetchAll("teams", "id,name,created_at"),
    fetchAll("matches", "team_id,match_date,created_at"),
    fetchAll("team_members", "team_id"),
  ]);

  const mc = {}, memc = {}, lastM = {};
  for (const m of matches) {
    mc[m.team_id] = (mc[m.team_id] || 0) + 1;
    const d = new Date(m.match_date || m.created_at);
    if (!lastM[m.team_id] || d > lastM[m.team_id]) lastM[m.team_id] = d;
  }
  for (const tm of members) memc[tm.team_id] = (memc[tm.team_id] || 0) + 1;

  const ext = teams.filter((t) => t.id !== DEMO && !isInternal(t.name));
  const rows = ext.map((t) => ({
    name: t.name,
    n: mc[t.id] || 0,
    mem: memc[t.id] || 0,
    ageDays: Math.floor((now - new Date(t.created_at)) / 864e5),
    daysSinceLast: lastM[t.id] ? Math.floor((now - lastM[t.id]) / 864e5) : null,
  }));

  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const tireKicker = rows.filter((r) => r.mem < 5 && r.n <= 2);
  const committed = rows.filter((r) => r.mem >= 10 || r.n >= 3);
  const committedActive = committed.filter((r) => r.daysSinceLast !== null && r.daysSinceLast <= 21);
  const new30 = rows.filter((r) => r.ageDays <= 30);
  const new30Activated = new30.filter((r) => r.n >= 2);
  const stuck = rows
    .filter((r) => r.mem >= 15 && r.n <= 2)
    .sort((a, b) => b.mem - a.mem);

  console.log(`기준일 ${now.toISOString().slice(0, 10)}`);
  console.log(`외부팀 ${rows.length}  (구경꾼 ${tireKicker.length} = ${pct(tireKicker.length, rows.length)}%)`);
  console.log(`\n[활성화] 신규팀(30일내) ${new30.length} → 경기2개+ ${new30Activated.length}개 (${pct(new30Activated.length, new30.length)}%)`);
  console.log(`[진짜 잔존] 커밋팀(멤버10+ or 경기3+) ${committed.length} → 최근21일 활성 ${committedActive.length} (${pct(committedActive.length, committed.length)}%)`);
  console.log(`\n[막힌 고의도 팀] 멤버15+ & 경기<=2 (제품이 실패시킨 팀):`);
  for (const r of stuck) console.log(`  ${r.name}  멤버${r.mem}/경기${r.n}/마지막 ${r.daysSinceLast ?? "-"}일전`);
})();
