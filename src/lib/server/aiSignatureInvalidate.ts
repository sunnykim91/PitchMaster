import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 경기 완료 시 참석자들의 AI 시그니처를 stale 처리.
 *
 * Why:
 *   선수 스탯(경기 수·MOM·득점 등)이 변경되면 시그니처 카피도 갱신돼야 하는데,
 *   기존엔 TTL 7일 동안 옛 카피를 유지. 경기 1개 늘어나면 즉시 새 카피를 보는 게
 *   훨씬 자연스러움. ai_signature_generated_at을 NULL로 세팅하면
 *   다음 조회 시 isFresh() → false → 재생성 트리거.
 *
 *   ai_signature 텍스트 자체는 유지 — 재생성 실패 시 stale 카피라도 보이게 (UX 안전판).
 *
 * Graceful: 실패해도 전체 트랜잭션은 계속 진행 (관측성 손실일 뿐).
 */
export async function invalidateSignaturesForMatch(
  db: SupabaseClient,
  matchId: string
): Promise<void> {
  try {
    // 참석자 user_id / member_id 수집
    const { data: attendance } = await db
      .from("match_attendance")
      .select("user_id, member_id, actually_attended")
      .eq("match_id", matchId);

    if (!attendance || attendance.length === 0) return;

    const memberIds = new Set<string>();
    const userIds = new Set<string>();
    for (const a of attendance) {
      if (!a.actually_attended) continue;
      if (a.member_id) memberIds.add(a.member_id);
      if (a.user_id) userIds.add(a.user_id);
    }

    if (memberIds.size === 0 && userIds.size === 0) return;

    // member_id 기반 직접 업데이트
    if (memberIds.size > 0) {
      await db
        .from("team_members")
        .update({ ai_signature_generated_at: null })
        .in("id", [...memberIds]);
    }

    // user_id 기반 업데이트 (해당 user의 모든 team_members 중 경기 팀 멤버만 건드려야 안전)
    if (userIds.size > 0) {
      const { data: match } = await db
        .from("matches")
        .select("team_id")
        .eq("id", matchId)
        .single();

      if (match?.team_id) {
        await db
          .from("team_members")
          .update({ ai_signature_generated_at: null })
          .eq("team_id", match.team_id)
          .in("user_id", [...userIds]);
      }
    }
  } catch (err) {
    console.warn("[invalidateSignaturesForMatch] 실패 (무시):", err);
  }
}

/** 여러 경기 동시 처리 — autoCompleteTeamMatches 후 일괄 호출용 */
export async function invalidateSignaturesForMatches(
  db: SupabaseClient,
  matchIds: string[]
): Promise<void> {
  for (const id of matchIds) {
    await invalidateSignaturesForMatch(db, id);
  }
}
