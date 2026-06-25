// 가입일 이전으로 잘못 부과된 회비 미납·벌금 데이터 정리 (전 팀 대상)
//
// 배경: 회비/벌금 생성 로직이 team_members.joined_at 을 무시해서, 신규 가입 회원이
//   - 가입 월·이전 달의 회비 '미납'(dues_payment_status status=UNPAID)
//   - 가입 전 경기의 '미투표' 등 벌금(penalty_records, match_date < joined_at)
//   으로 잘못 잡히던 버그. 코드는 수정됐고, 이 스크립트는 이미 DB에 쌓인 잘못된 행을 정리한다.
//
// 정책: 가입 다음 달부터 회비 부과 → 월 <= 가입월(KST) 인 UNPAID 행은 잘못된 것.
//       벌금은 match_date < joined_at(KST) 인 경기 벌금이 잘못된 것.
//
// 스캔(기본, 삭제 안 함): SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/cleanup-prejoin-dues-penalties.mjs
// 실제 삭제:              SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/cleanup-prejoin-dues-penalties.mjs --apply
//
// 안전장치:
//   - 기본은 dry-run. 무엇이 지워질지 출력만.
//   - 벌금 중 status=PAID(실제 납부 완료)는 자동 삭제 안 함 — 돈이 오간 기록이라 별도 보고만.
//   - 회비는 status=UNPAID 만 건드림(PAID/EXEMPT 무시 → '미지정'으로 되돌리는 안전한 작업).

import { createClient } from "@supabase/supabase-js";

const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!KEY) { console.error("SUPABASE_SERVICE_ROLE_KEY 필요"); process.exit(1); }
const db = createClient("https://agcmuvjwiydfppjlbhcx.supabase.co", KEY);

const APPLY = process.argv.includes("--apply");

/** timestamptz → KST "YYYY-MM-DD" */
function kstDate(iso) {
  return new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
/** timestamptz → KST "YYYY-MM" */
function kstMonth(iso) {
  return new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 7);
}

