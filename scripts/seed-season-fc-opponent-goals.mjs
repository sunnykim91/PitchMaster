/**
 * 시즌FC 14경기 상대팀 골 추가 스크립트
 * 실행: node scripts/seed-season-fc-opponent-goals.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const envContent = readFileSync(".env", "utf-8");
const getEnv = (key) => {
  const match = envContent.match(new RegExp(`^${key}=(.+)$`, "m"));
  return match?.[1]?.trim();
};

const SUPABASE_URL = "https://agcmuvjwiydfppjlbhcx.supabase.co";
const SUPABASE_KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY");
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

const CREATED_BY = "6b15bdac-4e4e-4daf-b8c9-df591abebb29";

// matchId → [{ q, count }]  (쿼터별 상대팀 실점 수)
const OPPONENT_GOALS = [
  // Match 1: 1/4 vs 프렌즈, 패 1:5
  { matchId: "41793c40-5cb8-462c-94b3-574ea82ca0fe", goals: [
    { q: 1, count: 1 }, { q: 2, count: 1 }, { q: 4, count: 3 },
  ]},
  // Match 2: 1/11 vs 위드, 승 6:1
  { matchId: "835ee05c-eb10-48ef-ad4c-a247cd1d7250", goals: [
    { q: 3, count: 1 },
  ]},
  // Match 3: 1/18 vs 프렌즈, 승 7:3
  { matchId: "e03a8a46-3242-4c32-a507-b31724fa440f", goals: [
    { q: 2, count: 1 }, { q: 3, count: 1 }, { q: 4, count: 1 },
  ]},
  // Match 4: 1/25 vs 평화, 승 7:5
  { matchId: "30302d00-1514-4173-8f5b-6de5ecf9727d", goals: [
    { q: 1, count: 2 }, { q: 3, count: 1 }, { q: 4, count: 2 },
  ]},
  // Match 5: 2/1 vs 평화, 무 4:4
  { matchId: "5be948d2-8156-4088-bf94-ccc50c7bf7a5", goals: [
    { q: 2, count: 2 }, { q: 3, count: 1 }, { q: 4, count: 1 },
  ]},
  // Match 6: 2/8 vs 고인돌, 승 9:3
  { matchId: "578996ef-b5e5-4967-9093-2fb704bbb556", goals: [
    { q: 1, count: 2 }, { q: 4, count: 1 },
  ]},
  // Match 7: 2/15 vs 프렌즈, 패 3:4
  { matchId: "b245f717-ba4c-401a-9b4f-3facd31d5d81", goals: [
    { q: 1, count: 3 }, { q: 3, count: 1 },
  ]},
  // Match 8: 2/21 vs 노유, 승 5:4
  { matchId: "26525f1a-4614-4921-a71b-7f3031a72ed3", goals: [
    { q: 2, count: 1 }, { q: 4, count: 3 },
  ]},
  // Match 9: 2/28 vs 로암, 승 8:3
  { matchId: "68a94516-c2a0-4406-8238-1893e21e18d3", goals: [
    { q: 3, count: 2 }, { q: 4, count: 1 },
  ]},
  // Match 10: 3/1 vs 평화, 패 4:10
  { matchId: "19317ff5-2005-4ce9-9ee0-2448f1706782", goals: [
    { q: 1, count: 1 }, { q: 2, count: 2 }, { q: 3, count: 4 }, { q: 4, count: 3 },
  ]},
  // Match 11: 3/8 vs TO FC, 승 4:0 → 실점 없음
  // Match 12: 3/15 vs SG FC, 승 9:7
  { matchId: "91d8602c-e0e8-4143-a873-0564b26d9dba", goals: [
    { q: 1, count: 1 }, { q: 2, count: 2 }, { q: 3, count: 4 },
  ]},
  // Match 13: 3/22 vs 레알, 승 10:2
  { matchId: "eca3a693-c8b1-4c22-ac37-6a48949f6848", goals: [
    { q: 1, count: 1 }, { q: 2, count: 1 },
  ]},
  // Match 14: 3/29 vs 평화, 승 8:5
  { matchId: "be5bee7a-6d33-42d8-91d4-49a5ab22b97e", goals: [
    { q: 1, count: 2 }, { q: 2, count: 2 }, { q: 4, count: 1 },
  ]},
];

async function main() {
  console.log("=== 상대팀 골 추가 시작 ===\n");

  let totalGoals = 0;

  for (const entry of OPPONENT_GOALS) {
    const rows = [];
    for (const { q, count } of entry.goals) {
      for (let i = 0; i < count; i++) {
        rows.push({
          match_id: entry.matchId,
          quarter_number: q,
          scorer_id: "OPPONENT",
          assist_id: null,
          is_own_goal: false,
          goal_type: "NORMAL",
          recorded_by: CREATED_BY,
        });
      }
    }

    const { error } = await db.from("match_goals").insert(rows);
    if (error) {
      console.error(`  ❌ ${entry.matchId}: ${error.message}`);
    } else {
      totalGoals += rows.length;
      console.log(`  ✅ ${entry.matchId} → 상대팀 골 ${rows.length}개`);
    }
  }

  console.log(`\n=== 완료: 상대팀 골 총 ${totalGoals}개 추가 ===`);
}

main().catch(console.error);
