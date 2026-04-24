import type { SupabaseClient } from "@supabase/supabase-js";
import { sendTeamPush } from "@/lib/server/sendPush";

/**
 * 투표 마감 후 역할 가이드 푸시 처리.
 *
 * 경로:
 *   1) 크론 /api/cron/role-guide-push (5분 간격)
 *   2) (옵션) 투표 관련 액션 직후 fire-and-forget
 *
 * 멱등: matches.role_guide_push_sent_at 에 claim UPDATE 패턴 사용.
 *
 * 대상:
 *   vote_deadline <= now() AND role_guide_push_sent_at IS NULL
 *   AND status = 'SCHEDULED' (경기 종료된 건 MVP 푸시가 담당)
 *   AND match_type != 'EVENT' (팀 일정은 역할 없음)
 *
 * 수신자: ATTEND 투표자
 *
 * 메시지:
 *   - match_squads 존재하면: "쿼터 N · 포지션 X" 구체 노출
 *   - 미존재: "편성 준비 중 · 내 역할 미리 보기"
 */
export async function processRoleGuidePush(
  db: SupabaseClient,
  matchIds?: string[],
): Promise<{ matches: number; sent: number; teamsProcessed: number }> {
  const nowIso = new Date().toISOString();

  let query = db
    .from("matches")
    .select("id, team_id, match_date, match_time, opponent_name, match_type, vote_deadline")
    .eq("status", "SCHEDULED")
    .is("role_guide_push_sent_at", null)
    .not("vote_deadline", "is", null)
    .lte("vote_deadline", nowIso)
    .neq("match_type", "EVENT");
  if (matchIds && matchIds.length > 0) {
    query = query.in("id", matchIds);
  }
  const { data: matches } = await query;
  if (!matches || matches.length === 0) {
    return { matches: 0, sent: 0, teamsProcessed: 0 };
  }

  let totalSent = 0;
  const teamsProcessed = new Set<string>();

  for (const match of matches as Array<{
    id: string;
    team_id: string;
    match_date: string;
    match_time: string | null;
    opponent_name: string | null;
    match_type: string | null;
    vote_deadline: string;
  }>) {
    // 멱등 claim
    const { data: claimed } = await db
      .from("matches")
      .update({ role_guide_push_sent_at: nowIso })
      .eq("id", match.id)
      .is("role_guide_push_sent_at", null)
      .select("id")
      .maybeSingle();
    if (!claimed) continue;

    teamsProcessed.add(match.team_id);

    // 1) ATTEND 투표자 모으기 (member_id 기준 정규화)
    const { data: attendance } = await db
      .from("match_attendance")
      .select("user_id, member_id")
      .eq("match_id", match.id)
      .eq("vote", "ATTEND");
    const attendingUserIds = ((attendance ?? []) as Array<{ user_id: string | null; member_id: string | null }>)
      .map((a) => a.user_id)
      .filter((x): x is string => !!x);
    if (attendingUserIds.length === 0) continue;

    // 2) 편성 정보 조회 (match_squads — quarter_number 별)
    const { data: squads } = await db
      .from("match_squads")
      .select("quarter_number, positions")
      .eq("match_id", match.id)
      .order("quarter_number", { ascending: true });

    type SquadPosition = { x: number; y: number; playerId: string };
    type Squad = { quarter_number: number; positions: Record<string, SquadPosition | null> };
    const squadRows = (squads ?? []) as Squad[];
    const hasSquad = squadRows.length > 0;

    // 3) 유저별 첫 등장 쿼터·슬롯 찾기
    //    playerId 는 users.id 일 수도, team_members.id 일 수도 있음 → 둘 다 매칭
    const { data: teamMembers } = await db
      .from("team_members")
      .select("id, user_id")
      .eq("team_id", match.team_id);
    const userToMember = new Map<string, string>();
    for (const m of ((teamMembers ?? []) as Array<{ id: string; user_id: string | null }>)) {
      if (m.user_id) userToMember.set(m.user_id, m.id);
    }

    // 경기 시간 표시 (10:38 → "10:38")
    const matchTimeLabel = match.match_time ? match.match_time.slice(0, 5) : "";
    const opponent = match.match_type === "INTERNAL"
      ? "자체전"
      : (match.opponent_name ?? "상대팀");

    // 4) 유저별 푸시 발송
    for (const userId of attendingUserIds) {
      const memberId = userToMember.get(userId);
      const lookupIds = memberId ? [userId, memberId] : [userId];

      let personalRole: { quarter: number; slot: string } | null = null;
      if (hasSquad) {
        for (const sq of squadRows) {
          for (const [slot, pos] of Object.entries(sq.positions ?? {})) {
            if (pos && lookupIds.includes(pos.playerId)) {
              personalRole = { quarter: sq.quarter_number, slot: slot.toUpperCase() };
              break;
            }
          }
          if (personalRole) break;
        }
      }

      // 메시지 결정
      let title: string;
      let body: string;
      if (personalRole) {
        title = "⚽ 경기 역할 안내";
        body = `${match.match_date.slice(5)} ${matchTimeLabel} vs ${opponent} · ${personalRole.quarter}쿼터 ${personalRole.slot}`;
      } else if (hasSquad) {
        // 편성은 있는데 내가 없음 (벤치 대기)
        title = "⚽ 경기 준비";
        body = `${match.match_date.slice(5)} ${matchTimeLabel} vs ${opponent} · 벤치 대기 예정`;
      } else {
        title = "⚽ 투표 마감";
        body = `${match.match_date.slice(5)} ${matchTimeLabel} vs ${opponent} · 편성 준비 중 · 내 예상 역할 확인`;
      }

      const push = await sendTeamPush(match.team_id, {
        title,
        body,
        url: `/matches/${match.id}?tab=tactics`,
        userIds: [userId],
      });
      totalSent += push.sent;
    }
  }

  return {
    matches: matches.length,
    sent: totalSent,
    teamsProcessed: teamsProcessed.size,
  };
}
