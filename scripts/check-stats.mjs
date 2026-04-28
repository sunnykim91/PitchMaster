/**
 * 서비스 현황 조회
 * 실행: SUPABASE_SERVICE_ROLE_KEY=... node scripts/check-stats.mjs
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://agcmuvjwiydfppjlbhcx.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_KEY) { console.error("SUPABASE_SERVICE_ROLE_KEY 필요"); process.exit(1); }
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

const DEMO_TEAM_ID = "192127c0-e2be-46b4-b340-7583730467da";

async function main() {
  // 팀 수 (데모 제외)
  const { data: teams } = await db.from("teams").select("id, name, created_at").neq("id", DEMO_TEAM_ID);
  console.log(`총 팀: ${teams.length}개`);

  // 유저 수 (데모 제외)
  const { count: userCount } = await db.from("users").select("id", { count: "exact", head: true }).neq("kakao_id", "demo_kakao_id_pitchmaster");
  console.log(`총 유저: ${userCount}명`);

  // 프로필 완료 유저
  const { count: profileComplete } = await db.from("users").select("id", { count: "exact", head: true }).eq("is_profile_complete", true).neq("kakao_id", "demo_kakao_id_pitchmaster");
  console.log(`프로필 완료: ${profileComplete}명`);

  // 활성 팀 (최근 7일 경기/게시 또는 투표)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentMatches } = await db.from("matches").select("team_id").gte("created_at", sevenDaysAgo).neq("team_id", DEMO_TEAM_ID);
  const { data: recentPosts } = await db.from("posts").select("team_id").gte("created_at", sevenDaysAgo).neq("team_id", DEMO_TEAM_ID);
  const activeTeamIds = new Set([
    ...(recentMatches || []).map(m => m.team_id),
    ...(recentPosts || []).map(p => p.team_id),
  ]);
  console.log(`활성 팀 (7일): ${activeTeamIds.size}개`);

  // 총 경기/게시글
  const { count: matchCount } = await db.from("matches").select("id", { count: "exact", head: true }).neq("team_id", DEMO_TEAM_ID);
  const { count: postCount } = await db.from("posts").select("id", { count: "exact", head: true }).neq("team_id", DEMO_TEAM_ID);
  console.log(`총 경기: ${matchCount}개`);
  console.log(`총 게시글: ${postCount}개`);

  // 테스트 수
  console.log(`\n--- 요약 ---`);
  console.log(`서비스 현황: ${teams.length}팀 · ${userCount}명 · ${activeTeamIds.size}팀 활성`);
}

main().catch(console.error);
