/**
 * FK Rebirth 전경기 스코어 교정 (이미지 기준 정확한 데이터)
 * 기존 골 삭제 후 올바른 쿼터별 득실점으로 재생성
 * 실행: SUPABASE_SERVICE_ROLE_KEY=... node scripts/fix-scores.mjs
 */
import { createClient } from "@supabase/supabase-js";
const SUPABASE_URL = "https://agcmuvjwiydfppjlbhcx.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_KEY) { console.error("SUPABASE_SERVICE_ROLE_KEY 필요"); process.exit(1); }
const db = createClient(SUPABASE_URL, SUPABASE_KEY);
const teamId = "f1678029-1b44-4a80-93fc-0a6036bbaba2";

// 이미지 기준 정확한 데이터 [득,실] per quarter
// 날짜가 같으면 DB 경기를 업데이트, 없으면 신규 생성
const allMatches = [
  { date: "2024-12-14", time: "06:00", loc: "다락원 축구장", opp: "노유 fc", q: [[1,1],[1,0],[0,1],[0,1]] },
  { date: "2024-12-21", time: "10:00", loc: "용마폭포공원 축구장", opp: "SC 프리덤", q: [[1,0],[0,1],[0,1],[0,0]] },
  { date: "2024-12-28", time: "10:00", loc: "노원 마들스타디움", opp: "the ZD FC", q: [[1,1],[1,1],[2,1],[1,1]] },
  { date: "2025-01-04", time: "10:00", loc: "다산체육공원 축구장", opp: "Cantum FC", q: [[0,0],[0,1],[0,1],[1,1]] },
  { date: "2025-01-11", time: "06:00", loc: "하남 종합운동장B구장", opp: "FC WSM", q: [[0,0],[0,0],[0,0],[0,1]] },
  { date: "2025-01-18", time: "11:00", loc: "아차산 배수지", opp: "jsc", q: [[0,2],[0,1],[3,1],[0,2]] },
  { date: "2025-01-25", time: "10:00", loc: "남양주 체육문화센터C구장", opp: "SC 프리덤", q: [[0,2],[0,1],[1,0],[1,1]] },
  { date: "2025-02-01", time: "10:00", loc: "다산체육공원 축구장", opp: "Cantum FC", q: [[0,0],[0,0],[0,1],[0,0]] },
  { date: "2025-02-08", time: "08:00", loc: "다락원 축구장", opp: "라이징썬", q: [[0,1],[1,0],[0,0],[0,0]] },
  { date: "2025-02-15", time: "06:00", loc: "남양주 체육문화센터A구장", opp: "FC WSM", q: [[0,0],[0,0],[1,0],[0,0]] },
  { date: "2025-02-22", time: "10:00", loc: "용마폭포공원 축구장", opp: "SC 프리덤", q: [[0,0],[0,0],[0,0],[1,0]] },
  { date: "2025-03-01", time: "10:00", loc: "다산체육공원 축구장", opp: "Cantum FC", q: [[0,0],[0,1],[0,2],[1,1]] },
  { date: "2025-03-08", time: "10:00", loc: "하남 종합운동장B구장", opp: "라스", q: [[0,1],[0,0],[0,0],[1,3]] },
  { date: "2025-03-15", time: "10:00", loc: "다락원 축구장", opp: "올림", q: [[0,1],[0,1],[0,1],[0,1]] },
  { date: "2025-03-22", time: "10:00", loc: "용마폭포공원 축구장", opp: "SC 프리덤", q: [[1,1],[0,3],[1,2],[0,1]] },
  { date: "2025-03-29", time: "10:00", loc: "노원 불암산스타디움", opp: "노유 fc", q: [[0,1],[0,2],[1,0],[1,2]] },
  { date: "2025-04-05", time: "08:00", loc: "노원 불암산스타디움", opp: "라이징썬", q: [[0,2],[2,1],[0,0],[0,0]] },
  { date: "2025-04-12", time: "12:00", loc: "용마폭포공원 축구장", opp: "SC 프리덤", q: [[1,1],[0,1],[0,0],[0,3]] },
  { date: "2025-04-19", time: "12:00", loc: "용마폭포공원 축구장", opp: "올림", q: [[0,1],[1,0],[0,0],[0,3]] },
  { date: "2025-04-26", time: "10:00", loc: "다락원 축구장", opp: "노유 fc", q: [[0,0],[0,0],[0,0],[0,1]] },
  { date: "2025-05-03", time: "10:00", loc: "노원 불암산스타디움", opp: "예스 fc", q: [[1,0],[0,4],[0,1],[2,1]] },
  { date: "2025-05-10", time: "07:00", loc: "중랑구립잔디구장", opp: "올림", q: [[1,1],[1,3],[1,1],[0,0]] },
  { date: "2025-05-17", time: "10:00", loc: "다산체육공원 축구장", opp: "Cantum FC", q: [[1,1],[1,2],[0,0],[0,3]] },
  { date: "2025-05-24", time: "10:00", loc: "노원 마들스타디움", opp: "라이징썬", q: [[0,0],[0,0],[0,0],[2,0]] },
  { date: "2025-05-31", time: "10:00", loc: "노원 불암산스타디움", opp: "노유 fc", q: [[0,1],[0,1],[0,3],[0,1]] },
  { date: "2025-06-07", time: "10:00", loc: "용마폭포공원 축구장", opp: "SC 프리덤", q: [[0,1],[1,0],[1,2],[0,0]] },
  { date: "2025-06-14", time: "08:00", loc: "다락원 축구장", opp: "올림", q: [[0,2],[0,2],[1,2],[1,1]] },
  { date: "2025-06-21", time: "08:00", loc: "다락원 축구장", opp: "라이징썬", q: [[1,2],[1,2],[2,2],[0,2]] },
  { date: "2025-06-28", time: "10:00", loc: "용마폭포공원 축구장", opp: "SC 프리덤", q: [[2,2],[0,3],[1,2],[0,0]] },
  { date: "2025-07-05", time: "06:00", loc: "용마폭포공원 축구장", opp: "올림", q: [[0,1],[1,2],[0,1],[0,3]] },
  // 2025-07-12 휴식 → 건너뜀
  { date: "2025-07-19", time: "10:00", loc: "용마폭포공원 축구장", opp: "SC 프리덤", q: [[1,1],[0,0],[0,1],[0,1]] },
  { date: "2025-07-26", time: "08:00", loc: "노원 불암산스타디움", opp: "라이징썬", q: [[0,1],[0,4],[0,0],[0,0]] },
  { date: "2025-08-02", time: "08:00", loc: "노원 불암산스타디움", opp: "라이징썬", q: [[0,0],[0,1],[0,0],[1,2]] },
  { date: "2025-08-09", time: "08:00", loc: "용마폭포공원 축구장", opp: "SC 프리덤", q: [[2,1],[0,0],[0,2],[1,0]] },
  { date: "2025-08-16", time: "07:00", loc: "중랑구립잔디구장", opp: "올림", q: [[1,0],[0,0],[0,1],[3,1]] },
  { date: "2025-08-23", time: "08:00", loc: "노원 불암산스타디움", opp: "라이징썬", q: [[1,1],[0,0],[1,2],[0,0]] },
  { date: "2025-08-30", time: "10:00", loc: "용마폭포공원 축구장", opp: "SC 프리덤", q: [[1,0],[0,2],[0,0],[1,3]] },
  { date: "2025-09-06", time: "08:00", loc: "다락원 축구장", opp: "운백fc", q: [[0,1],[0,1],[0,1],[0,2]] },
  { date: "2025-09-13", time: "10:00", loc: "노원 마들스타디움", opp: "fc성소", q: [[0,1],[0,0],[0,0],[0,2]] },
  { date: "2025-09-20", time: "06:00", loc: "노원 불암산스타디움", opp: "라이징썬", q: [[1,0],[0,2],[0,1],[2,1]] },
  { date: "2025-09-27", time: "07:00", loc: "중랑구립잔디구장", opp: "올림", q: [[0,1],[2,0],[0,1],[0,0]] },
  { date: "2025-10-04", time: "06:00", loc: "다락원 축구장", opp: "라이징썬", q: [[0,2],[0,0],[0,0],[0,0]] },
  { date: "2025-10-11", time: "08:00", loc: "노원 불암산스타디움", opp: "라이징썬", q: [[2,0],[1,0],[1,2],[1,1]] },
  { date: "2025-10-18", time: "07:00", loc: "중랑구립잔디구장", opp: "자체전", q: [[0,0],[0,0],[0,0],[0,0]] },
  { date: "2025-10-25", time: "10:00", loc: "남양주 체육문화센터B구장", opp: "SC 프리덤", q: [[0,1],[1,3],[1,2],[1,1]] },
  { date: "2025-11-01", time: "08:00", loc: "다락원 축구장", opp: "라이징썬", q: [[0,3],[0,1],[1,1],[1,1]] },
  { date: "2025-11-08", time: "06:00", loc: "다락원 축구장", opp: "올림", q: [[1,0],[1,3],[0,1],[0,0]] },
  { date: "2025-11-15", time: "07:00", loc: "중랑구립잔디구장", opp: "올림", q: [[1,1],[0,2],[1,0],[4,0]] },
  // 2025-11-22 휴식 → 건너뜀
  { date: "2025-11-29", time: "08:00", loc: "다락원 축구장", opp: "올림", q: [[1,0],[0,1],[0,0],[0,4]] },
  { date: "2025-12-06", time: "08:00", loc: "불암산축구장", opp: "TOFC", q: [[0,1],[1,0],[0,0],[0,1]] },
  { date: "2025-12-13", time: "07:00", loc: "중랑구립축구장", opp: "FC발레라", q: [[1,1],[2,1],[0,2],[0,1]] },
  { date: "2025-12-20", time: "08:00", loc: "다락원축구장", opp: "K-united", q: [[1,0],[1,0],[1,0],[1,0]] },
  { date: "2025-12-27", time: "08:00", loc: "용마폭포축구장", opp: "프리덤", q: [[0,2],[2,0],[1,0],[2,4]] },
  { date: "2026-01-03", time: "08:00", loc: "다락원축구장", opp: "FC청랑", q: [[3,1],[1,1],[4,0],[1,0]] },
  { date: "2026-01-10", time: "10:00", loc: "불암산축구장", opp: "라이징썬", q: [[0,1],[0,0],[0,1],[4,1]] },
  { date: "2026-01-17", time: "10:00", loc: "용마폭포축구장", opp: "라이징썬", q: [[0,2],[0,0],[2,1],[0,2]] },
  { date: "2026-01-31", time: "07:00", loc: "중랑구립축구장", opp: "NINE:N FC", q: [[1,1],[1,2],[0,3],[2,2]] },
  { date: "2026-02-07", time: "10:00", loc: "불암산축구장", opp: "올림", q: [[0,0],[2,3],[0,4],[1,2]] },
  { date: "2026-02-14", time: "10:00", loc: "용마폭포축구장", opp: "프리덤", q: [[1,1],[2,0],[0,3],[0,1]] },
  { date: "2026-02-21", time: "07:00", loc: "중랑구립축구장", opp: "NINE:N FC", q: [[0,2],[0,0],[0,0],[0,3]] },
  { date: "2026-02-28", time: "10:00", loc: "용마폭포축구장", opp: "프리덤", q: [[0,0],[0,2],[0,0],[1,3]] },
  { date: "2026-03-07", time: "10:00", loc: "다산축구장", opp: "센텀", q: [[0,2],[1,1],[0,3],[0,2]] },
  { date: "2026-03-14", time: "10:00", loc: "남양주축구장C", opp: "프리덤", q: [[1,0],[0,0],[0,0],[0,0]] },
];

