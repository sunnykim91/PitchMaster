import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * 추천 리워드 서버 로직 (마이그 00081 referrals).
 *
 * 흐름: 랜딩 ?ref=<추천인 user_id> → 쿠키 pm_ref → 카카오 콜백 신규가입 시 createReferral(PENDING)
 *  → 초대된 사람 팀 생성 시 linkReferralTeam → 초대팀이 (첫 COMPLETED 경기 ≥1 && 카카오 연동 멤버 ≥3) 이면
 *     cron 이 activatePendingReferrals(ACTIVATED) → /admin 에서 운영자가 기프티콘 발송 후 REWARDED.
 *
 * 활성화 문턱을 "첫 경기 + 연동멤버 3명"으로 둔 이유(어뷰징 vs 등가교환): 카카오 계정은 전화번호 인증이 필수라
 * 연동멤버 N명 위조 = 전화번호 N개 필요. 3명이면 진짜 팀은 자동 통과하지만 1인 농사는 수지가 안 맞는 스위트스팟.
 * (실제 출석 게이트는 attendance_status가 ~11%만 기록돼 진짜 팀도 탈락하므로 폐기 — 연동멤버 수가 최적 신호)
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 활성화에 필요한 최소 카카오 연동 멤버 수(회장 본인 포함). 1인 농사 방지선. */
const MIN_LINKED_MEMBERS = 3;

/** ref 쿠키 값이 UUID 형태인지 (추천인 user_id). 오염 방지 게이트. */
export function isValidRefValue(v: string | null | undefined): v is string {
  return !!v && UUID_RE.test(v);
}

/**
 * 신규 가입 시 추천 귀속 — 추천인이 실존 유저이고 본인이 아니면 PENDING referral 생성.
 * 실패(중복·자기추천 등)는 조용히 무시 — 가입 흐름을 절대 막지 않는다.
 */
export async function createReferral(referrerUserId: string, referredUserId: string): Promise<void> {
  if (!isValidRefValue(referrerUserId) || referrerUserId === referredUserId) return;
  const db = getSupabaseAdmin();
  if (!db) return;
  try {
    const { data: referrer } = await db.from("users").select("id").eq("id", referrerUserId).maybeSingle();
    if (!referrer) return; // 추천인이 실존 유저 아님 → 무시
    await db.from("referrals").insert({
      referrer_user_id: referrerUserId,
      referred_user_id: referredUserId,
      status: "PENDING",
    });
    // insert 에러(unique 위반 등)는 반환값에 담기고 throw 안 함 — 무시
  } catch {
    // 어떤 경우든 가입은 통과시킨다
  }
}

/** 초대된 사람이 팀을 생성하면 그 팀을 referral 에 연결. (PENDING·팀 미연결 건만) */
export async function linkReferralTeam(referredUserId: string, teamId: string): Promise<void> {
  const db = getSupabaseAdmin();
  if (!db) return;
  try {
    await db
      .from("referrals")
      .update({ referred_team_id: teamId })
      .eq("referred_user_id", referredUserId)
      .is("referred_team_id", null)
      .eq("status", "PENDING");
  } catch {
    /* 무시 — 팀 생성 흐름 막지 않음 */
  }
}

/**
 * 활성화 판정 (cron) — PENDING + 팀연결된 referral 중, 초대팀이 COMPLETED 경기 ≥1 이면 ACTIVATED.
 * 반환: 이번에 활성화된 건수.
 */
export async function activatePendingReferrals(): Promise<number> {
  const db = getSupabaseAdmin();
  if (!db) return 0;
  const { data: pending } = await db
    .from("referrals")
    .select("id, referred_team_id")
    .eq("status", "PENDING")
    .not("referred_team_id", "is", null);
  if (!pending || pending.length === 0) return 0;

  let activated = 0;
  for (const r of pending as Array<{ id: string; referred_team_id: string }>) {
    // 조건 1: 초대팀이 실제로 경기를 한 번이라도 완료했는가
    const { count: matchCount } = await db
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("team_id", r.referred_team_id)
      .eq("status", "COMPLETED");
    if ((matchCount ?? 0) === 0) continue;

    // 조건 2: 카카오 연동 멤버(user_id 있음) ≥ MIN_LINKED_MEMBERS — 1인 농사 방지
    const { count: linkedMembers } = await db
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("team_id", r.referred_team_id)
      .not("user_id", "is", null)
      .in("status", ["ACTIVE", "DORMANT"]);
    if ((linkedMembers ?? 0) < MIN_LINKED_MEMBERS) continue;

    await db
      .from("referrals")
      .update({ status: "ACTIVATED", activated_at: new Date().toISOString() })
      .eq("id", r.id)
      .eq("status", "PENDING"); // race-safe: 여전히 PENDING 일 때만
    activated++;
  }
  return activated;
}
