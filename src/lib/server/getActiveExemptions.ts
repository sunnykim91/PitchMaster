import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type DormantInfo = {
  memberId: string;
  type: "INJURED" | "PERSONAL" | null;
  reason: string | null;
  until: string | null;
};

/**
 * 팀의 휴면 회원 목록 조회 (DORMANT 상태인 멤버의 user_id 기반)
 * @returns Set<userId> — 투표/벌금/푸시에서 제외할 user_id 셋
 */
export async function getActiveExemptions(teamId: string): Promise<Map<string, DormantInfo>> {
  const db = getSupabaseAdmin();
  if (!db) return new Map();

  const { data } = await db
    .from("team_members")
    .select("user_id, dormant_type, dormant_until, dormant_reason")
    .eq("team_id", teamId)
    .eq("status", "DORMANT")
    .not("user_id", "is", null);

  const map = new Map<string, DormantInfo>();
  for (const row of data ?? []) {
    if (!row.user_id) continue;
    map.set(row.user_id, {
      memberId: row.user_id,
      type: row.dormant_type as DormantInfo["type"],
      reason: row.dormant_reason,
      until: row.dormant_until,
    });
  }
  return map;
}
