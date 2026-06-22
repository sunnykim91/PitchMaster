import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * 벌금(지각·노쇼·미투표) 면제 대상 user_id 셋.
 *
 * 정책 (2026-06-22 확정): 회비 면제 중 **휴회(LEAVE)·부상(INJURED)만** 벌금 면제.
 * 선납·키퍼·직책 등(EXEMPT/PREPAID)은 회비만 면제일 뿐, 지각·노쇼·미투표 같은
 * 행동 벌금은 정상 부과한다.
 *
 * ⚠️ `member_dues_exemptions.member_id` 는 team_members.id 기준이라
 * user_id 로 매핑해서 반환한다 (penalty_records / 출석은 user_id 로 동작).
 * FK 힌트 join 대신 2단계 조회로 안전하게 처리.
 *
 * 참고: 휴면(team_members.status='DORMANT') 회원은 별개 축으로,
 * 미투표 크론은 `getActiveExemptions`(DORMANT)로 따로 제외한다.
 */
export async function getPenaltyExemptUserIds(teamId: string): Promise<Set<string>> {
  const db = getSupabaseAdmin();
  if (!db) return new Set();

  const { data: exemptions } = await db
    .from("member_dues_exemptions")
    .select("member_id")
    .eq("team_id", teamId)
    .eq("is_active", true)
    .in("exemption_type", ["LEAVE", "INJURED"]);

  const memberIds = [...new Set((exemptions ?? []).map((e) => e.member_id).filter(Boolean))];
  if (memberIds.length === 0) return new Set();

  const { data: members } = await db
    .from("team_members")
    .select("user_id")
    .in("id", memberIds)
    .not("user_id", "is", null);

  const set = new Set<string>();
  for (const m of members ?? []) {
    if (m.user_id) set.add(m.user_id);
  }
  return set;
}
