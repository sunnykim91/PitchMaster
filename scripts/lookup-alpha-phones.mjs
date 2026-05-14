import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = readFileSync(".env", "utf8");
const url = env.match(/^NEXT_PUBLIC_SUPABASE_URL=(.*)$/m)?.[1]?.trim() ?? "https://agcmuvjwiydfppjlbhcx.supabase.co";
const key = env.match(/^SUPABASE_SERVICE_ROLE_KEY=(.*)$/m)?.[1]?.trim();
if (!key) { console.error(".env에서 SUPABASE_SERVICE_ROLE_KEY 못 찾음"); process.exit(1); }

const db = createClient(url, key);

const targets = [
  { name: "노진우", id: "38ebc95e-87c2-4eec-942f-80c6b797d041" },
  { name: "서성재", id: "7fe4309f-38f2-4bc6-b67a-5707f97ad665" },
  { name: "김민성", id: "41b2acd2-bb5a-4c68-ba95-b03e1ec62143" },
  { name: "성원창", id: "113cb672-57d7-460f-8238-fc9c44746e80" },
];
const ids = targets.map((t) => t.id);

const { data: us, error: e1 } = await db
  .from("users")
  .select("id, name, phone, kakao_id")
  .in("id", ids);
if (e1) { console.error("users error:", e1); process.exit(1); }

// team_join_requests는 kakao_id 키 사용
const kakaoIds = us.map((u) => u.kakao_id).filter(Boolean);
const { data: rs, error: e2 } = kakaoIds.length
  ? await db
      .from("team_join_requests")
      .select("kakao_id, team_id, phone, status, created_at")
      .in("kakao_id", kakaoIds)
      .order("created_at", { ascending: false })
  : { data: [], error: null };
if (e2) { console.error("join_requests error:", e2); process.exit(1); }

const teamIds = [...new Set((rs ?? []).map((r) => r.team_id).filter(Boolean))];
const { data: teams } = teamIds.length
  ? await db.from("teams").select("id, name").in("id", teamIds)
  : { data: [] };
const teamNameById = new Map((teams ?? []).map((t) => [t.id, t.name]));

// kakao_id → user_id 매핑
const userIdByKakao = new Map(us.map((u) => [u.kakao_id, u.id]));
const reqByUser = new Map();
for (const r of (rs ?? [])) {
  const uid = userIdByKakao.get(r.kakao_id);
  if (!uid) continue;
  if (!reqByUser.has(uid)) reqByUser.set(uid, []);
  reqByUser.get(uid).push(r);
}

console.log("=== 알파테스터 4명 연락처 후보 ===");
for (const t of targets) {
  const u = us.find((x) => x.id === t.id);
  const reqs = reqByUser.get(t.id) ?? [];
  const reqWithPhone = reqs.find((r) => r.phone);
  console.log("\n[" + t.name + "]");
  console.log("  users.phone:", u?.phone || "(없음)");
  console.log("  kakao_id:", u?.kakao_id || "(없음)");
  if (reqWithPhone) {
    console.log("  team_join_requests.phone:", reqWithPhone.phone, "| 팀:", teamNameById.get(reqWithPhone.team_id), "| 상태:", reqWithPhone.status, "| 신청일:", reqWithPhone.created_at);
  } else if (reqs.length) {
    console.log("  team_join_requests:", reqs.length, "건 있으나 phone 없음");
  } else {
    console.log("  team_join_requests: (없음 — OPEN 또는 초대링크 가입 추정)");
  }
}
