import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendTeamPush } from "@/lib/server/sendPush";

/** 경기 결과 자동 푸시 (매일 22:00 KST = 13:00 UTC) */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });

  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const today = kstNow.toISOString().split("T")[0];

  // 22시 cron + result_pushed=false 멱등성. 22시 이후 종료 경기 다음날 fix용 7일 가드.
  const sevenDaysAgo = new Date(kstNow.getTime() - 7 * 24 * 60 * 60 * 1000)
    .toISOString().split("T")[0];

  const { data: matches } = await db
    .from("matches")
    .select("id, team_id, opponent_name, match_date, match_type, teams(name)")
    .eq("status", "COMPLETED")
    .gte("match_date", sevenDaysAgo)
    .lte("match_date", today)
    .eq("result_pushed", false)
    .eq("stats_included", true);

  // 진단용 로그: 어떤 매치가 SELECT 가드를 통과했는지 추적.
  // 2026-05-28 FCMZ vs HOLD FC 경기 결과 푸시가 2일 lag 발송된 원인 추적용 —
  // 5/27 cron이 1매치만 보고 5/28 cron이 7매치 일괄 처리한 패턴의 정체 파악.
  console.log("[match-result] window", { today, sevenDaysAgo, candidates: matches?.length ?? 0 });
  if (matches && matches.length > 0) {
    console.log("[match-result] candidates", matches.map((m) => ({
      id: m.id,
      date: m.match_date,
      type: m.match_type,
      opp: m.opponent_name,
    })));
  }

  if (!matches || matches.length === 0) {
    return NextResponse.json({ message: "No results to push", sent: 0, candidates: 0 });
  }

  let totalSent = 0;
  let processed = 0;
  let skippedAlreadyClaimed = 0;

  for (const match of matches) {
    const isInternal = match.match_type === "INTERNAL";

    // 자체전은 승/패 개념이 없어 결과 푸시 대상이 아님 — claim만 하고 발송 skip (7일간 재쿼리 방지)
    if (isInternal) {
      await db.from("matches").update({ result_pushed: true }).eq("id", match.id).eq("result_pushed", false);
      continue;
    }

    // 골 집계
    const { data: goals } = await db
      .from("match_goals")
      .select("scorer_id, is_own_goal")
      .eq("match_id", match.id);

    // 골 0건 = 0:0 무승부(정상 결과) → skip 하지 않고 그대로 푸시.
    // (예전엔 skip + claim 누락으로 0:0 경기가 영영 푸시 안 되고 7일간 재쿼리됐음)
    const goalList = goals ?? [];

    let ourGoals = 0;
    let oppGoals = 0;
    const scorerCounts: Record<string, number> = {};

    for (const g of goalList) {
      if (g.scorer_id === "OPPONENT" || g.is_own_goal) {
        oppGoals++;
      } else {
        ourGoals++;
        if (g.scorer_id && g.scorer_id !== "MERCENARY" && g.scorer_id !== "UNKNOWN") {
          scorerCounts[g.scorer_id] = (scorerCounts[g.scorer_id] ?? 0) + 1;
        }
      }
    }

    // 득점자 이름 조회
    const scorerIds = Object.keys(scorerCounts);
    let scorerNames: string[] = [];

    if (scorerIds.length > 0) {
      const { data: members } = await db
        .from("team_members")
        .select("id, user_id, users(name)")
        .eq("team_id", match.team_id)
        .in("status", ["ACTIVE", "DORMANT"]);

      const idToName = new Map<string, string>();
      for (const m of (members ?? [])) {
        const user = Array.isArray(m.users) ? m.users[0] : m.users;
        const name = (user as { name: string } | null)?.name ?? "";
        if (name) {
          if (m.user_id) idToName.set(m.user_id, name);
          idToName.set(m.id, name);
        }
      }

      // 득점 수 내림차순 정렬, 최대 5명
      scorerNames = Object.entries(scorerCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([id, count]) => {
          const name = idToName.get(id) ?? "선수";
          return count > 1 ? `${name}(${count})` : name;
        });
    }

    // 결과 판정
    const result = ourGoals > oppGoals ? "승" : ourGoals < oppGoals ? "패" : "무";
    const emoji = result === "승" ? "⚽" : result === "무" ? "🤝" : "💪";

    // 메시지 생성
    // 카피: 팀명·날짜 prefix 필수 — cron 지연 시 "어떤 경기?" 헷갈림 방지 (다중 팀 멤버 포함)
    // MVP/역할 가이드 푸시와 동일한 prefix 규칙
    const opponent = isInternal ? "자체전" : (match.opponent_name ?? "상대팀");
    const teamObj = Array.isArray(match.teams) ? match.teams[0] : match.teams;
    const teamName = (teamObj as { name?: string } | null)?.name ?? "";
    const teamPrefix = teamName ? `[${teamName}] ` : "";
    const dateLabel = match.match_date.slice(5); // "MM-DD"
    const title = `${emoji} 경기 결과`;
    const scoreLine = `${teamPrefix}${dateLabel} vs ${opponent} ${ourGoals}:${oppGoals} ${result}!`;
    const scorersLine = scorerNames.length > 0 ? `\n득점: ${scorerNames.join(", ")}` : "";
    const body = `${scoreLine}${scorersLine}`;

    // 멱등성 보장: 푸시 발송 전에 result_pushed=true로 먼저 claim
    // 다른 크론이 동시에 실행되어도 조건부 UPDATE로 한 번만 발송됨
    const { data: claimed } = await db
      .from("matches")
      .update({ result_pushed: true })
      .eq("id", match.id)
      .eq("result_pushed", false)
      .select("id")
      .maybeSingle();

    if (!claimed) {
      skippedAlreadyClaimed++;
      console.log("[match-result] skip (already claimed)", match.id);
      continue;
    }

    const pushResult = await sendTeamPush(match.team_id, {
      title,
      body,
      url: `/matches/${match.id}?tab=diary`,
    });

    totalSent += pushResult.sent;
    processed++;
  }

  console.log("[match-result] done", {
    candidates: matches.length,
    processed,
    sent: totalSent,
    skippedAlreadyClaimed,
  });
  return NextResponse.json({
    candidates: matches.length,
    matches: processed,
    sent: totalSent,
    skippedAlreadyClaimed,
  });
}
