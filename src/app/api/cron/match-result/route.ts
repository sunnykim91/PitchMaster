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

  // 오늘 COMPLETED된 경기 중 result_pushed 안 된 것
  const { data: matches } = await db
    .from("matches")
    .select("id, team_id, opponent_name, match_date, match_type")
    .eq("status", "COMPLETED")
    .eq("match_date", today)
    .eq("result_pushed", false)
    .eq("stats_included", true);

  if (!matches || matches.length === 0) {
    return NextResponse.json({ message: "No results to push", sent: 0 });
  }

  let totalSent = 0;
  let processed = 0;

  for (const match of matches) {
    const isInternal = match.match_type === "INTERNAL";

    // 골 집계
    const { data: goals } = await db
      .from("match_goals")
      .select("scorer_id, is_own_goal")
      .eq("match_id", match.id);

    if (!goals || goals.length === 0) continue; // 골 기록 없으면 스킵

    let ourGoals = 0;
    let oppGoals = 0;
    const scorerCounts: Record<string, number> = {};

    for (const g of goals) {
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
    const opponent = isInternal ? "자체전" : (match.opponent_name ?? "상대팀");
    const title = `${emoji} 경기 결과`;
    const scoreLine = `vs ${opponent} ${ourGoals}:${oppGoals} ${result}!`;
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

    if (!claimed) continue; // 이미 다른 실행에서 처리됨

    const pushResult = await sendTeamPush(match.team_id, {
      title,
      body,
      url: `/matches/${match.id}?tab=diary`,
    });

    totalSent += pushResult.sent;
    processed++;
  }

  return NextResponse.json({ matches: processed, sent: totalSent });
}
