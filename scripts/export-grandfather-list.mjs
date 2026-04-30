#!/usr/bin/env node
/**
 * Grandfather 대상 사용자·팀 명단 export.
 *
 * 사용법:
 *   node scripts/export-grandfather-list.mjs [cutoffDate]
 *
 * cutoffDate (선택, 기본 오늘): 이 날짜 이전 가입한 사용자가 grandfather 대상.
 *   예) node scripts/export-grandfather-list.mjs 2027-01-01
 *
 * 출력:
 *   - docs/grandfather-users-{date}.csv  사용자 목록 (id, name, email-or-kakao, created_at, team_count)
 *   - docs/grandfather-teams-{date}.csv  팀 목록 (id, name, member_count, created_at)
 *
 * 환경변수: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("✗ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수 필요");
  process.exit(1);
}

const cutoffDate = process.argv[2] || new Date().toISOString().slice(0, 10);
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log(`▸ cutoff: ${cutoffDate} 이전 가입자 추출\n`);

// 사용자 명단
const { data: users, error: uErr } = await db
  .from("users")
  .select("id, name, kakao_id, created_at")
  .lt("created_at", cutoffDate)
  .order("created_at", { ascending: true });

if (uErr) {
  console.error("✗ 사용자 조회 실패:", uErr.message);
  process.exit(1);
}

// 각 사용자의 가입 팀 수
const userIds = users.map((u) => u.id);
const teamCountByUser = {};
if (userIds.length > 0) {
  const { data: memberRows } = await db
    .from("team_members")
    .select("user_id, team_id, status")
    .in("user_id", userIds)
    .in("status", ["ACTIVE", "DORMANT"]);
  for (const m of memberRows ?? []) {
    teamCountByUser[m.user_id] = (teamCountByUser[m.user_id] ?? 0) + 1;
  }
}

// 팀 명단
const { data: teams, error: tErr } = await db
  .from("teams")
  .select("id, name, sport_type, created_at")
  .lt("created_at", cutoffDate)
  .order("created_at", { ascending: true });

if (tErr) {
  console.error("✗ 팀 조회 실패:", tErr.message);
  process.exit(1);
}

const teamIds = teams.map((t) => t.id);
const memberCountByTeam = {};
if (teamIds.length > 0) {
  const { data: memberRows } = await db
    .from("team_members")
    .select("team_id, status")
    .in("team_id", teamIds)
    .in("status", ["ACTIVE", "DORMANT"]);
  for (const m of memberRows ?? []) {
    memberCountByTeam[m.team_id] = (memberCountByTeam[m.team_id] ?? 0) + 1;
  }
}

// CSV 작성
const docsDir = join(process.cwd(), "docs");
try { mkdirSync(docsDir, { recursive: true }); } catch { /* exists */ }

const userCsv = [
  "id,name,kakao_id,team_count,created_at",
  ...users.map((u) =>
    [
      u.id,
      JSON.stringify(u.name ?? ""),
      JSON.stringify(u.kakao_id ?? ""),
      teamCountByUser[u.id] ?? 0,
      u.created_at,
    ].join(",")
  ),
].join("\n");

const teamCsv = [
  "id,name,sport_type,member_count,created_at",
  ...teams.map((t) =>
    [
      t.id,
      JSON.stringify(t.name ?? ""),
      t.sport_type ?? "",
      memberCountByTeam[t.id] ?? 0,
      t.created_at,
    ].join(",")
  ),
].join("\n");

const stamp = cutoffDate.replaceAll("-", "");
const userPath = join(docsDir, `grandfather-users-${stamp}.csv`);
const teamPath = join(docsDir, `grandfather-teams-${stamp}.csv`);

writeFileSync(userPath, userCsv);
writeFileSync(teamPath, teamCsv);

console.log(`✓ 사용자 ${users.length}명 → ${userPath}`);
console.log(`✓ 팀 ${teams.length}개 → ${teamPath}`);

// 백필 SQL 안내
console.log("\n다음 SQL로 grandfathered_until 백필:");
console.log(`UPDATE public.users SET grandfathered_until = '2027-12-31' WHERE created_at < '${cutoffDate}';`);
