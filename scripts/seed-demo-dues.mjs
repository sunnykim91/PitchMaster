/**
 * FC DEMO 팀 회비 데이터 시드 스크립트
 * 실행: SUPABASE_SERVICE_ROLE_KEY=eyJ... node scripts/seed-demo-dues.mjs
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://agcmuvjwiydfppjlbhcx.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  console.error("SUPABASE_SERVICE_ROLE_KEY 환경변수를 설정하세요.");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY);
const DEMO_KAKAO_ID = "demo_kakao_id_pitchmaster";

async function main() {
  // 1. 데모 유저 조회
  const { data: demoUser } = await db
    .from("users")
    .select("id")
    .eq("kakao_id", DEMO_KAKAO_ID)
    .single();

  if (!demoUser) {
    console.error("데모 유저를 찾을 수 없습니다.");
    process.exit(1);
  }
  console.log("데모 유저 ID:", demoUser.id);

  // 2. 데모 팀 조회
  const { data: membership } = await db
    .from("team_members")
    .select("team_id")
    .eq("user_id", demoUser.id)
    .eq("status", "ACTIVE")
    .single();

  if (!membership) {
    console.error("데모 팀 멤버십을 찾을 수 없습니다.");
    process.exit(1);
  }
  const teamId = membership.team_id;
  console.log("데모 팀 ID:", teamId);

  // 3. 팀 멤버 목록 조회 (user_id 연동된 멤버만)
  const { data: members } = await db
    .from("team_members")
    .select("id, user_id, users(name)")
    .eq("team_id", teamId)
    .eq("status", "ACTIVE")
    .not("user_id", "is", null);

  if (!members || members.length === 0) {
    console.error("팀 멤버를 찾을 수 없습니다.");
    process.exit(1);
  }
  console.log(`팀 멤버 ${members.length}명 발견`);

  // 4. 기존 데모 회비 데이터 삭제
  const { error: delSettingsErr } = await db
    .from("dues_settings")
    .delete()
    .eq("team_id", teamId);
  if (delSettingsErr) console.warn("dues_settings 삭제 오류:", delSettingsErr.message);

  const { error: delRecordsErr } = await db
    .from("dues_records")
    .delete()
    .eq("team_id", teamId);
  if (delRecordsErr) console.warn("dues_records 삭제 오류:", delRecordsErr.message);

  console.log("기존 회비 데이터 삭제 완료");

  // 5. 회비 설정 추가
  const { error: settingsErr } = await db.from("dues_settings").insert([
    { team_id: teamId, member_type: "일반", monthly_amount: 30000, description: "월 회비" },
    { team_id: teamId, member_type: "학생", monthly_amount: 20000, description: "학생 할인" },
  ]);
  if (settingsErr) {
    console.error("회비 설정 삽입 실패:", settingsErr.message);
    process.exit(1);
  }
  console.log("회비 설정 2건 추가");

  // 6. 입출금 내역 생성 (최근 6개월)
  const records = [];
  const now = new Date();

  // 회비 입금 내역 (멤버별 월별)
  for (let monthOffset = 5; monthOffset >= 0; monthOffset--) {
    const d = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    for (const m of members) {
      const userName = Array.isArray(m.users) ? m.users[0]?.name : m.users?.name;
      if (!userName) continue;

      // 일부 회원은 가끔 미납 (랜덤)
      const isPaid = Math.random() > 0.15; // 85% 납부율
      if (!isPaid && monthOffset < 2) continue; // 최근 2개월만 미납 가능

      const day = 1 + Math.floor(Math.random() * 25);
      const recordedAt = `${monthStr}-${String(day).padStart(2, "0")}T09:00:00+09:00`;

      records.push({
        team_id: teamId,
        user_id: m.user_id,
        type: "INCOME",
        amount: 30000,
        description: `${monthStr} 회비 (${userName})`,
        recorded_by: demoUser.id,
        recorded_at: recordedAt,
      });
    }

    // 월별 지출 1~2건
    const expenses = [
      { desc: "구장 대여비", amounts: [150000, 180000, 200000, 120000] },
      { desc: "음료/간식", amounts: [30000, 45000, 25000, 50000] },
      { desc: "축구공 구매", amounts: [89000, 65000] },
      { desc: "유니폼 마킹", amounts: [120000, 150000] },
      { desc: "심판비", amounts: [50000, 30000] },
    ];

    // 매월 구장 대여비 필수
    const courtFee = expenses[0].amounts[Math.floor(Math.random() * expenses[0].amounts.length)];
    records.push({
      team_id: teamId,
      user_id: null,
      type: "EXPENSE",
      amount: courtFee,
      description: `${monthStr} ${expenses[0].desc}`,
      recorded_by: demoUser.id,
      recorded_at: `${monthStr}-${String(5 + Math.floor(Math.random() * 20)).padStart(2, "0")}T18:00:00+09:00`,
    });

    // 50% 확률로 추가 지출
    if (Math.random() > 0.5) {
      const extra = expenses[1 + Math.floor(Math.random() * (expenses.length - 1))];
      const extraAmt = extra.amounts[Math.floor(Math.random() * extra.amounts.length)];
      records.push({
        team_id: teamId,
        user_id: null,
        type: "EXPENSE",
        amount: extraAmt,
        description: `${monthStr} ${extra.desc}`,
        recorded_by: demoUser.id,
        recorded_at: `${monthStr}-${String(10 + Math.floor(Math.random() * 15)).padStart(2, "0")}T18:00:00+09:00`,
      });
    }
  }

  // 7. 배치 삽입
  const batchSize = 50;
  let inserted = 0;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await db.from("dues_records").insert(batch);
    if (error) {
      console.error(`배치 ${i}~${i + batch.length} 삽입 실패:`, error.message);
    } else {
      inserted += batch.length;
    }
  }

  console.log(`\n완료! 입출금 내역 ${inserted}건 삽입됨`);
  console.log(`  - 입금: ${records.filter(r => r.type === "INCOME").length}건`);
  console.log(`  - 지출: ${records.filter(r => r.type === "EXPENSE").length}건`);
}

main().catch(console.error);
