/**
 * FK Rebirth 개별 득점/도움 기록 시드
 * 기존 UNKNOWN 골을 실제 선수 이름으로 교체
 * 실행: SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-goals.mjs
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://agcmuvjwiydfppjlbhcx.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_KEY) { console.error("SUPABASE_SERVICE_ROLE_KEY 필요"); process.exit(1); }
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

const teamId = "f1678029-1b44-4a80-93fc-0a6036bbaba2";

// 이미지에서 파싱한 득점 데이터 (date로 매치 찾기, "용병"/"지인" 등은 null)
// { date, scorer, assist, q(쿼터, 0=미지정) }
const goalData = [
  // === 2024-12-14 vs 노유 fc ===
  { date: "2024-12-14", scorer: "김태균", assist: "심평강", q: 2 },

  // === 2024-12-21 vs SC 프리덤 ===
  { date: "2024-12-21", scorer: "정영진", assist: "임재환", q: 0 },

  // === 2024-12-28 vs the ZD FC ===
  { date: "2024-12-28", scorer: "추리건", assist: "김태균", q: 2 },
  { date: "2024-12-28", scorer: "박수민A", assist: "정영진", q: 2 },
  { date: "2024-12-28", scorer: "권용국", assist: "문다훈", q: 3 },
  { date: "2024-12-28", scorer: "권용국", assist: "김태균", q: 3 },
  { date: "2024-12-28", scorer: "정진교", assist: "조일찬", q: 3 },

  // === 2025-01-04 vs Cantum FC ===
  { date: "2025-01-04", scorer: "정창교", assist: "최석민", q: 0 },
  { date: "2025-01-04", scorer: "김태균", assist: null, q: 0 },
  { date: "2025-01-04", scorer: null, assist: "조일찬", q: 0 },
  { date: "2025-01-04", scorer: null, assist: "최영훈", q: 0 },

  // === 2025-01-18 vs jsc ===
  { date: "2025-01-18", scorer: "김태균", assist: "심평강", q: 3 },

  // === 2025-01-25 vs SC 프리덤 ===
  { date: "2025-01-25", scorer: "이현", assist: null, q: 0 },
  { date: "2025-01-25", scorer: "추리건", assist: "임재환", q: 0 },

  // === 2025-02-08 vs 라이징썬 ===
  { date: "2025-02-08", scorer: "임재환", assist: "최석민", q: 0 },

  // === 2025-02-15 vs FC WSM ===
  { date: "2025-02-15", scorer: "최영훈", assist: null, q: 0 },

  // === 2025-02-22 vs SC 프리덤 ===
  { date: "2025-02-22", scorer: "김태균", assist: "황성환", q: 0 },
  { date: "2025-02-22", scorer: null, assist: "김경섭", q: 0 },

  // === 2025-03-01 vs Cantum FC === (0-0 무)

  // === 2025-03-22 vs SC 프리덤 ===
  { date: "2025-03-22", scorer: "심평강", assist: null, q: 1 },
  { date: "2025-03-22", scorer: null, assist: "정영진", q: 0 },

  // === 2025-04-05 vs 라이징썬 ===
  { date: "2025-04-05", scorer: "윤성연", assist: null, q: 0 },
  { date: "2025-04-05", scorer: "정영진", assist: null, q: 2 },

  // === 2025-04-12 vs SC 프리덤 ===
  { date: "2025-04-12", scorer: "정영진", assist: null, q: 1 },
  { date: "2025-04-12", scorer: "임재환", assist: null, q: 2 },

  // === 2025-04-19 vs 올림 ===
  { date: "2025-04-19", scorer: null, assist: null, q: 2 },

  // === 2025-05-03 vs 에스 fc ===
  { date: "2025-05-03", scorer: "김태균", assist: null, q: 1 },
  { date: "2025-05-03", scorer: null, assist: null, q: 3 },
  { date: "2025-05-03", scorer: null, assist: null, q: 3 },
  { date: "2025-05-03", scorer: null, assist: null, q: 3 },
  { date: "2025-05-03", scorer: null, assist: null, q: 4 },

  // === 2025-05-10 vs 올림 ===
  { date: "2025-05-10", scorer: "최영훈", assist: null, q: 0 },
  { date: "2025-05-10", scorer: "박수민A", assist: null, q: 0 },

  // === 2025-05-17 vs Cantum FC ===
  { date: "2025-05-17", scorer: "심평강", assist: null, q: 1 },
  { date: "2025-05-17", scorer: null, assist: null, q: 2 },
  { date: "2025-05-17", scorer: null, assist: null, q: 3 },
  { date: "2025-05-17", scorer: null, assist: null, q: 3 },

  // === 2025-05-24 vs 라이징썬 === (0-3, no team goals)

  // === 2025-05-31 vs 올림 ===
  { date: "2025-05-31", scorer: "정진교", assist: null, q: 0 },
  { date: "2025-05-31", scorer: null, assist: null, q: 3 },
  { date: "2025-05-31", scorer: null, assist: null, q: 4 },
  { date: "2025-05-31", scorer: null, assist: null, q: 4 },

  // === 2025-06-07 vs SC 프리덤 ===
  { date: "2025-06-07", scorer: "심평강", assist: null, q: 2 },
  { date: "2025-06-07", scorer: null, assist: "임재환", q: 0 },

  // === 2025-06-14 vs 올림 ===
  { date: "2025-06-14", scorer: "심평강", assist: null, q: 1 },
  { date: "2025-06-14", scorer: null, assist: "임재환", q: 0 },
  { date: "2025-06-14", scorer: "김태균", assist: null, q: 3 },
  { date: "2025-06-14", scorer: null, assist: "심평강", q: 0 },

  // === 2025-06-21 vs 라이징썬 ===
  { date: "2025-06-21", scorer: null, assist: null, q: 1 },
  { date: "2025-06-21", scorer: "심평강", assist: "임재환", q: 2 },
  { date: "2025-06-21", scorer: null, assist: "김태균", q: 2 },
  { date: "2025-06-21", scorer: null, assist: null, q: 3 },
  { date: "2025-06-21", scorer: null, assist: null, q: 3 },
  { date: "2025-06-21", scorer: null, assist: null, q: 4 },

  // === 2025-06-28 vs SC 프리덤 ===
  { date: "2025-06-28", scorer: "심평강", assist: null, q: 1 },
  { date: "2025-06-28", scorer: null, assist: "김태균", q: 0 },
  { date: "2025-06-28", scorer: null, assist: "김경섭", q: 0 },

  // === 2025-07-05 vs 올림 ===
  { date: "2025-07-05", scorer: "심평강", assist: "김경섭", q: 2 },

  // === 2025-07-19 vs SC 프리덤 ===
  { date: "2025-07-19", scorer: null, assist: "추리건", q: 0 },

  // === 2025-07-26 vs 라이징썬 ===
  { date: "2025-07-26", scorer: null, assist: null, q: 0 },

  // === 2025-08-02 vs 라이징썬 === (0-3, no team goals)

  // === 2025-08-09 vs SC 프리덤 === (0-2, no team goals)

  // === 2025-08-16 vs 올림 ===
  { date: "2025-08-16", scorer: "심평강", assist: null, q: 1 },
  { date: "2025-08-16", scorer: "정영진", assist: "최영훈", q: 4 },
  { date: "2025-08-16", scorer: null, assist: "권용국", q: 4 },

  // === 2025-08-23 vs 라이징썬 ===
  { date: "2025-08-23", scorer: "정진교", assist: null, q: 1 },
  { date: "2025-08-23", scorer: "임재환", assist: "이승훈", q: 2 },

  // === 2025-08-30 vs SC 프리덤 ===
  { date: "2025-08-30", scorer: "김태균", assist: null, q: 0 },

  // === 2025-09-20 vs 올림 (라이징썬 in image?) ===
  { date: "2025-09-20", scorer: "임재환", assist: null, q: 0 },
  { date: "2025-09-20", scorer: null, assist: "김태균", q: 0 },

  // === 2025-09-27 vs 올림 ===
  { date: "2025-09-27", scorer: "김태균", assist: null, q: 2 },
  { date: "2025-09-27", scorer: null, assist: "이승훈", q: 0 },

  // === 2025-10-11 vs 라이징썬 === (renamed in DB as 라이징썬)
  { date: "2025-10-11", scorer: null, assist: null, q: 1 },
  { date: "2025-10-11", scorer: null, assist: null, q: 1 },
  { date: "2025-10-11", scorer: "심평강", assist: null, q: 2 },
  { date: "2025-10-11", scorer: null, assist: "김경섭", q: 0 },

  // === 2025-10-25 vs SC 프리덤 ===
  { date: "2025-10-25", scorer: null, assist: null, q: 0 },
  { date: "2025-10-25", scorer: "권용국", assist: "심평강", q: 0 },
  { date: "2025-10-25", scorer: null, assist: "김태균", q: 0 },

  // === 2025-11-01 vs 라이징썬 ===
  { date: "2025-11-01", scorer: null, assist: null, q: 1 },
  { date: "2025-11-01", scorer: "조민", assist: null, q: 3 },

  // === 2025-11-08 vs 올림 ===
  { date: "2025-11-08", scorer: "심평강", assist: null, q: 1 },
  { date: "2025-11-08", scorer: "권용국", assist: "추리건", q: 2 },

  // === 2025-11-15 vs 올림 ===
  { date: "2025-11-15", scorer: "심평강", assist: null, q: 1 },
  { date: "2025-11-15", scorer: null, assist: null, q: 1 },
  { date: "2025-11-15", scorer: "김태균", assist: null, q: 3 },
  { date: "2025-11-15", scorer: null, assist: null, q: 4 },
  { date: "2025-11-15", scorer: null, assist: null, q: 4 },
  { date: "2025-11-15", scorer: null, assist: null, q: 4 },

  // === 2025-11-29 vs 올림 ===
  { date: "2025-11-29", scorer: "심평강", assist: null, q: 1 },
  { date: "2025-11-29", scorer: "김태균", assist: null, q: 0 },

  // === 2025-12-06 vs TOFC ===
  { date: "2025-12-06", scorer: "권용국", assist: null, q: 2 },

  // === 2025-12-13 vs FC발레라 ===
  { date: "2025-12-13", scorer: null, assist: null, q: 1 },
  { date: "2025-12-13", scorer: "김태균", assist: "정영진", q: 2 },
  { date: "2025-12-13", scorer: "정영진", assist: null, q: 2 },

  // === 2025-12-20 vs K-united ===
  { date: "2025-12-20", scorer: "심평강", assist: "윤성연", q: 1 },
  { date: "2025-12-20", scorer: "김태균", assist: "심평강", q: 2 },
  { date: "2025-12-20", scorer: "윤성연", assist: null, q: 3 },

  // === 2025-12-27 vs 프리덤 ===
  { date: "2025-12-27", scorer: "심평강", assist: null, q: 1 },
  { date: "2025-12-27", scorer: null, assist: "임우진", q: 0 },
  { date: "2025-12-27", scorer: "김태균", assist: "이승훈", q: 3 },
  { date: "2025-12-27", scorer: "정진교", assist: "임우진", q: 4 },
  { date: "2025-12-27", scorer: null, assist: null, q: 4 },

  // === 2026-01-03 vs FC청랑 ===
  { date: "2026-01-03", scorer: "심평강", assist: null, q: 1 },
  { date: "2026-01-03", scorer: "최영훈", assist: "임우진", q: 1 },
  { date: "2026-01-03", scorer: null, assist: "윤성연", q: 1 },
  { date: "2026-01-03", scorer: "정창교", assist: "심평강", q: 2 },
  { date: "2026-01-03", scorer: null, assist: "김태균", q: 3 },
  { date: "2026-01-03", scorer: null, assist: null, q: 3 },
  { date: "2026-01-03", scorer: null, assist: null, q: 3 },
  { date: "2026-01-03", scorer: "임우진", assist: null, q: 3 },
  { date: "2026-01-03", scorer: "임우진", assist: null, q: 4 },
  { date: "2026-01-03", scorer: null, assist: "김경섭", q: 4 },
];

async function main() {
  // 1. 팀 멤버 이름→ID 맵 만들기
  const { data: members } = await db.from("team_members").select("id, user_id, pre_name, users(id, name)").eq("team_id", teamId);
  const nameToId = new Map();
  for (const m of members ?? []) {
    const name = m.users?.name ?? m.pre_name;
    const userId = m.users?.id ?? m.id; // user_id가 있으면 user_id, 없으면 team_member.id
    if (name) nameToId.set(name, userId);
  }
  console.log(`멤버 ${nameToId.size}명 로드`);

  // 2. 매치 목록 (date → match)
  const { data: matches } = await db.from("matches").select("id, match_date, opponent_name").eq("team_id", teamId);
  const matchByDate = new Map();
  for (const m of matches ?? []) matchByDate.set(m.match_date, m);
  console.log(`경기 ${matchByDate.size}개 로드`);

  // 3. 날짜별 골 그룹핑
  const goalsByDate = new Map();
  for (const g of goalData) {
    if (!goalsByDate.has(g.date)) goalsByDate.set(g.date, []);
    goalsByDate.get(g.date).push(g);
  }

  // 4. 회장 user_id (recorded_by용)
  const { data: pres } = await db.from("team_members").select("user_id").eq("team_id", teamId).eq("role", "PRESIDENT").limit(1).single();
  const recordedBy = pres?.user_id;

  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const [date, goals] of goalsByDate) {
    const match = matchByDate.get(date);
    if (!match) {
      console.log(`  ⚠️ ${date}: 매치 없음, 건너뜀`);
      totalSkipped += goals.length;
      continue;
    }

    // 기존 골 조회
    const { data: existingGoals } = await db.from("match_goals").select("id, scorer_id, quarter_number").eq("match_id", match.id);
    const teamGoals = (existingGoals ?? []).filter(g => g.scorer_id !== "OPPONENT");
    const opponentGoals = (existingGoals ?? []).filter(g => g.scorer_id === "OPPONENT");

    // 기존 팀 골 삭제 (UNKNOWN 포함)
    if (teamGoals.length > 0) {
      await db.from("match_goals").delete().eq("match_id", match.id).neq("scorer_id", "OPPONENT");
    }

    // 새 팀 골 삽입 (이미지 데이터 기반)
    const newGoals = [];
    for (const g of goals) {
      // scorer가 null이면 UNKNOWN, "용병"/"지인" 등도 UNKNOWN
      let scorerId = "UNKNOWN";
      if (g.scorer) {
        const id = nameToId.get(g.scorer);
        if (id) scorerId = id;
        else {
          // 이름 부분 매칭 시도
          for (const [name, id] of nameToId) {
            if (name.includes(g.scorer) || g.scorer.includes(name)) { scorerId = id; break; }
          }
        }
      }

      let assistId = null;
      if (g.assist) {
        const id = nameToId.get(g.assist);
        if (id) assistId = id;
        else {
          for (const [name, id] of nameToId) {
            if (name.includes(g.assist) || g.assist.includes(name)) { assistId = id; break; }
          }
        }
      }

      newGoals.push({
        match_id: match.id,
        quarter_number: g.q || 0,
        minute: 0,
        scorer_id: scorerId,
        assist_id: assistId,
        is_own_goal: false,
        recorded_by: recordedBy,
      });
    }

    if (newGoals.length > 0) {
      const { error } = await db.from("match_goals").insert(newGoals);
      if (error) {
        console.log(`  ❌ ${date} vs ${match.opponent_name}: ${error.message}`);
      } else {
        const named = newGoals.filter(g => g.scorer_id !== "UNKNOWN").length;
        console.log(`  ✅ ${date} vs ${match.opponent_name}: 팀골 ${newGoals.length}개 (이름확인 ${named}개), 상대골 ${opponentGoals.length}개 유지`);
        totalUpdated += newGoals.length;
      }
    }
  }

  console.log(`\n완료: ${totalUpdated}개 골 업데이트, ${totalSkipped}개 건너뜀`);
}

main().catch(console.error);
