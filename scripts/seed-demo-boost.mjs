/**
 * FC DEMO 팀 데이터 보강 스크립트
 * - 멤버 이름 현실적으로 변경 + 등번호 부여
 * - 추가 예정 경기 생성
 * - 게시판 투표 글 추가
 * 실행: node scripts/seed-demo-boost.mjs
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

const DEMO_TEAM = "192127c0-e2be-46b4-b340-7583730467da";

// 현실적인 이름 + 등번호 매핑
const MEMBER_UPDATES = [
  { currentName: "김피치", newName: "김민수", jersey: 10, role: "CAPTAIN" },
  { currentName: "박골키", newName: "박준호", jersey: 1, role: null },
  { currentName: "이수비", newName: "이재원", jersey: 4, role: null },
  { currentName: "최좌백", newName: "최성진", jersey: 3, role: null },
  { currentName: "장우백", newName: "장동혁", jersey: 2, role: null },
  { currentName: "김수미", newName: "김태호", jersey: 6, role: "VICE_CAPTAIN" },
  { currentName: "정공미", newName: "정우성", jersey: 8, role: null },
  { currentName: "한좌윙", newName: "한승우", jersey: 11, role: null },
  { currentName: "오우윙", newName: "오세훈", jersey: 7, role: null },
  { currentName: "신스트", newName: "신민혁", jersey: 9, role: null },
  { currentName: "임골키", newName: "임현우", jersey: 21, role: null },
  { currentName: "강센백", newName: "강준서", jersey: 5, role: null },
  { currentName: "윤미드", newName: "윤석현", jersey: 14, role: null },
  { currentName: "서공격", newName: "서진우", jersey: 17, role: null },
  { currentName: "문수비", newName: "문정훈", jersey: 15, role: null },
];

async function main() {
  console.log("=== FC DEMO 데이터 보강 시작 ===\n");

  // 1. 멤버 이름 변경 + 등번호 부여
  console.log("[1/3] 멤버 이름 + 등번호 업데이트...");
  const { data: members } = await db
    .from("team_members")
    .select("id, user_id, users(id, name)")
    .eq("team_id", DEMO_TEAM);

  for (const update of MEMBER_UPDATES) {
    const member = members?.find((m) => {
      const user = Array.isArray(m.users) ? m.users[0] : m.users;
      return user?.name === update.currentName;
    });
    if (!member) {
      console.log(`  ⚠️ ${update.currentName} 못 찾음`);
      continue;
    }
    const user = Array.isArray(member.users) ? member.users[0] : member.users;

    // users 테이블 이름 변경
    if (user?.id) {
      await db.from("users").update({ name: update.newName }).eq("id", user.id);
    }

    // team_members 등번호 + 팀역할
    const memberUpdate = { jersey_number: update.jersey };
    if (update.role) memberUpdate.team_role = update.role;
    await db.from("team_members").update(memberUpdate).eq("id", member.id);

    console.log(`  ✅ ${update.currentName} → ${update.newName} #${update.jersey}${update.role ? ` (${update.role})` : ""}`);
  }

  // 2. 추가 예정 경기 (4/9, 4/16, 4/23)
  console.log("\n[2/3] 예정 경기 추가...");
  const demoUser = members?.find((m) => {
    const user = Array.isArray(m.users) ? m.users[0] : m.users;
    return user?.name === "김민수" || user?.name === "김피치";
  });
  const createdBy = demoUser?.user_id;

  const newMatches = [
    { date: "2026-04-09", time: "20:00", endTime: "22:00", location: "잠실종합운동장", opponent: "올스타즈" },
    { date: "2026-04-16", time: "19:00", endTime: "21:00", location: "월드컵공원 풋살장", opponent: "시티FC" },
    { date: "2026-04-23", time: "08:00", endTime: "10:00", location: "양재시민의숲", opponent: "유나이티드" },
  ];

  for (const m of newMatches) {
    const { data, error } = await db.from("matches").insert({
      team_id: DEMO_TEAM,
      season_id: "d013b089-959a-4821-8b4b-a06f5e2089d0",
      opponent_name: m.opponent,
      match_date: m.date,
      match_time: m.time,
      match_end_time: m.endTime,
      location: m.location,
      quarter_count: 4,
      quarter_duration: 25,
      break_duration: 5,
      player_count: 11,
      status: "SCHEDULED",
      match_type: "REGULAR",
      stats_included: true,
      uniform_type: "HOME",
      created_by: createdBy,
      vote_deadline: m.date.replace(/(\d+)$/, (d) => String(Number(d) - 1).padStart(2, "0")) + "T17:00:00+09:00",
    }).select("id").single();

    if (error) {
      console.log(`  ❌ ${m.date}: ${error.message}`);
    } else {
      console.log(`  ✅ ${m.date} vs ${m.opponent} @ ${m.location}`);

      // 랜덤 투표 추가 (8~12명)
      const activeMembers = members?.filter((mb) => mb.id !== demoUser?.id) ?? [];
      const shuffled = activeMembers.sort(() => Math.random() - 0.5);
      const voteCount = 8 + Math.floor(Math.random() * 5);
      const voters = shuffled.slice(0, Math.min(voteCount, shuffled.length));

      const attendanceRows = voters.map((mb, i) => ({
        match_id: data.id,
        user_id: mb.user_id,
        member_id: mb.id,
        vote: i < Math.floor(voteCount * 0.6) ? "ATTEND" : i < Math.floor(voteCount * 0.85) ? "ABSENT" : "MAYBE",
      }));

      // 데모 유저 본인도 참석 투표
      attendanceRows.push({
        match_id: data.id,
        user_id: createdBy,
        member_id: demoUser?.id,
        vote: "ATTEND",
      });

      await db.from("match_attendance").insert(attendanceRows);
      console.log(`     투표 ${attendanceRows.length}명`);
    }
  }

  // 3. 게시판 투표 글 추가
  console.log("\n[3/3] 게시판 투표 글 추가...");

  const { data: post, error: postErr } = await db.from("posts").insert({
    team_id: DEMO_TEAM,
    author_id: createdBy,
    title: "다음 주 경기 유니폼 투표",
    content: "이번 주 상대팀이 검은색이라 유니폼 색을 정해야 합니다!",
    is_pinned: true,
  }).select("id").single();

  if (postErr) {
    console.log(`  ❌ 게시글: ${postErr.message}`);
  } else {
    // 투표 생성
    const { data: poll, error: pollErr } = await db.from("post_polls").insert({
      post_id: post.id,
      question: "어떤 유니폼으로 할까요?",
    }).select("id").single();

    if (!pollErr && poll) {
      // 옵션 추가
      const options = ["흰색 홈 유니폼", "주황색 원정 유니폼", "아무거나"];
      for (let i = 0; i < options.length; i++) {
        await db.from("post_poll_options").insert({
          poll_id: poll.id,
          label: options[i],
          sort_order: i,
        });
      }

      // 옵션 ID 조회
      const { data: optionRows } = await db.from("post_poll_options")
        .select("id, label")
        .eq("poll_id", poll.id)
        .order("sort_order");

      // 랜덤 투표
      if (optionRows && optionRows.length >= 3) {
        const activeMembers = members?.filter((mb) => mb.user_id) ?? [];
        for (const mb of activeMembers.slice(0, 10)) {
          const randomOption = optionRows[Math.floor(Math.random() * optionRows.length)];
          await db.from("post_poll_votes").insert({
            poll_id: poll.id,
            option_id: randomOption.id,
            user_id: mb.user_id,
          });
        }
        console.log(`  ✅ 투표 글 + 10명 투표 완료`);
      }
    }
  }

  console.log("\n=== 보강 완료 ===");
}

main().catch(console.error);
