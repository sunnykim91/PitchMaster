/**
 * FK Rebirth 2025년 경기 데이터 시드
 * 실행: SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-matches-2025.mjs
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://agcmuvjwiydfppjlbhcx.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_KEY) { console.error("SUPABASE_SERVICE_ROLE_KEY 필요"); process.exit(1); }
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

const matches = [
  { date: "2024-12-14", time: "06:00", location: "다락원 축구장",           opponent: "노유 fc",     q: [[1,1],[1,1],[0,1],[0,1]] },
  { date: "2024-12-21", time: "10:00", location: "용마폭포공원 축구장",     opponent: "SC 프리덤",    q: [[1,0],[1,0],[1,0],[0,1]] },
  { date: "2024-12-28", time: "10:00", location: "노원 마들스타디움",       opponent: "the ZD FC",    q: [[1,1],[2,1],[2,0],[1,1]] },
  { date: "2025-01-04", time: "10:00", location: "다산체육공원 축구장",     opponent: "Cantum FC",    q: [[0,0],[0,1],[0,1],[1,1]] },
  { date: "2025-01-11", time: "06:00", location: "하남 종합운동장B구장",    opponent: "FC WSM",       q: [[0,0],[0,0],[0,1],[0,0]] },
  { date: "2025-01-18", time: "11:00", location: "이찬산 배수지",           opponent: "jsc",          q: [[0,0],[0,0],[3,1],[0,2]] },
  { date: "2025-01-25", time: "10:00", location: "남양주 체육문화센터C구장", opponent: "SC 프리덤",   q: [[0,2],[0,0],[2,1],[0,1]] },
  { date: "2025-02-01", time: "10:00", location: "다산체육공원 축구장",     opponent: "Cantum FC",    q: [[0,0],[1,0],[0,1],[0,0]] },
  { date: "2025-02-08", time: "08:00", location: "다락원 축구장",           opponent: "라이징썬",     q: [[0,1],[0,0],[0,0],[0,3]] },
  { date: "2025-02-15", time: "06:00", location: "남양주 체육문화센터A구장", opponent: "FC WSM",      q: [[0,0],[0,0],[1,0],[0,0]] },
  { date: "2025-02-22", time: "10:00", location: "용마폭포공원 축구장",     opponent: "SC 프리덤",    q: [[0,0],[1,0],[0,1],[0,0]] },
  { date: "2025-03-01", time: "10:00", location: "다산체육공원 축구장",     opponent: "Cantum FC",    q: [[0,0],[0,0],[0,0],[0,0]] },
  { date: "2025-03-15", time: "10:00", location: "다락원 축구장",           opponent: "올림",         q: [[0,0],[0,1],[0,1],[0,0]] },
  { date: "2025-03-22", time: "10:00", location: "용마폭포공원 축구장",     opponent: "SC 프리덤",    q: [[1,1],[0,3],[1,2],[0,1]] },
  { date: "2025-03-29", time: "10:00", location: "노원 불암산스타디움",     opponent: "노유 fc",      q: [[0,1],[0,0],[0,1],[0,2]] },
  { date: "2025-04-05", time: "08:00", location: "노원 불암산스타디움",     opponent: "라이징썬",     q: [[0,2],[2,1],[0,0],[0,0]] },
  { date: "2025-04-12", time: "12:00", location: "용마폭포공원 축구장",     opponent: "SC 프리덤",    q: [[1,0],[1,0],[0,0],[0,3]] },
  { date: "2025-04-19", time: "12:00", location: "용마폭포공원 축구장",     opponent: "올림",         q: [[0,1],[1,0],[0,0],[0,0]] },
  { date: "2025-04-26", time: "10:00", location: "다락원 축구장",           opponent: "노유 fc",      q: [[0,0],[0,0],[0,0],[0,0]] },
  { date: "2025-05-03", time: "10:00", location: "노원 불암산스타디움",     opponent: "에스 fc",      q: [[0,1],[0,0],[4,0],[1,2]] },
  { date: "2025-05-10", time: "07:00", location: "중랑구립잔디구장",        opponent: "올림",         q: [[1,3],[1,1],[0,1],[0,1]] },
  { date: "2025-05-17", time: "10:00", location: "다산체육공원 축구장",     opponent: "Cantum FC",    q: [[1,0],[1,1],[2,0],[0,0]] },
  { date: "2025-05-24", time: "10:00", location: "노원 마들스타디움",       opponent: "라이징썬",     q: [[0,0],[0,0],[0,0],[0,3]] },
  { date: "2025-05-31", time: "10:00", location: "노원 불암산스타디움",     opponent: "올림",         q: [[0,1],[0,0],[1,0],[3,0]] },
  { date: "2025-06-07", time: "10:00", location: "용마폭포공원 축구장",     opponent: "SC 프리덤",    q: [[0,1],[1,4],[0,1],[0,0]] },
  { date: "2025-06-14", time: "08:00", location: "다락원 축구장",           opponent: "올림",         q: [[0,2],[0,0],[2,1],[1,2],[1,1]] },
  { date: "2025-06-21", time: "08:00", location: "다락원 축구장",           opponent: "라이징썬",     q: [[1,2],[1,2],[2,2],[2,2]] },
  { date: "2025-06-28", time: "10:00", location: "용마폭포공원 축구장",     opponent: "SC 프리덤",    q: [[2,0],[0,3],[1,0],[2,0]] },
  { date: "2025-07-05", time: "10:00", location: "용마폭포공원 축구장",     opponent: "올림",         q: [[0,1],[1,2],[0,1],[0,3]] },
  { date: "2025-07-19", time: "10:00", location: "용마폭포공원 축구장",     opponent: "SC 프리덤",    q: [[0,1],[0,0],[0,0],[1,0]] },
  { date: "2025-07-26", time: "08:00", location: "노원 불암산스타디움",     opponent: "라이징썬",     q: [[0,1],[0,0],[0,0],[1,0]] },
  { date: "2025-08-02", time: "08:00", location: "노원 불암산스타디움",     opponent: "라이징썬",     q: [[0,2],[0,1],[0,0],[0,0]] },
  { date: "2025-08-09", time: "10:00", location: "용마폭포공원 축구장",     opponent: "SC 프리덤",    q: [[0,1],[0,0],[0,0],[0,1]] },
  { date: "2025-08-16", time: "07:00", location: "중랑구립잔디구장",        opponent: "올림",         q: [[1,1],[0,0],[1,0],[0,0]] },
  { date: "2025-08-23", time: "10:00", location: "노원 불암산스타디움",     opponent: "라이징썬",     q: [[1,2],[0,0],[1,2],[0,0]] },
  { date: "2025-08-30", time: "10:00", location: "용마폭포공원 축구장",     opponent: "SC 프리덤",    q: [[1,1],[0,1],[0,0],[0,2]] },
  { date: "2025-09-06", time: "08:00", location: "다락원 축구장",           opponent: "운백fc",       q: [[0,1],[0,1],[0,1],[0,2]] },
  { date: "2025-09-13", time: "10:00", location: "노원 마들스타디움",       opponent: "fc성소",       q: [[0,1],[0,0],[0,0],[0,0]] },
  { date: "2025-09-20", time: "08:00", location: "노원 불암산스타디움",     opponent: "올림",         q: [[0,0],[0,2],[0,0],[0,1]] },
  { date: "2025-09-27", time: "07:00", location: "중랑구립잔디구장",        opponent: "올림",         q: [[0,0],[0,1],[0,2],[0,0]] },
  { date: "2025-10-04", time: "06:00", location: "다락원 축구장",           opponent: "라이징썬",     q: [[0,2],[0,0],[0,0],[0,0]] },
  { date: "2025-10-11", time: "08:00", location: "노원 불암산스타디움",     opponent: "라이징썬",     q: [[2,0],[1,0],[0,2],[1,1]] },
  { date: "2025-10-18", time: "07:00", location: "중랑구립잔디구장",        opponent: "자체전",       q: [[0,0],[0,0],[0,0],[0,0]] },
  { date: "2025-10-25", time: "10:00", location: "남양주 체육문화센터B구장", opponent: "SC 프리덤",   q: [[0,1],[1,3],[0,0],[0,1]] },
  { date: "2025-11-01", time: "08:00", location: "다락원 축구장",           opponent: "라이징썬",     q: [[1,3],[0,1],[1,2],[0,0]] },
  { date: "2025-11-08", time: "06:00", location: "다락원 축구장",           opponent: "올림",         q: [[1,0],[1,3],[0,1],[0,0]] },
  { date: "2025-11-15", time: "07:00", location: "중랑구립잔디구장",        opponent: "올림",         q: [[1,1],[0,2],[1,0],[4,0]] },
  { date: "2025-11-29", time: "08:00", location: "다락원 축구장",           opponent: "올림",         q: [[1,0],[1,0],[0,0],[0,4]] },
];

async function main() {
  const { data: teams } = await db.from("teams").select("id, name");
  const team = teams.find((t) => t.name === "FK Rebirth");
  if (!team) { console.error("FK Rebirth 팀을 찾을 수 없습니다."); return; }
  console.log(`팀: ${team.name} (${team.id})`);

  // 시즌 찾기 (2025년 시즌이 없으면 생성)
  let { data: seasons } = await db.from("seasons").select("id, name").eq("team_id", team.id);
  let season = seasons?.find((s) => s.name.includes("2025") || s.name.includes("하반기"));

  if (!season) {
    // 2025 시즌 2개 생성
    const { data: s1 } = await db.from("seasons").insert({
      team_id: team.id, name: "2024 하반기", start_date: "2024-07-01", end_date: "2024-12-31", is_active: false,
    }).select("id, name").single();
    const { data: s2 } = await db.from("seasons").insert({
      team_id: team.id, name: "2025 상반기", start_date: "2025-01-01", end_date: "2025-06-30", is_active: false,
    }).select("id, name").single();
    const { data: s3 } = await db.from("seasons").insert({
      team_id: team.id, name: "2025 하반기", start_date: "2025-07-01", end_date: "2025-12-31", is_active: false,
    }).select("id, name").single();
    console.log(`시즌 생성: ${s1?.name}, ${s2?.name}, ${s3?.name}`);
    seasons = [s1, s2, s3].filter(Boolean);
  }

  // 경기 날짜에 맞는 시즌 찾기
  function findSeason(date) {
    const d = new Date(date);
    for (const s of seasons ?? []) {
      // 이름에서 연도와 반기 추출
      if (s.name.includes("2024 하반기") && d >= new Date("2024-07-01") && d <= new Date("2024-12-31")) return s;
      if (s.name.includes("2025 상반기") && d >= new Date("2025-01-01") && d <= new Date("2025-06-30")) return s;
      if (s.name.includes("2025 하반기") && d >= new Date("2025-07-01") && d <= new Date("2025-12-31")) return s;
      if (s.name.includes("2026 상반기") && d >= new Date("2026-01-01") && d <= new Date("2026-06-30")) return s;
    }
    return seasons?.[0];
  }

  const { data: president } = await db.from("team_members").select("user_id").eq("team_id", team.id).eq("role", "PRESIDENT").limit(1).single();
  const recordedBy = president?.user_id;

  // 중복 체크
  const { data: existing } = await db.from("matches").select("match_date, opponent_name").eq("team_id", team.id);
  const existingSet = new Set((existing ?? []).map((m) => `${m.match_date}_${m.opponent_name}`));

  let created = 0, skipped = 0;

  for (const m of matches) {
    if (existingSet.has(`${m.date}_${m.opponent}`)) {
      console.log(`  건너뜀: ${m.date} vs ${m.opponent}`);
      skipped++;
      continue;
    }

    const season = findSeason(m.date);
    const { data: match, error } = await db.from("matches").insert({
      team_id: team.id,
      season_id: season?.id ?? null,
      opponent_name: m.opponent,
      match_date: m.date,
      match_time: m.time,
      location: m.location,
      quarter_count: m.q.length,
      quarter_duration: 25,
      break_duration: 5,
      player_count: 11,
      status: "COMPLETED",
    }).select("id").single();

    if (error) { console.error(`  실패: ${m.date} — ${error.message}`); continue; }

    const goals = [];
    for (let qi = 0; qi < m.q.length; qi++) {
      const [gf, ga] = m.q[qi];
      for (let g = 0; g < gf; g++) goals.push({ match_id: match.id, quarter_number: qi + 1, minute: 0, scorer_id: "UNKNOWN", assist_id: null, is_own_goal: false, recorded_by: recordedBy });
      for (let g = 0; g < ga; g++) goals.push({ match_id: match.id, quarter_number: qi + 1, minute: 0, scorer_id: "OPPONENT", assist_id: null, is_own_goal: false, recorded_by: recordedBy });
    }

    if (goals.length > 0) await db.from("match_goals").insert(goals);

    const tf = m.q.reduce((s, q) => s + q[0], 0);
    const ta = m.q.reduce((s, q) => s + q[1], 0);
    const r = tf > ta ? "승" : tf < ta ? "패" : "무";
    console.log(`  ✅ ${m.date} vs ${m.opponent}: ${tf}-${ta} (${r})`);
    created++;
  }

  console.log(`\n완료: ${created}개 생성, ${skipped}개 건너뜀`);
}

main().catch(console.error);
