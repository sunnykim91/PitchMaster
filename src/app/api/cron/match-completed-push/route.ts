import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendTeamPush } from "@/lib/server/sendPush";
import { computeTeamSeasonOvrs } from "@/lib/server/computeSeasonOvr";
import { getRarity } from "@/lib/playerCardUtils";

/**
 * 경기 종료 직후 자동 발송 크론 — 매 15분 실행 권장.
 *
 * 수행:
 *   1) COMPLETED 상태 + mvp_push_sent_at IS NULL 경기 조회
 *   2) "MVP 투표 시작" 팀 전체 푸시 발송 (멱등 claim 패턴)
 *   3) 팀별 시즌 OVR 재계산 → team_members.last_ovr 와 비교
 *   4) OVR 변동 >= 2 또는 rarity 달라지면 개인 푸시
 *   5) last_ovr / last_ovr_updated_at 업데이트
 *
 * EVENT 타입 경기는 스킵 (팀 일정).
 * INTERNAL 자체전은 MVP 푸시만 보내고 OVR 변동은 stats_included 반영.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });

  // 1. MVP 푸시 대상 경기 조회 (EVENT 제외)
  const { data: matches } = await db
    .from("matches")
    .select("id, team_id, match_date, opponent_name, match_type, stats_included")
    .eq("status", "COMPLETED")
    .is("mvp_push_sent_at", null)
    .neq("match_type", "EVENT");

  if (!matches || matches.length === 0) {
    return NextResponse.json({ message: "No matches to push", mvpSent: 0, ovrSent: 0 });
  }

  const nowIso = new Date().toISOString();
  let mvpSent = 0;
  let ovrSent = 0;
  const teamsProcessed = new Set<string>();

  for (const match of matches) {
    // 2. 멱등 claim — mvp_push_sent_at 에 세팅되어 있으면 skip
    const { data: claimed } = await db
      .from("matches")
      .update({ mvp_push_sent_at: nowIso })
      .eq("id", match.id)
      .is("mvp_push_sent_at", null)
      .select("id")
      .maybeSingle();
    if (!claimed) continue;

    // 3. MVP 투표 시작 팀 전체 푸시
    const opponent = match.match_type === "INTERNAL"
      ? "자체전"
      : (match.opponent_name ?? "상대팀");
    const title = "🏆 MVP 투표 시작";
    const body = `오늘 vs ${opponent} 경기의 MVP를 뽑아주세요!`;

    const pushResult = await sendTeamPush(match.team_id, {
      title,
      body,
      url: `/matches/${match.id}?tab=record`,
    });
    mvpSent += pushResult.sent;

    // 4. 같은 팀은 한 번만 OVR 계산 (동일 팀 여러 경기 종료 시 중복 방지)
    if (teamsProcessed.has(match.team_id)) continue;
    teamsProcessed.add(match.team_id);

    // stats_included=false 자체전은 OVR 영향 없으므로 스킵
    if (match.stats_included === false) continue;

    // 5. 팀 시즌 OVR 재계산
    const ovrMap = await computeTeamSeasonOvrs(db, match.team_id);
    if (ovrMap.size === 0) continue;

    // 6. 기존 last_ovr 조회
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

    // 7. 변동 감지 + 개인 푸시
    for (const [memId, { ovr, matchCount }] of ovrMap) {
      if (matchCount < 3) continue; // 경기 수 너무 적으면 noise 방지
      const prev = prevMap.get(memId);
      if (!prev) continue;

      const prevOvr = prev.last_ovr;
      const prevRarity = prevOvr != null ? getRarity(prevOvr) : null;
      const newRarity = getRarity(ovr);

      // 최초 계산이면 그냥 저장만 하고 스킵 (첫 경기부터 알림 X)
      if (prevOvr == null) {
        await db
          .from("team_members")
          .update({ last_ovr: ovr, last_ovr_updated_at: nowIso })
          .eq("id", memId);
        continue;
      }

      const delta = ovr - prevOvr;
      const rarityChanged = prevRarity !== newRarity;
      // 변동 없으면 스킵 (업데이트도 불필요)
      if (delta === 0 && !rarityChanged) continue;
      // threshold: ±2 또는 rarity 달라짐
      const shouldPush = Math.abs(delta) >= 2 || rarityChanged;

      // DB 업데이트는 매번 (변동 추적)
      await db
        .from("team_members")
        .update({ last_ovr: ovr, last_ovr_updated_at: nowIso })
        .eq("id", memId);

      if (!shouldPush) continue;
      if (!prev.user_id) continue; // 미연동 멤버는 푸시 대상 아님

      const nameObj = Array.isArray(prev.users) ? prev.users[0] : prev.users;
      const name = nameObj?.name ?? "선수";

      const deltaArrow = delta > 0 ? "↑" : "↓";
      const emoji = rarityChanged && delta > 0 ? "🎉" : delta > 0 ? "📈" : "📉";
      const rarityLabel: Record<string, string> = {
        ICON: "ICON",
        HERO: "HERO",
        RARE: "RARE",
        COMMON: "COMMON",
      };

      const ovrTitle = rarityChanged && delta > 0
        ? `${emoji} ${rarityLabel[newRarity]} 등급 달성!`
        : `${emoji} 카드 OVR 변동`;
      const ovrBody = `${name}님 OVR ${prevOvr} ${deltaArrow} ${ovr}${rarityChanged && delta > 0 ? ` · ${rarityLabel[newRarity]}!` : ""}`;

      const personalPush = await sendTeamPush(match.team_id, {
        title: ovrTitle,
        body: ovrBody,
        url: `/player/${prev.user_id}`,
        userIds: [prev.user_id],
      });
      ovrSent += personalPush.sent;
    }
  }

  return NextResponse.json({
    matches: matches.length,
    mvpSent,
    ovrSent,
    teamsProcessed: teamsProcessed.size,
  });
}