async function main() {
  // 시즌 조회
  const { data: seasons } = await db.from("seasons").select("id, name, start_date, end_date").eq("team_id", teamId);
  function findSeason(date) {
    for (const s of seasons ?? []) {
      if (date >= s.start_date && date <= s.end_date) return s;
    }
    return seasons?.[0];
  }

  const { data: pres } = await db.from("team_members").select("user_id").eq("team_id", teamId).eq("role", "PRESIDENT").limit(1).single();
  const recordedBy = pres?.user_id;

  // 기존 경기 조회
  const { data: existingMatches } = await db.from("matches").select("id, match_date, opponent_name").eq("team_id", teamId);
  const matchByDate = new Map();
  for (const m of existingMatches ?? []) matchByDate.set(m.match_date, m);

  // 기존에 이름 있는 골 백업 (매치별)
  const namedGoalsMap = new Map();
  for (const m of existingMatches ?? []) {
    const { data: goals } = await db.from("match_goals").select("*").eq("match_id", m.id);
    const named = (goals ?? []).filter(g => g.scorer_id !== "UNKNOWN" && g.scorer_id !== "OPPONENT");
    if (named.length > 0) namedGoalsMap.set(m.match_date, named);
  }

  let created = 0, updated = 0, unchanged = 0;

  for (const m of allMatches) {
    const totalFor = m.q.reduce((s, q) => s + q[0], 0);
    const totalAgainst = m.q.reduce((s, q) => s + q[1], 0);
    const result = totalFor > totalAgainst ? "승" : totalFor < totalAgainst ? "패" : "무";
    const season = findSeason(m.date);

    const existing = matchByDate.get(m.date);

    if (existing) {
      // 기존 경기: 골 삭제 후 재생성
      const { data: curGoals } = await db.from("match_goals").select("scorer_id").eq("match_id", existing.id);
      const curFor = (curGoals ?? []).filter(g => g.scorer_id !== "OPPONENT").length;
      const curAgainst = (curGoals ?? []).filter(g => g.scorer_id === "OPPONENT").length;

      if (curFor === totalFor && curAgainst === totalAgainst) {
        unchanged++;
        continue;
      }

      // 상대 이름 업데이트 (달라진 경우)
      if (existing.opponent_name !== m.opp) {
        await db.from("matches").update({ opponent_name: m.opp, location: m.loc }).eq("id", existing.id);
      }

      // 골 삭제
      await db.from("match_goals").delete().eq("match_id", existing.id);

      // 이름 있는 골 복원 시도
      const namedGoals = namedGoalsMap.get(m.date) ?? [];

      const newGoals = [];
      let namedIdx = 0;
      for (let qi = 0; qi < m.q.length; qi++) {
        const [gf, ga] = m.q[qi];
        const quarter = qi + 1;

        for (let g = 0; g < gf; g++) {
          // 이름 있는 골 재활용
          if (namedIdx < namedGoals.length) {
            const ng = namedGoals[namedIdx++];
            newGoals.push({ match_id: existing.id, quarter_number: quarter, minute: 0, scorer_id: ng.scorer_id, assist_id: ng.assist_id, is_own_goal: false, recorded_by: recordedBy });
          } else {
            newGoals.push({ match_id: existing.id, quarter_number: quarter, minute: 0, scorer_id: "UNKNOWN", assist_id: null, is_own_goal: false, recorded_by: recordedBy });
          }
        }
        for (let g = 0; g < ga; g++) {
          newGoals.push({ match_id: existing.id, quarter_number: quarter, minute: 0, scorer_id: "OPPONENT", assist_id: null, is_own_goal: false, recorded_by: recordedBy });
        }
      }

      if (newGoals.length > 0) await db.from("match_goals").insert(newGoals);
      console.log(`  ↻ ${m.date} vs ${m.opp}: ${curFor}:${curAgainst} → ${totalFor}:${totalAgainst} (${result})`);
      updated++;
    } else {
      // 신규 경기
      const { data: match, error } = await db.from("matches").insert({
        team_id: teamId,
        season_id: season?.id ?? null,
        opponent_name: m.opp,
        match_date: m.date,
        match_time: m.time,
        location: m.loc,
        quarter_count: m.q.length,
        quarter_duration: 25,
        break_duration: 5,
        player_count: 11,
        status: "COMPLETED",
      }).select("id").single();

      if (error) { console.log(`  ❌ ${m.date}: ${error.message}`); continue; }

      const newGoals = [];
      for (let qi = 0; qi < m.q.length; qi++) {
        const [gf, ga] = m.q[qi];
        for (let g = 0; g < gf; g++) newGoals.push({ match_id: match.id, quarter_number: qi + 1, minute: 0, scorer_id: "UNKNOWN", assist_id: null, is_own_goal: false, recorded_by: recordedBy });
        for (let g = 0; g < ga; g++) newGoals.push({ match_id: match.id, quarter_number: qi + 1, minute: 0, scorer_id: "OPPONENT", assist_id: null, is_own_goal: false, recorded_by: recordedBy });
      }

      if (newGoals.length > 0) await db.from("match_goals").insert(newGoals);
      console.log(`  + ${m.date} vs ${m.opp}: ${totalFor}:${totalAgainst} (${result}) [신규]`);
      created++;
    }
  }

  console.log(`\n완료: ${created}개 신규, ${updated}개 수정, ${unchanged}개 변경없음`);
}

main().catch(console.error);