/** 페이지네이션으로 테이블 전체 조회 */
async function fetchAll(table, columns, filter = (q) => q) {
  const rows = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await filter(db.from(table).select(columns)).range(from, from + PAGE - 1);
    if (error) { console.error(`[${table}] 조회 실패:`, error.message); process.exit(1); }
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

async function main() {
  console.log(`\n=== 가입일 이전 잘못 부과 데이터 정리 (${APPLY ? "실제 삭제 모드" : "스캔 모드 — 삭제 안 함"}) ===\n`);

  // 팀명 (보고용)
  const teams = await fetchAll("teams", "id, name");
  const teamName = new Map(teams.map((t) => [t.id, t.name]));

  // 전 팀 team_members joined_at 맵
  //   - 회비용: team_members.id → joined_at
  //   - 벌금용: `team_id|user_id` → joined_at
  const members = await fetchAll("team_members", "id, team_id, user_id, joined_at");
  const joinByTmId = new Map();
  const joinByTeamUser = new Map();
  for (const m of members) {
    if (m.joined_at) {
      joinByTmId.set(m.id, m.joined_at);
      if (m.user_id) joinByTeamUser.set(`${m.team_id}|${m.user_id}`, m.joined_at);
    }
  }

  // ── A. 잘못된 벌금 (match_date < joined_at) ──
  const penalties = await fetchAll("penalty_records", "id, team_id, member_id, match_id, amount, status, note, date",
    (q) => q.not("match_id", "is", null));
  const matchIds = [...new Set(penalties.map((p) => p.match_id))];
  const matchById = new Map();
  for (let i = 0; i < matchIds.length; i += 500) {
    const chunk = matchIds.slice(i, i + 500);
    const { data } = await db.from("matches").select("id, match_date, opponent_name").in("id", chunk);
    for (const mt of data ?? []) matchById.set(mt.id, mt);
  }

  const badPenaltiesDeletable = []; // status != PAID
  const badPenaltiesPaid = [];      // status == PAID (수동 검토)
  for (const p of penalties) {
    const mt = matchById.get(p.match_id);
    if (!mt) continue;
    const joinedAt = joinByTeamUser.get(`${p.team_id}|${p.member_id}`);
    if (!joinedAt) continue; // 현재 팀 멤버 아님 → 판단 보류
    if (mt.match_date < kstDate(joinedAt)) {
      const rec = { ...p, match_date: mt.match_date, opponent: mt.opponent_name, joined: kstDate(joinedAt) };
      if (p.status === "PAID") badPenaltiesPaid.push(rec);
      else badPenaltiesDeletable.push(rec);
    }
  }

  // ── B. 잘못된 회비 미납 (month <= 가입월) ──
  const unpaidRows = await fetchAll("dues_payment_status", "id, team_id, member_id, month, status",
    (q) => q.eq("status", "UNPAID"));
  const badDues = [];
  for (const r of unpaidRows) {
    const joinedAt = joinByTmId.get(r.member_id);
    if (!joinedAt) continue;
    if (r.month <= kstMonth(joinedAt)) {
      badDues.push({ ...r, joinMonth: kstMonth(joinedAt) });
    }
  }

  // ── 보고 ──
  const byTeam = (rows) => {
    const m = new Map();
    for (const r of rows) m.set(r.team_id, (m.get(r.team_id) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };

  console.log(`■ 잘못된 벌금 (가입 전 경기) — 삭제 대상(미납/면제) ${badPenaltiesDeletable.length}건`);
  for (const [tid, n] of byTeam(badPenaltiesDeletable)) {
    console.log(`   ${teamName.get(tid) ?? tid}: ${n}건`);
  }
  console.log(`   샘플:`);
  for (const r of badPenaltiesDeletable.slice(0, 10)) {
    console.log(`     [${teamName.get(r.team_id) ?? r.team_id}] ${r.date} ${r.amount}원 "${r.note}" (경기 ${r.match_date} / 가입 ${r.joined})`);
  }
  if (badPenaltiesPaid.length > 0) {
    console.log(`\n   ⚠️ 이미 '납부완료(PAID)'된 잘못된 벌금 ${badPenaltiesPaid.length}건 — 자동 삭제 안 함(돈 오간 기록). 수동 검토:`);
    for (const r of badPenaltiesPaid.slice(0, 20)) {
      console.log(`     [${teamName.get(r.team_id) ?? r.team_id}] ${r.date} ${r.amount}원 "${r.note}" (경기 ${r.match_date} / 가입 ${r.joined}) id=${r.id}`);
    }
  }

  console.log(`\n■ 잘못된 회비 미납 (가입 월·이전) — 삭제 대상 ${badDues.length}건`);
  for (const [tid, n] of byTeam(badDues)) {
    console.log(`   ${teamName.get(tid) ?? tid}: ${n}건`);
  }
  console.log(`   샘플:`);
  for (const r of badDues.slice(0, 10)) {
    console.log(`     [${teamName.get(r.team_id) ?? r.team_id}] ${r.month}월 미납 (가입월 ${r.joinMonth})`);
  }

  // ── 삭제 ──
  if (!APPLY) {
    console.log(`\n스캔 완료. 실제로 지우려면 --apply 플래그로 다시 실행하세요.`);
    console.log(`(벌금 ${badPenaltiesDeletable.length}건 + 회비 ${badDues.length}건 삭제 예정. PAID 벌금 ${badPenaltiesPaid.length}건은 보존.)`);
    return;
  }

  let delP = 0, delD = 0;
  for (let i = 0; i < badPenaltiesDeletable.length; i += 200) {
    const ids = badPenaltiesDeletable.slice(i, i + 200).map((r) => r.id);
    const { error, count } = await db.from("penalty_records").delete({ count: "exact" }).in("id", ids);
    if (error) { console.error("벌금 삭제 실패:", error.message); break; }
    delP += count ?? ids.length;
  }
  for (let i = 0; i < badDues.length; i += 200) {
    const ids = badDues.slice(i, i + 200).map((r) => r.id);
    const { error, count } = await db.from("dues_payment_status").delete({ count: "exact" }).in("id", ids).eq("status", "UNPAID");
    if (error) { console.error("회비 삭제 실패:", error.message); break; }
    delD += count ?? ids.length;
  }
  console.log(`\n✅ 삭제 완료 — 벌금 ${delP}건, 회비 미납 ${delD}건. (PAID 벌금 ${badPenaltiesPaid.length}건 보존)`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
