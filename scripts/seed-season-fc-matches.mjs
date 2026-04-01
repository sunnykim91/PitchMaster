/**
 * 시즌FC 2026 경기 데이터 시드 스크립트 (14경기)
 * 실행: node scripts/seed-season-fc-matches.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

// .env 파일에서 직접 키 읽기
const envContent = readFileSync(".env", "utf-8");
const getEnv = (key) => {
  const match = envContent.match(new RegExp(`^${key}=(.+)$`, "m"));
  return match?.[1]?.trim();
};

const SUPABASE_URL = "https://agcmuvjwiydfppjlbhcx.supabase.co";
const SUPABASE_KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY");
if (!SUPABASE_KEY) {
  console.error("SUPABASE_SERVICE_ROLE_KEY 환경변수를 설정하세요.");
  process.exit(1);
}
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

const TEAM_ID = "9eb8c327-b2c0-4556-a689-8761826d40a2";
const SEASON_ID = "1ebe9ba6-67f3-43b8-9c1b-59bc0ec786cd";
const CREATED_BY = "6b15bdac-4e4e-4daf-b8c9-df591abebb29"; // 지태훈 (회장)

// ── 이름 → user_id 매핑 ──
const NAME_TO_UID = {
  "지태훈": "6b15bdac-4e4e-4daf-b8c9-df591abebb29",
  "김지훈": "09dde47d-3461-4658-8465-2f8ed62483c8",
  "이재현": "98e96fb0-2b9b-440a-8335-aa87aa6628a7",
  "박태영": "c65c4945-05e8-4ca3-a95e-b14e6f3e32fd",
  "이준혁": "7a3a06d7-d8da-4256-858b-a2dc82d7e1dc",
  "이진규": "ab66e5ae-a1ed-43b4-8b23-eefea930edef",
  "유지성": "76b9579f-6823-4e88-a530-0292413f1fe8",
  "이재성": "7ae3525c-b215-456a-b846-d7c995417b34",
  "이두원": "b5ddbbc0-d18e-4872-853b-d59807086f88",
  "박상호": "4063e945-2f73-4b6b-8dfb-5d4818f8ad54",
  "이윤성": "71d4c3f4-3adf-4e74-be14-5286b2f5fe01",
  "이제현": "0b1b0ba5-2f15-470a-b0fc-7eb7de03fac4",
  "박세현": "0d028b42-7668-4795-8688-3f080ffb6639",
  "심규봉": "f2e7f5be-0c49-4625-8069-00b9ba54d71b",
  "김다빈": "07c38fde-f26a-4fc4-b08e-fbd951471101",
  "유경민": "ece83f6c-c969-474a-8d56-56d42583cf5a",
  "김민재": "1b4e4db0-848e-4927-a5bf-57ab687bff82",
  "최재우": "8f8f7c62-c39d-4362-a393-0753fcbf9da3",
  "김판성": "984119ce-7ff3-48e3-8c7e-1fd230be8f6a",
  "박다한": "9ce6f64c-fd2d-4ceb-9eba-b957d94974a4",
  "조성재": "7edaac21-053c-4a31-9455-4ba8aee284ef",
  "박경륜": "df635b60-8de1-4714-b23f-8460c92bd1d2",
  "김시헌": "2a512aa6-bf74-4081-8e34-b6a8b266a6a3",
  "권희찬": "a04e0358-ad5d-4d13-8ec6-7f3fb9590ee8",
  "백현기": "3dd5bba0-bc2f-4e7a-86a8-0ccf78d8ac8c",
  "심성민": "9908eaa1-1f02-465c-9901-2922cca95240",
  "김정운": "9476d552-4097-42e6-8b7a-cf7d1858edf0",
  "성유준": "5686ac0f-a0a3-46e7-a3b4-3843afa9604a",
  "박성준": "cbb00e1d-4ccc-43f2-850f-011bcf8ea1da",
  "김하준": "6a0e7098-ac7a-49d5-bccc-a195fb1fd95b",
};

// 이름 → member_id 매핑
const NAME_TO_MID = {
  "지태훈": "893e514b-d1e4-4b0f-8548-f0e8cbe3270a",
  "김지훈": "da70513d-eefd-45cb-a595-be2dac117dfa",
  "이재현": "0ff8e47b-3aea-4228-a269-02a95e98eb15",
  "박태영": "dbcb764f-1444-4c43-b090-07a7eabd4aad",
  "이준혁": "09cc4a44-0956-4d4c-a663-f4d4ce8d129d",
  "이진규": "0417c8ae-5c07-40a0-93b5-2ca983152c44",
  "유지성": "eee8e58e-0314-4dd6-9917-e894e93aca37",
  "이재성": "1bbc07f6-7345-4724-8675-37f6a9dc45b9",
  "이두원": "a0525c20-7b8a-4c4e-b98c-5954a4b99824",
  "박상호": "2202c1f5-70a9-4326-aaa1-9d71a90956d4",
  "이윤성": "989cff69-6615-47ba-9a60-fbb1b6e13ae3",
  "이제현": "4e3a0be4-8240-4eed-aeee-62d97689926f",
  "박세현": "89756fc1-65e0-423f-b26c-9be2d20c7b3a",
  "심규봉": "a452789c-8549-41f2-9552-260708bc110c",
  "김다빈": "e627f2bc-3d49-4aff-aada-83f6cb96e4da",
  "유경민": "c858fe9c-a926-4221-a313-aa6264f4d1c1",
  "김민재": "385862bd-fdb3-45ec-95a0-21d110a44e1a",
  "최재우": "bb9eaba6-b726-4536-8c50-e0353244a371",
  "김판성": "a4a9db15-1062-4568-a6a4-6b6b4d7f6292",
  "박다한": "39e9a95a-1bc0-4bc0-852a-6aa755bc837e",
  "조성재": "21d02944-3dc0-4a5a-b00f-357b19b30159",
  "박경륜": "6f1bde51-8118-4dee-8c1c-e4781cb2ded5",
  "김시헌": "14793e6d-0a3b-4312-9066-8daecf5989e6",
  "권희찬": "3fe9b7fe-02d9-4d19-8703-569213cbadf0",
  "백현기": "ea54d4d2-9304-44b9-bbb6-63ebd036b737",
  "심성민": "a65e65e4-b209-475a-9735-3836328b3656",
  "김정운": "59671c6c-3872-427f-8477-ce984c03ce85",
  "성유준": "d8bde44a-d311-4e20-9be3-5eaee0f860b5",
  "박성준": "ea3bed18-5b7c-4f9e-bea8-86590e1f11be",
  "김하준": "0a4cd6e6-b988-403a-99af-85b82ff17271",
};

// 스크린샷에서 쓰이는 줄임말 → 풀네임
const SHORT = {
  "태영": "박태영", "성준": "박성준", "세현": "박세현", "정운": "김정운",
  "하준": "김하준", "유준": "성유준", "지훈": "김지훈", "진규": "이진규",
  "상호": "박상호", "준혁": "이준혁", "다한": "박다한", "경민": "유경민",
  "윤성": "이윤성", "규봉": "심규봉", "태훈": "지태훈", "희찬": "권희찬",
  "경륜": "박경륜", "두원": "이두원", "재성": "이재성", "민재": "김민재",
  "다빈": "김다빈", "시헌": "김시헌", "재현": "이재현", "제현": "이제현",
  "지성": "유지성", "현기": "백현기", "성민": "심성민", "판성": "김판성",
};

function uid(name) {
  const full = SHORT[name] || name;
  return NAME_TO_UID[full] || null;
}

// ── 14경기 데이터 ──
const MATCHES = [
  // ─── Match 1: 1/4 vs 프렌즈 ───
  {
    match: { date: "2026-01-04", time: "06:08:00", location: "마들스타디움", opponent: "프렌즈", status: "COMPLETED" },
    attendees: ["김다빈","김정운","박경륜","박다한","박성준","박세현","성유준","심성민","유경민","이진규","이제현","조성재","지태훈","이준혁"],
    guests: ["최재성"],
    goals: [
      { q: 4, scorer: "세현", assist: "다한" },
    ],
  },
  // ─── Match 2: 1/11 vs 위드 ───
  {
    match: { date: "2026-01-11", time: "06:08:00", location: "강북구민운동장", opponent: "위드", status: "COMPLETED" },
    attendees: ["김정운","김지훈","김판성","박다한","박상호","성유준","심규봉","이윤성","이진규","이제현","이준혁","김하준"],
    guests: ["키퍼용병","조승환"],
    goals: [
      { q: 2, scorer: "지훈", assist: "정운" },
      { q: 2, scorer: "유준", assist: "지훈" },
      { q: 3, scorer: "MERCENARY", assist: "MERCENARY" },
      { q: 3, scorer: "상호", assist: "MERCENARY" },
      { q: 4, scorer: "진규", assist: "MERCENARY" },
      { q: 4, scorer: "지훈", assist: "진규" },
    ],
  },
  // ─── Match 3: 1/18 vs 프렌즈 ───
  {
    match: { date: "2026-01-18", time: "06:08:00", location: "강북구민운동장", opponent: "프렌즈", status: "COMPLETED" },
    attendees: ["김민재","김정운","김지훈","김판성","박다한","박성준","박세현","박태영","백현기","심규봉","이윤성","이재현","이제현","이진규","조성재","지태훈","이준혁","김하준"],
    guests: [],
    goals: [
      { q: 1, scorer: "태영", assist: "성준" },
      { q: 1, scorer: "세현", assist: "정운" },
      { q: 1, scorer: "성준", assist: "하준" },
      { q: 2, scorer: "진규", assist: "세현" },
      { q: 3, scorer: "지훈", assist: "태영" },
      { q: 4, scorer: "세현", assist: null },
      { q: 4, scorer: "성준", assist: "세현" },
    ],
  },
  // ─── Match 4: 1/25 vs 평화 ───
  {
    match: { date: "2026-01-25", time: "06:08:00", location: "용마산구장", opponent: "평화", status: "COMPLETED" },
    attendees: ["권희찬","김정운","김지훈","김판성","박다한","박태영","심규봉","이윤성","이재현","이제현","이준혁","이진규","지태훈","김하준"],
    guests: ["조승환","김태연"],
    goals: [
      { q: 1, scorer: "MERCENARY", assist: "MERCENARY" },
      { q: 2, scorer: "MERCENARY", assist: "MERCENARY" },
      { q: 2, scorer: "태영", assist: null },
      { q: 2, scorer: "태영", assist: "MERCENARY" },
      { q: 3, scorer: "정운", assist: "지훈" },
      { q: 3, scorer: "MERCENARY", assist: "희찬" },
      { q: 3, scorer: "지훈", assist: "윤성" },
    ],
  },
  // ─── Match 5: 2/1 vs 평화 ───
  {
    match: { date: "2026-02-01", time: "06:08:00", location: "불암산스타디움", opponent: "평화", status: "COMPLETED" },
    attendees: ["김민재","김정운","김지훈","김판성","박다한","박성준","성유준","심규봉","유경민","이재현","이진규","이준혁","조성재","지태훈","김하준"],
    guests: [],
    goals: [
      { q: 1, scorer: "정운", assist: "하준" },
      { q: 2, scorer: "지훈", assist: "경민" },
      { q: 3, scorer: "경민", assist: "준혁" },
      { q: 4, scorer: "하준", assist: "성준" },
    ],
  },
  // ─── Match 6: 2/8 vs 고인돌 ───
  {
    match: { date: "2026-02-08", time: "06:08:00", location: "남양주종합운동장B", opponent: "고인돌", status: "COMPLETED" },
    attendees: ["김정운","김지훈","김판성","박다한","박상호","박세현","박태영","백현기","심규봉","심성민","이윤성","이진규","이제현","김하준"],
    guests: ["정종봉"],
    goals: [
      { q: 2, scorer: "하준", assist: "상호" },
      { q: 2, scorer: "진규", assist: "윤성" },
      { q: 2, scorer: "상호", assist: "하준" },
      { q: 2, scorer: "정운", assist: null },
      { q: 3, scorer: "상호", assist: "진규" },
      { q: 3, scorer: "상호", assist: "윤성" },
      { q: 3, scorer: "지훈", assist: "진규" },
      { q: 3, scorer: "세현", assist: "상호" },
      { q: 4, scorer: "태영", assist: "하준" },
    ],
  },
  // ─── Match 7: 2/15 vs 프렌즈 ───
  {
    match: { date: "2026-02-15", time: "06:08:00", location: "마들스타디움", opponent: "프렌즈", status: "COMPLETED" },
    attendees: ["김정운","김지훈","박다한","박성준","박세현","박태영","성유준","유경민","이윤성","이준혁","이진규","이제현"],
    guests: ["심민섭","김창수"],
    goals: [
      { q: 1, scorer: "정운", assist: "유준" },
      { q: 1, scorer: "성준", assist: "정운" },
      { q: 2, scorer: "성준", assist: "진규" },
    ],
  },
  // ─── Match 8: 2/21 vs 노유 ───
  {
    match: { date: "2026-02-21", time: "06:08:00", location: "강북구민운동장", opponent: "노유", status: "COMPLETED" },
    attendees: ["김정운","김지훈","박다한","박상호","박태영","심규봉","심성민","이재현","이제현","이진규","이준혁","조성재","지태훈"],
    guests: ["김창수"],
    goals: [
      { q: 2, scorer: "진규", assist: "상호" },
      { q: 2, scorer: "상호", assist: "정운" },
      { q: 3, scorer: "태영", assist: "상호" },
      { q: 3, scorer: "상호", assist: "태영" },
      { q: 4, scorer: null, assist: "정운", ownGoal: true },
    ],
  },
  // ─── Match 9: 2/28 vs 로암 ───
  {
    match: { date: "2026-02-28", time: "06:08:00", location: "다산체육공원", opponent: "로암", status: "COMPLETED" },
    attendees: ["권희찬","김정운","김지훈","박상호","백현기","성유준","심규봉","이윤성","이재현","김하준","이재성"],
    guests: ["문환희","김민석"],
    goals: [
      { q: 1, scorer: "유준", assist: "상호" },
      { q: 2, scorer: "상호", assist: "희찬" },
      { q: 2, scorer: "상호", assist: "하준" },
      { q: 2, scorer: "상호", assist: null },
      { q: 2, scorer: "하준", assist: "유준" },
      { q: 4, scorer: "상호", assist: null },
      { q: 4, scorer: "정운", assist: "MERCENARY" },
      { q: 4, scorer: "재성", assist: "하준" },
    ],
  },
  // ─── Match 10: 3/1 vs 평화 ───
  {
    match: { date: "2026-03-01", time: "06:08:00", location: "불암산스타디움", opponent: "평화", status: "COMPLETED" },
    attendees: ["김정운","박다한","박상호","박성준","성유준","심규봉","유경민","이두원","이준혁","이재현","이제현","이진규","조성재","김하준"],
    guests: [],
    goals: [
      { q: 1, scorer: "상호", assist: "하준" },
      { q: 3, scorer: "하준", assist: "유준" },
      { q: 3, scorer: "경민", assist: "하준" },
      { q: 4, scorer: "유준", assist: "하준" },
    ],
  },
  // ─── Match 11: 3/8 vs TO FC ───
  {
    match: { date: "2026-03-08", time: "06:08:00", location: "불암산스타디움", opponent: "TO FC", status: "COMPLETED" },
    attendees: ["김판성","김하준","박경륜","박다한","박상호","박세현","심규봉","심성민","유경민","이재현","이제현","이진규","이준혁","조성재"],
    guests: [],
    goals: [
      { q: 3, scorer: "하준", assist: "경륜" },
      { q: 3, scorer: "진규", assist: "세현" },
      { q: 4, scorer: "경륜", assist: "진규" },
      { q: 4, scorer: "진규", assist: "준혁" },
    ],
  },
  // ─── Match 12: 3/15 vs SG FC ───
  {
    match: { date: "2026-03-15", time: "06:08:00", location: "초안산구장", opponent: "SG FC", status: "COMPLETED" },
    attendees: ["권희찬","김민재","김정운","김하준","박다한","박상호","박태영","백현기","성유준","이두원","이재현","이진규","이준혁","지태훈","이재성"],
    guests: [],
    goals: [
      { q: 1, scorer: "두원", assist: null },
      { q: 1, scorer: "태영", assist: "하준" },
      { q: 2, scorer: "재성", assist: "태영" },
      { q: 2, scorer: "하준", assist: null },
      { q: 2, scorer: "희찬", assist: "재성" },
      { q: 3, scorer: "태영", assist: "희찬" },
      { q: 4, scorer: "유준", assist: "태훈" },
      { q: 4, scorer: "하준", assist: "민재" },
      { q: 4, scorer: "진규", assist: "하준" },
    ],
  },
  // ─── Match 13: 3/22 vs 레알 ───
  {
    match: { date: "2026-03-22", time: "06:08:00", location: "초안산구장", opponent: "레알", status: "COMPLETED" },
    attendees: ["김다빈","김정운","김지훈","김하준","박상호","박태영","성유준","심규봉","이윤성","이재현","이제현","이준혁","이진규","조성재","지태훈"],
    guests: [],
    goals: [
      { q: 1, scorer: "유준", assist: "준혁" },
      { q: 1, scorer: "유준", assist: "상호" },
      { q: 2, scorer: "정운", assist: "태훈" },
      { q: 2, scorer: "태영", assist: "정운" },
      { q: 2, scorer: "진규", assist: "상호" },
      { q: 3, scorer: "진규", assist: "유준" },
      { q: 3, scorer: "진규", assist: "다빈" },
      { q: 3, scorer: "유준", assist: "상호" },
      { q: 4, scorer: "하준", assist: "규봉" },
      { q: 4, scorer: "유준", assist: "하준" },
    ],
  },
  // ─── Match 14: 3/29 vs 평화 ───
  {
    match: { date: "2026-03-29", time: "06:08:00", location: "용마산구장", opponent: "평화", status: "COMPLETED" },
    attendees: ["김정운","김시헌","김하준","박다한","박상호","박세현","유지성","이두원","이재성","이재현","이제현","이진규","이준혁","조성재","지태훈"],
    guests: [],
    goals: [
      { q: 1, scorer: "시헌", assist: "두원" },
      { q: 2, scorer: "지성", assist: "세현" },
      { q: 2, scorer: "정운", assist: "지성" },
      { q: 3, scorer: "지성", assist: "진규" },
      { q: 3, scorer: "상호", assist: "하준" },
      { q: 3, scorer: "지성", assist: "재현" },
      { q: 4, scorer: "재현", assist: "준혁" },
      { q: 4, scorer: "지성", assist: "상호" },
    ],
  },
];

async function main() {
  console.log("=== 시즌FC 14경기 데이터 시드 시작 ===\n");

  let totalMatches = 0;
  let totalGoals = 0;
  let totalAttendance = 0;
  let totalGuests = 0;

  for (let i = 0; i < MATCHES.length; i++) {
    const m = MATCHES[i];
    const mi = m.match;
    console.log(`\n[${i + 1}/14] ${mi.date} vs ${mi.opponent} @ ${mi.location}`);

    // 1) match 생성
    const { data: match, error: matchErr } = await db.from("matches").insert({
      team_id: TEAM_ID,
      season_id: SEASON_ID,
      opponent_name: mi.opponent,
      match_date: mi.date,
      match_time: mi.time,
      location: mi.location,
      quarter_count: 4,
      quarter_duration: 25,
      break_duration: 5,
      player_count: 11,
      status: "COMPLETED",
      match_type: "REGULAR",
      stats_included: true,
      uniform_type: "HOME",
      created_by: CREATED_BY,
    }).select("id").single();

    if (matchErr) {
      console.error("  ❌ match 생성 실패:", matchErr.message);
      continue;
    }
    const matchId = match.id;
    totalMatches++;
    console.log(`  ✅ match 생성: ${matchId}`);

    // 2) attendance 생성 (팀 멤버)
    const attendanceRows = [];
    for (const name of m.attendees) {
      const userId = NAME_TO_UID[name];
      const memberId = NAME_TO_MID[name];
      if (!userId) {
        console.warn(`  ⚠️ 멤버 매핑 없음: ${name}`);
        continue;
      }
      attendanceRows.push({
        match_id: matchId,
        user_id: userId,
        member_id: memberId || null,
        vote: "ATTEND",
        actually_attended: true,
      });
    }

    if (attendanceRows.length > 0) {
      const { error: attErr } = await db.from("match_attendance").insert(attendanceRows);
      if (attErr) {
        console.error("  ❌ attendance 실패:", attErr.message);
      } else {
        totalAttendance += attendanceRows.length;
        console.log(`  ✅ attendance ${attendanceRows.length}명`);
      }
    }

    // 3) guests 생성
    if (m.guests.length > 0) {
      const guestRows = m.guests.map(name => ({
        match_id: matchId,
        name,
      }));
      const { error: guestErr } = await db.from("match_guests").insert(guestRows);
      if (guestErr) {
        console.error("  ❌ guests 실패:", guestErr.message);
      } else {
        totalGuests += guestRows.length;
        console.log(`  ✅ guests ${guestRows.length}명: ${m.guests.join(", ")}`);
      }
    }

    // 4) goals 생성
    if (m.goals.length > 0) {
      const goalRows = m.goals.map(g => {
        const isOwn = g.ownGoal || false;
        let scorerId = null;
        let assistId = null;

        if (g.scorer === "MERCENARY") {
          scorerId = "MERCENARY";
        } else if (g.scorer) {
          scorerId = uid(g.scorer);
        }

        if (g.assist === "MERCENARY") {
          assistId = "MERCENARY";
        } else if (g.assist) {
          assistId = uid(g.assist);
        }

        return {
          match_id: matchId,
          quarter_number: g.q,
          scorer_id: scorerId,
          assist_id: assistId,
          is_own_goal: isOwn,
          goal_type: isOwn ? "OWN_GOAL" : "NORMAL",
          recorded_by: CREATED_BY,
        };
      });

      const { error: goalErr } = await db.from("match_goals").insert(goalRows);
      if (goalErr) {
        console.error("  ❌ goals 실패:", goalErr.message);
      } else {
        totalGoals += goalRows.length;
        console.log(`  ✅ goals ${goalRows.length}개`);
      }
    }
  }

  console.log("\n=== 시드 완료 ===");
  console.log(`경기: ${totalMatches}, 참석: ${totalAttendance}, 게스트: ${totalGuests}, 골: ${totalGoals}`);
}

main().catch(console.error);
