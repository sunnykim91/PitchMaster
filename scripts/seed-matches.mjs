/**
 * 리버스 팀 경기 데이터 시드 스크립트
 * 실행: node scripts/seed-matches.mjs
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://agcmuvjwiydfppjlbhcx.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  console.error("SUPABASE_SERVICE_ROLE_KEY 환경변수를 설정하세요.");
  console.error("예: SUPABASE_SERVICE_ROLE_KEY=eyJ... node scripts/seed-matches.mjs");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// 경기 데이터 (스프레드시트 기준)
const matches = [
  { date: "2025-12-06", time: "08:00", location: "불암산축구장",   opponent: "TOFC",       q: [[0,1],[1,0],[0,0],[0,1]] },
  { date: "2025-12-13", time: "07:00", location: "중랑구립축구장", opponent: "FC발레라",    q: [[1,1],[2,1],[0,2],[0,1]] },
  { date: "2025-12-20", time: "08:00", location: "다락원축구장",   opponent: "K-united",    q: [[1,0],[1,0],[0,1],[1,0]] },
  { date: "2025-12-27", time: "08:00", location: "용마폭포축구장", opponent: "프리덤",      q: [[0,2],[2,0],[1,0],[2,4]] },
  { date: "2026-01-03", time: "08:00", location: "다락원축구장",   opponent: "FC청랑",      q: [[3,1],[1,1],[4,0],[1,0]] },
  { date: "2026-01-10", time: "10:00", location: "불암산축구장",   opponent: "라이징썬",    q: [[0,1],[0,0],[0,0],[1,4]] },
  { date: "2026-01-17", time: "10:00", location: "용마폭포축구장", opponent: "라이징썬",    q: [[0,2],[0,0],[2,1],[0,2]] },
  // 2026-01-24 경기 없음 (빈 행)
  { date: "2026-01-31", time: "07:00", location: "중랑구립축구장", opponent: "NINE:N FC",   q: [[1,1],[1,2],[0,3],[2,2]] },
  { date: "2026-02-07", time: "10:00", location: "불암산축구장",   opponent: "올림",        q: [[0,0],[2,3],[0,4],[1,2]] },
  { date: "2026-02-14", time: "10:00", location: "용마폭포축구장", opponent: "프리덤",      q: [[1,1],[2,0],[0,3],[0,1]] },
  { date: "2026-02-21", time: "07:00", location: "중랑구립축구장", opponent: "NINE:N FC",   q: [[0,2],[0,0],[0,0],[0,3]] },
  { date: "2026-02-28", time: "10:00", location: "용마폭포축구장", opponent: "프리덤",      q: [[0,0],[0,2],[0,0],[1,3]] },
  { date: "2026-03-07", time: "10:00", location: "다산축구장",     opponent: "센텀",        q: [[0,2],[1,1],[0,3],[0,2]] },
  { date: "2026-03-14", time: "10:00", location: "남양주축구장C",  opponent: "프리덤",      q: [[1,0],[0,0],[0,0],[0,0]] },
];

async function main() {
  // 1. 팀 찾기
  const { data: teams } = await db.from("teams").select("id, name");
  if (!teams?.length) { console.error("팀이 없습니다."); return; }

  console.log("팀 목록:");
  teams.forEach((t, i) => console.log(`  ${i}: ${t.name} (${t.id})`));

  // FK Rebirth 팀 사용
  const team = teams.find((t) => t.name === "FK Rebirth") || teams[0];
  console.log(`\n사용할 팀: ${team.name}`);

  // 2. 활성 시즌 찾기
  const { data: seasons } = await db.from("seasons").select("id, name").eq("team_id", team.id);
  const season = seasons?.[0];
  console.log(`시즌: ${season?.name ?? "(없음)"}`);

  // 3. 회장 user_id 찾기 (recorded_by용)
  const { data: president } = await db
    .from("team_members")
    .select("user_id")
    .eq("team_id", team.id)
    .eq("role", "PRESIDENT")
    .limit(1)
    .single();
  const recordedBy = president?.user_id;
  console.log(`기록자: ${recordedBy}`);

  // 4. 기존 경기와 중복 체크
  const { data: existingMatches } = await db
    .from("matches")
    .select("match_date, opponent_name")
    .eq("team_id", team.id);
  const existingSet = new Set(
    (existingMatches ?? []).map((m) => `${m.match_date}_${m.opponent_name}`)
  );

  let created = 0;
  let skipped = 0;

  for (const m of matches) {
    const key = `${m.date}_${m.opponent}`;
    if (existingSet.has(key)) {
      console.log(`  건너뜀 (이미 존재): ${m.date} vs ${m.opponent}`);
      skipped++;
      continue;
    }

    // 5. 경기 생성 (COMPLETED 상태)
    const { data: match, error: matchErr } = await db
      .from("matches")
      .insert({
        team_id: team.id,
        season_id: season?.id ?? null,
        opponent_name: m.opponent,
        match_date: m.date,
        match_time: m.time,
        location: m.location,
        quarter_count: 4,
        quarter_duration: 25,
        break_duration: 5,
        player_count: 11,
        status: "COMPLETED",
      })
      .select("id")
      .single();

    if (matchErr) {
      console.error(`  실패: ${m.date} vs ${m.opponent} — ${matchErr.message}`);
      continue;
    }

    // 6. 쿼터별 득점/실점 기록
    const goals = [];
    for (let qi = 0; qi < m.q.length; qi++) {
      const [goalsFor, goalsAgainst] = m.q[qi];
      const quarter = qi + 1;

      // 우리팀 득점 (scorer: UNKNOWN)
      for (let g = 0; g < goalsFor; g++) {
        goals.push({
          match_id: match.id,
          quarter_number: quarter,
          minute: 0,
          scorer_id: "UNKNOWN",
          assist_id: null,
          is_own_goal: false,
          recorded_by: recordedBy,
        });
      }

      // 상대팀 득점 (scorer: OPPONENT)
      for (let g = 0; g < goalsAgainst; g++) {
        goals.push({
          match_id: match.id,
          quarter_number: quarter,
          minute: 0,
          scorer_id: "OPPONENT",
          assist_id: null,
          is_own_goal: false,
          recorded_by: recordedBy,
        });
      }
    }

    if (goals.length > 0) {
      const { error: goalsErr } = await db.from("match_goals").insert(goals);
      if (goalsErr) {
        console.error(`  골 기록 실패: ${m.date} — ${goalsErr.message}`);
      }
    }

    const totalFor = m.q.reduce((s, q) => s + q[0], 0);
    const totalAgainst = m.q.reduce((s, q) => s + q[1], 0);
    const result = totalFor > totalAgainst ? "승" : totalFor < totalAgainst ? "패" : "무";
    console.log(`  ✅ ${m.date} vs ${m.opponent}: ${totalFor}-${totalAgainst} (${result}) — 골 ${goals.length}개`);
    created++;
  }

  console.log(`\n완료: ${created}개 생성, ${skipped}개 건너뜀`);
}

main().catch(console.error);
