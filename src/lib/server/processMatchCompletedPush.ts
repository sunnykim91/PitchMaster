import type { SupabaseClient } from "@supabase/supabase-js";
import { sendTeamPush } from "@/lib/server/sendPush";
import { computeTeamSeasonOvrs } from "@/lib/server/computeSeasonOvr";
import { getRarity } from "@/lib/playerCardUtils";

/**
 * 경기 종료 직후 후처리 (MVP 투표 시작 푸시 + OVR 변동 알림).
 *
 * 두 경로에서 호출:
 *   1) autoCompleteTeamMatches 가 매치를 COMPLETED 로 전환한 직후 — 즉시 (fire-and-forget)
 *   2) /api/cron/match-completed-push — 안전망 (5분 간격)
 *
 * matches.mvp_push_sent_at 의 claim UPDATE 로 멱등 보장.
 *
 * @param matchIds (선택) 특정 매치 ID 만 처리. 미지정 시 mvp_push_sent_at IS NULL 인 COMPLETED 전량.
 */
export async function processMatchCompletedPush(
  db: SupabaseClient,
  matchIds?: string[],
): Promise<{ matches: number; mvpSent: number; ovrSent: number; teamsProcessed: number }> {
  // 대상 경기 조회 (EVENT 제외)
  let query = db
    .from("matches")
    .select("id, team_id, match_date, opponent_name, match_type, stats_included")
    .eq("status", "COMPLETED")
    .is("mvp_push_sent_at", null)
    .neq("match_type", "EVENT");
  if (matchIds && matchIds.length > 0) {
    query = query.in("id", matchIds);
  }
  const { data: matches } = await query;
  if (!matches || matches.length === 0) {
    return { matches: 0, mvpSent: 0, ovrSent: 0, teamsProcessed: 0 };
  }

  const nowIso = new Date().toISOString();
  let mvpSent = 0;
  let ovrSent = 0;
  const teamsProcessed = new Set<string>();

  for (const match of matches as Array<{
    id: string;
    team_id: string;
    match_date: string;
    opponent_name: string | null;
    match_type: string | null;
    stats_included: boolean | null;
  }>) {
    // 멱등 claim
    const { data: claimed } = await db
      .from("matches")
      .update({ mvp_push_sent_at: nowIso })
      .eq("id", match.id)
      .is("mvp_push_sent_at", null)
      .select("id")
      .maybeSingle();
    if (!claimed) continue;

    // MVP 투표 시작 팀 전체 푸시
    const opponent = match.match_type === "INTERNAL"
      ? "자체전"
      : (match.opponent_name ?? "상대팀");
    const mvpPush = await sendTeamPush(match.team_id, {
      title: "🏆 MVP 투표 시작",
      body: `오늘 vs ${opponent} 경기의 MVP를 뽑아주세요!`,
      url: `/matches/${match.id}?tab=record`,
    });
    mvpSent += mvpPush.sent;

    // 팀은 1회만 OVR 재계산 (같은 팀 여러 경기 동시 종료 시 중복 방지)
    if (teamsProcessed.has(match.team_id)) continue;
    teamsProcessed.add(match.team_id);
    if (match.stats_included === false) continue;

    const ovrMap = await computeTeamSeasonOvrs(db, match.team_id);
    if (ovrMap.size === 0) continue;

    const memberIds = [...ovrMap.keys()];
    const { data: prevData } = await db
      .from("team_members")
      .select("id, user_id, last_ovr, users(name)")
      .in("id", memberIds);
    type PrevRow = {
      id: string;
      user_id: string | null;
      last_ovr: number | null;
      users: { name: string } | { name: string }[] | null;
    };
    const prevMap = new Map<string, PrevRow>();
    for (const p of ((prevData ?? []) as PrevRow[])) prevMap.set(p.id, p);

    for (const [memId, { ovr, matchCount }] of ovrMap) {
      if (matchCount < 3) continue;
      const prev = prevMap.get(memId);
      if (!prev) continue;
      const prevOvr = prev.last_ovr;
      const prevRarity = prevOvr != null ? getRarity(prevOvr) : null;
      const newRarity = getRarity(ovr);

      if (prevOvr == null) {
        // 최초 스냅샷만 저장, 알림은 생략
        await db
          .from("team_members")
          .update({ last_ovr: ovr, last_ovr_updated_at: nowIso })
          .eq("id", memId);
        continue;
      }

      const delta = ovr - prevOvr;
      const rarityChanged = prevRarity !== newRarity;
      if (delta === 0 && !rarityChanged) continue;

      await db
        .from("team_members")
        .update({ last_ovr: ovr, last_ovr_updated_at: nowIso })
        .eq("id", memId);

      const shouldPush = Math.abs(delta) >= 2 || rarityChanged;
      if (!shouldPush) continue;
      if (!prev.user_id) continue;

      const nameObj = Array.isArray(prev.users) ? prev.users[0] : prev.users;
      const name = nameObj?.name ?? "선수";
      const deltaArrow = delta > 0 ? "↑" : "↓";
      const emoji = rarityChanged && delta > 0 ? "🎉" : delta > 0 ? "📈" : "📉";
      const rarityLabel: Record<string, string> = {
        ICON: "ICON", HERO: "HERO", RARE: "RARE", COMMON: "COMMON",
      };

      const personalPush = await sendTeamPush(match.team_id, {
        title: rarityChanged && delta > 0
          ? `${emoji} ${rarityLabel[newRarity]} 등급 달성!`
          : `${emoji} 카드 OVR 변동`,
        body: `${name}님 OVR ${prevOvr} ${deltaArrow} ${ovr}${rarityChanged && delta > 0 ? ` · ${rarityLabel[newRarity]}!` : ""}`,
        url: `/player/${prev.user_id}`,
        userIds: [prev.user_id],
      });
      ovrSent += personalPush.sent;
    }
  }

  return {
    matches: matches.length,
    mvpSent,
    ovrSent,
    teamsProcessed: teamsProcessed.size,
  };
}
