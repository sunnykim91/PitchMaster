/**
 * FC발로만 2026 시즌 18경기 데이터 시드 (docs/FC발로만.xlsx 기반)
 *
 * - 엑셀엔 쿼터·골↔도움 짝·시간·장소가 없음 → 선수별 골/도움 "합계"는 100% 보존하되
 *   쿼터=null, 골-도움 짝은 자기자신 도움 없이 재구성, 시간·장소=null.
 * - 미가입 2명(권익현·김현찬)은 pre_name 멤버로 등록 후 member_id로 기록.
 * - 용병 득점/도움 = MERCENARY, 상대 실점 = OPPONENT sentinel.
 *
 * 실행:
 *   node scripts/seed-balloman-matches.mjs          # DRY RUN (아무것도 안 씀)
 *   APPLY=1 node scripts/seed-balloman-matches.mjs  # 실제 삽입
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import XLSX from "xlsx";

const APPLY = process.env.APPLY === "1";
const getEnv = (k) => readFileSync(".env", "utf-8").match(new RegExp(`^${k}=(.+)$`, "m"))?.[1]?.trim();
const db = createClient("https://agcmuvjwiydfppjlbhcx.supabase.co", getEnv("SUPABASE_SERVICE_ROLE_KEY"));

const TEAM_ID = "353e06cb-4779-4f1a-930b-12f4b58f4cee";
const SEASON_ID = "4cd0dd9f-f131-4017-9303-1ef5d15944d4"; // 2026
const CREATED_BY = "8b3e8abb-9f77-4468-8a50-ff7e35009b06"; // 김영민 (회장)

// 이름 → { uid: users.id, mid: team_members.id } (ACTIVE 멤버 19명)
const MEMBERS = {
  "이현":   { uid: "0256150a-0829-4857-94ba-ea2ec5ee6105", mid: "f6adf882-8a2a-46ec-b528-dbe20c7f3874" },
  "전용우": { uid: "07d66c22-b0c8-4b19-8b3d-38a638d7f2a0", mid: "0d5660a7-86f9-4027-93f8-82efc91efefd" },
  "김정석": { uid: "09f1408c-73a6-429b-b9f3-92a9215d6435", mid: "b5faae61-6b51-4291-a8e4-006e93e9ac3b" },
  "엄태흥": { uid: "0e40d548-a82c-4ec8-8eaf-6c99aad1c46c", mid: "e578cea3-6ae7-48dc-89a1-ca282f9d7f6d" },
  "김찬영": { uid: "21c7c03b-63f7-4213-acaa-0bf167af31b6", mid: "1814e9b1-1569-4afd-ba64-705c02795dbf" },
  "최현성": { uid: "2d8dd0c1-64ca-40db-9ae4-05ea8bc672a3", mid: "589f6cf6-9391-4510-b376-6e5bae241383" },
  "이윤용": { uid: "39206950-f946-48e2-ad70-f46ee5d4a3c2", mid: "641cfff1-2526-4e14-9b69-5f47eb208ca5" },
  "권용한": { uid: "3f6a789e-a6fe-435a-b93f-8503e9cc3e59", mid: "a3768582-84f5-48af-abed-739c853b5841" },
  "노우현": { uid: "702352c5-8c33-480c-928c-b61f5b2aec4b", mid: "eae92d0c-c8da-4153-b107-0650654bf4e7" },
  "정치인": { uid: "7d79a9e8-ccc1-4996-b2c6-2aad011c88e1", mid: "c82f7bab-d87f-4960-b631-553e86e66cc3" },
  "강대훈": { uid: "93872c10-edcb-40e3-8b64-4a4c5970da95", mid: "5f29a80c-19f1-406c-a326-74ef4128e013" },
  "최인녕": { uid: "a0da7885-2cde-4a36-9703-80457a9ba490", mid: "c834af0d-e233-4301-ac51-0138a0b3a6ab" },
  "이상우": { uid: "a0f0783f-6569-407f-ab2c-844bc6d304a8", mid: "88bd5105-5f6e-4e1f-86f5-3b31aaa40757" },
  "박형준": { uid: "a6c0dfd8-3923-491a-a469-918483d96e68", mid: "86e1a037-5df7-4a27-b3b7-a9be79e3b9ca" },
  "김인하": { uid: "b6f45119-13a6-40f0-9e92-6f4751ce36a4", mid: "87d99f03-f34b-4a6e-8be1-bc566fc93ac1" },
  "장영재": { uid: "caec879c-9f6d-4b0e-a54e-e1c245952225", mid: "81cd82c2-ff2f-4bd2-9815-706e06dabd58" },
  "심민섭": { uid: "cbdac680-679d-4236-b09e-88055613ca0d", mid: "ddadb6c9-f789-4e9e-a4b4-857a723b5090" }, // ACTIVE (BANNED 중복 제외)
  "강선교": { uid: "f058be24-cc93-4971-87fc-033c0d0f05e0", mid: "24e922c2-30c8-4fe6-8eaa-d76f1488aa72" },
  "정지효": { uid: "ffa79ff0-01f4-4779-bb77-7e93085f7785", mid: "e84a01bc-60de-43b9-949f-fa70daa0e9fb" },
};

// 미가입 → pre_name 멤버 등록 (member_id는 런타임에 채워짐)
const PRENAME = ["권익현", "김현찬"];
const PRENAME_MID = {}; // name → member_id

const NON_PLAYER = new Set(["용병", "자책골"]);

// ── 엑셀 파싱 ──
const wb = XLSX.read(readFileSync("docs/FC발로만.xlsx"), { type: "buffer" });
const rows = XLSX.utils.sheet_to_json(wb.Sheets["Sheet1"], { header: 1, defval: "" });
const MATCH_START = 15, BLOCK = 5;
const num = (v) => (typeof v === "number" ? v : v === "" ? 0 : Number(v) || 0);
const parseDate = (s) => {
  const p = String(s).split(".").map((x) => x.trim()).filter((x) => x !== "");
  return `${p[0]}-${p[1].padStart(2, "0")}-${p[2].padStart(2, "0")}`;
};

const matchCols = [];
for (let c = MATCH_START; c < rows[0].length; c += BLOCK) {
  if (!rows[0][c] && !rows[0][c + 1]) continue;
  matchCols.push({ col: c, date: parseDate(rows[0][c]), opp: String(rows[0][c + 1]).trim() });
}
const players = [];
for (let r = 3; r < rows.length; r++) {
  const n = String(rows[r][0]).trim();
  if (!n) break;
  players.push({ row: r, name: n });
}

// 경기별 데이터 빌드
const MATCHES = matchCols.map((m) => {
  const attendees = [];
  const scorerList = []; // 골 1개당 이름 1개
  const assistList = []; // 도움 1개당 이름 1개
  for (const p of players) {
    const marker = rows[p.row][m.col];
    const g = num(rows[p.row][m.col + 1]);
    const a = num(rows[p.row][m.col + 2]);
    if (!NON_PLAYER.has(p.name) && marker !== "" && marker != null) attendees.push(p.name);
    for (let k = 0; k < g; k++) scorerList.push(p.name);
    for (let k = 0; k < a; k++) assistList.push(p.name);
  }
  const conceded = num(rows[2][m.col + 3]);
  return { date: m.date, opp: m.opp, attendees, scorerList, assistList, conceded };
});

// 골-도움 재구성 (자기자신 도움 회피)
function reconstruct(scorerList, assistList) {
  const goals = scorerList.map((s) => ({ scorer: s, assist: null }));
  for (const a of assistList) {
    let idx = goals.findIndex((g) => g.assist === null && g.scorer !== a);
    if (idx === -1) idx = goals.findIndex((g) => g.assist === null); // fallback (이 데이터엔 발생 안 함)
    if (idx === -1) throw new Error("도움 슬롯 부족 (assists>goals)");
    goals[idx].assist = a;
  }
  return goals;
}

function resolveKey(name) {
  if (name === "용병") return "MERCENARY";
  if (MEMBERS[name]) return MEMBERS[name].uid;
  if (PRENAME_MID[name]) return PRENAME_MID[name];
  throw new Error("매핑 없는 이름: " + name);
}

async function ensurePrenameMembers() {
  for (const name of PRENAME) {
    const { data: existing } = await db
      .from("team_members")
      .select("id")
      .eq("team_id", TEAM_ID)
      .eq("pre_name", name)
      .maybeSingle();
    if (existing) {
      PRENAME_MID[name] = existing.id;
      console.log(`  • pre_name 멤버 존재: ${name} (${existing.id})`);
      continue;
    }
    if (!APPLY) {
      PRENAME_MID[name] = `<NEW:${name}>`;
      console.log(`  • [DRY] pre_name 멤버 생성 예정: ${name}`);
      continue;
    }
    const { data, error } = await db
      .from("team_members")
      .insert({ team_id: TEAM_ID, user_id: null, role: "MEMBER", status: "ACTIVE", pre_name: name, pre_phone: null })
      .select("id")
      .single();
    if (error) throw new Error(`pre_name 생성 실패 ${name}: ${error.message}`);
    PRENAME_MID[name] = data.id;
    console.log(`  ✅ pre_name 멤버 생성: ${name} (${data.id})`);
  }
}

async function main() {
  console.log(`=== FC발로만 18경기 시드 (${APPLY ? "APPLY" : "DRY RUN"}) ===\n`);
  console.log("[1] pre_name 멤버 준비");
  await ensurePrenameMembers();

  let nMatch = 0, nAtt = 0, nGoal = 0, nOpp = 0;
  console.log("\n[2] 경기 삽입");
  for (let i = 0; i < MATCHES.length; i++) {
    const m = MATCHES[i];
    const our = m.scorerList.length;
    console.log(`\n[${i + 1}/18] ${m.date} vs ${m.opp}  ${our}:${m.conceded}  (참석 ${m.attendees.length})`);

    // 중복 가드
    const { data: dup } = await db
      .from("matches")
      .select("id")
      .eq("team_id", TEAM_ID)
      .eq("match_date", m.date)
      .eq("status", "COMPLETED")
      .eq("opponent_name", m.opp)
      .maybeSingle();
    if (dup) { console.log("  ⏭️  이미 존재 → 스킵"); continue; }

    let matchId = `<DRY-${i + 1}>`;
    if (APPLY) {
      const { data: match, error } = await db.from("matches").insert({
        team_id: TEAM_ID, season_id: SEASON_ID, opponent_name: m.opp,
        match_date: m.date, match_time: null, location: null,
        quarter_count: 4, quarter_duration: 25, break_duration: 5, player_count: 11,
        status: "COMPLETED", match_type: "REGULAR", stats_included: true,
        uniform_type: "HOME", sport_type: "SOCCER", created_by: CREATED_BY,
      }).select("id").single();
      if (error) { console.error("  ❌ match 실패:", error.message); continue; }
      matchId = match.id;
    }
    nMatch++;

    // 출석
    const attRows = m.attendees.map((name) => {
      const mem = MEMBERS[name];
      return {
        match_id: matchId,
        user_id: mem ? mem.uid : null,
        member_id: mem ? mem.mid : PRENAME_MID[name],
        vote: "ATTEND",
        actually_attended: true,
      };
    });
    if (APPLY && attRows.length) {
      const { error } = await db.from("match_attendance").insert(attRows);
      if (error) console.error("  ❌ attendance 실패:", error.message);
    }
    nAtt += attRows.length;

    // 골 (재구성)
    const recon = reconstruct(m.scorerList, m.assistList);
    const goalRows = recon.map((g) => ({
      match_id: matchId, quarter_number: null,
      scorer_id: resolveKey(g.scorer),
      assist_id: g.assist ? resolveKey(g.assist) : null,
      is_own_goal: false, goal_type: "NORMAL", recorded_by: CREATED_BY,
    }));
    if (APPLY && goalRows.length) {
      const { error } = await db.from("match_goals").insert(goalRows);
      if (error) console.error("  ❌ goals 실패:", error.message);
    }
    nGoal += goalRows.length;

    // 상대 골
    const oppRows = Array.from({ length: m.conceded }, () => ({
      match_id: matchId, quarter_number: null, scorer_id: "OPPONENT", assist_id: null,
      is_own_goal: false, goal_type: "NORMAL", recorded_by: CREATED_BY,
    }));
    if (APPLY && oppRows.length) {
      const { error } = await db.from("match_goals").insert(oppRows);
      if (error) console.error("  ❌ opp goals 실패:", error.message);
    }
    nOpp += oppRows.length;

    console.log(`  골 ${goalRows.length} (도움 ${recon.filter((g) => g.assist).length}) · 상대 ${oppRows.length} · 출석 ${attRows.length}`);
  }

  console.log(`\n=== ${APPLY ? "완료" : "DRY RUN 요약"} ===`);
  console.log(`경기 ${nMatch} · 출석 ${nAtt} · 우리 골 ${nGoal} · 상대 골 ${nOpp}`);
  if (!APPLY) console.log("\n실제 삽입하려면:  APPLY=1 node scripts/seed-balloman-matches.mjs");
}

main().catch((e) => { console.error(e); process.exit(1); });
