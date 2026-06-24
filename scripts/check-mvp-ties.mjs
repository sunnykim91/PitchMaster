/**
 * 과거 전체 경기 중 "MVP 투표 동률(공동 1등)이었으나 기존 단일-winner 로직으로
 * 1명만 기록된" 경기를 전수 조회. (공동 MVP 정책 도입 전 미반영분 확인용)
 *
 * 실행: node scripts/check-mvp-ties.mjs
 * .env 에서 SUPABASE_URL / SERVICE_ROLE_KEY 를 직접 읽음 (키 노출 안 함).
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// ── .env 파싱 (dotenv 미설치) ──
const env = {};
for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) { console.error("URL/KEY 누락"); process.exit(1); }
const db = createClient(URL_, KEY);

const DEMO_TEAM_ID = "192127c0-e2be-46b4-b340-7583730467da";
const CUTOFF = "2026-05-04";

// ── 정책 헬퍼 (src/lib/mvpThreshold.ts 그대로 복제) ──
const isValidTurnout = (voteCount, attended) =>
  attended <= 0 ? voteCount > 0 : voteCount / attended >= 0.7;
const shouldNewPolicy = (matchDate, staffOnly) =>
  staffOnly ? false : !matchDate ? false : matchDate >= CUTOFF;
function pickStaffDecision(rows, staffVoterIds, applyBackfillHealing) {
  const c = new Map();
  for (const v of rows) {
    if (!v.candidate_id) continue;
    const pick = v.is_staff_decision || (applyBackfillHealing && staffVoterIds.has(v.voter_id));
    if (pick) c.set(v.candidate_id, (c.get(v.candidate_id) ?? 0) + 1);
  }
  if (c.size === 0) return null;
  return [...c.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
}
function resolveValidMvps(votes, attended, staffDecision) {
  if (staffDecision) return [staffDecision];
  if (!votes.length) return [];
  if (!isValidTurnout(votes.length, attended)) return [];
  const counts = {};
  for (const id of votes) counts[id] = (counts[id] ?? 0) + 1;
  const max = Math.max(...Object.values(counts));
  return Object.keys(counts).filter((id) => counts[id] === max).sort();
}

// ── 페이지네이션 헬퍼 (Supabase 1000행 캡 회피) ──
async function fetchAll(table, columns, apply = (q) => q) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await apply(db.from(table).select(columns)).range(from, from + 999);
    if (error) { console.error(`${table} 조회 실패:`, error.message); process.exit(1); }
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

async function main() {
  // 1. 전체 MVP 투표
  const votes = await fetchAll("match_mvp_votes", "match_id, voter_id, candidate_id, is_staff_decision");
  const byMatch = new Map();
  for (const v of votes) {
    if (!v.candidate_id) continue;
    const a = byMatch.get(v.match_id) ?? { votes: [], rows: [] };
    a.votes.push(v.candidate_id);
    a.rows.push(v);
    byMatch.set(v.match_id, a);
  }
  const matchIds = [...byMatch.keys()];

  // 2. 경기 정보
  const matches = await fetchAll("matches", "id, team_id, match_date, match_type, opponent_name");
  const matchInfo = new Map(matches.map((m) => [m.id, m]));

  // 3. 실제 참석자 수 (PRESENT/LATE)
  const att = await fetchAll("match_attendance", "match_id, attendance_status",
    (q) => q.in("attendance_status", ["PRESENT", "LATE"]));
  const attendedPerMatch = new Map();
  for (const a of att) attendedPerMatch.set(a.match_id, (attendedPerMatch.get(a.match_id) ?? 0) + 1);

  // 4. 팀 설정 + 이름
  const teams = await fetchAll("teams", "id, name, mvp_vote_staff_only");
  const teamInfo = new Map(teams.map((t) => [t.id, t]));

  // 5. 팀별 STAFF voter 셋
  const tm = await fetchAll("team_members", "team_id, user_id, role, status",
    (q) => q.in("status", ["ACTIVE", "DORMANT"]).in("role", ["STAFF", "PRESIDENT"]));
  const staffByTeam = new Map();
  for (const m of tm) {
    if (!m.user_id) continue;
    if (!staffByTeam.has(m.team_id)) staffByTeam.set(m.team_id, new Set());
    staffByTeam.get(m.team_id).add(m.user_id);
  }

  // 6. 후보 이름
  const users = await fetchAll("users", "id, name");
  const nameOf = new Map(users.map((u) => [u.id, u.name]));

  // 7. 경기별 판정 → 공동 1등(2명 이상) 추출
  const ties = [];
  const rawTiesNotQualified = [];  // 생짜 득표 동률이지만 정책상 공동 MVP 아님 (사유 기록)
  for (const mid of matchIds) {
    const info = matchInfo.get(mid);
    if (!info) continue;                       // orphan vote
    if (info.team_id === DEMO_TEAM_ID) continue;
    const agg = byMatch.get(mid);
    const staffOnly = teamInfo.get(info.team_id)?.mvp_vote_staff_only ?? false;
    const newPolicy = shouldNewPolicy(info.match_date, staffOnly);
    const staffVoterIds = staffByTeam.get(info.team_id) ?? new Set();
    const staffDecision = pickStaffDecision(agg.rows, staffVoterIds, !newPolicy);
    const winners = resolveValidMvps(agg.votes, attendedPerMatch.get(mid) ?? 0, staffDecision);

    // 생짜 득표 기준 top-tie 여부 (게이트·운영진 무시)
    const rawCounts = {};
    for (const id of agg.votes) rawCounts[id] = (rawCounts[id] ?? 0) + 1;
    const rawMax = Math.max(...Object.values(rawCounts));
    const rawTopIds = Object.keys(rawCounts).filter((id) => rawCounts[id] === rawMax);
    const isRawTie = rawTopIds.length >= 2 && rawMax > 0;

    if (winners.length >= 2) {
      const counts = {};
      for (const id of agg.votes) counts[id] = (counts[id] ?? 0) + 1;
      ties.push({
        teamId: info.team_id,
        team: teamInfo.get(info.team_id)?.name ?? "(?)",
        date: info.match_date,
        type: info.match_type,
        opponent: info.opponent_name,
        attended: attendedPerMatch.get(mid) ?? 0,
        totalVotes: agg.votes.length,
        winners: winners.map((id) => `${nameOf.get(id) ?? id.slice(0, 6)}(${counts[id]}표)`),
      });
    } else if (isRawTie) {
      // 생짜 동률인데 공동 MVP로 안 잡힌 경우 → 사유 분석
      let reason;
      if (staffDecision) reason = "운영진 지정/투표로 1명 확정";
      else if (!isValidTurnout(agg.votes.length, attendedPerMatch.get(mid) ?? 0)) reason = `투표율 미달(${agg.votes.length}/${attendedPerMatch.get(mid) ?? 0})`;
      else reason = "기타";
      rawTiesNotQualified.push({
        team: teamInfo.get(info.team_id)?.name ?? "(?)",
        date: info.match_date,
        rawTop: rawTopIds.map((id) => `${nameOf.get(id) ?? id.slice(0, 6)}(${rawCounts[id]}표)`),
        reason,
      });
    }
  }

  // 8. 출력 — 팀별 그룹
  ties.sort((a, b) => (a.team).localeCompare(b.team) || (a.date ?? "").localeCompare(b.date ?? ""));
  const byTeam = new Map();
  for (const t of ties) {
    if (!byTeam.has(t.team)) byTeam.set(t.team, []);
    byTeam.get(t.team).push(t);
  }

  console.log(`\n=== MVP 공동 1등(미반영) 경기 전수 ===`);
  console.log(`전체 MVP 투표 경기: ${matchIds.length}개 / 동률 경기: ${ties.length}개 (데모 제외)\n`);
  for (const [team, list] of byTeam) {
    console.log(`■ ${team} — ${list.length}경기`);
    for (const t of list) {
      const typeLabel = t.type === "INTERNAL" ? "자체전" : t.type === "EVENT" ? "행사" : (t.opponent ? `vs ${t.opponent}` : "상대전");
      console.log(`   ${t.date ?? "(날짜?)"} ${typeLabel} · 참석${t.attended}·투표${t.totalVotes} → 공동: ${t.winners.join(", ")}`);
    }
    console.log("");
  }

  // FCMZ 별도 강조
  const fcmz = ties.filter((t) => t.team.includes("FCMZ"));
  console.log(`※ FCMZ 관련: ${fcmz.length}경기`);

  // 생짜 동률이지만 정책상 공동 MVP 아닌 경기 (참고용)
  console.log(`\n--- 참고: 생짜 득표 동률이나 정책상 공동 MVP 아님 (${rawTiesNotQualified.length}경기) ---`);
  for (const t of rawTiesNotQualified) {
    console.log(`   [${t.team}] ${t.date ?? "(날짜?)"} · ${t.rawTop.join(", ")} → ${t.reason}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
