import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * 미투표 벌금 자동 생성 크론 (매일 KST 23:00 실행)
 *
 * 1. NO_VOTE 규칙이 활성화된 팀만 대상
 * 2. 오늘 투표 마감인 경기 (vote_deadline 기준)
 * 3. 투표 안 한 활성 멤버에게 벌금 생성
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });

  // 1. NO_VOTE 활성 규칙이 있는 팀만 조회
  const { data: noVoteRules } = await db
    .from("penalty_rules")
    .select("id, team_id, amount, name")
    .eq("trigger_type", "NO_VOTE")
    .eq("is_active", true);

  if (!noVoteRules || noVoteRules.length === 0) {
    return NextResponse.json({ message: "No active NO_VOTE rules", created: 0 });
  }

  const teamRuleMap = new Map<string, typeof noVoteRules[0]>();
  for (const rule of noVoteRules) {
    teamRuleMap.set(rule.team_id, rule);
  }
  const teamIds = [...teamRuleMap.keys()];

  // 2. KST 기준 오늘 마감인 경기 조회
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const todayStr = kstNow.toISOString().split("T")[0];
  const todayStart = `${todayStr}T00:00:00`;
  const todayEnd = `${todayStr}T23:59:59`;

  // vote_deadline이 오늘이거나, vote_deadline 없이 경기일이 오늘인 경기
  const { data: deadlineMatches } = await db
    .from("matches")
    .select("id, team_id, match_date, opponent_name")
    .in("team_id", teamIds)
    .eq("status", "SCHEDULED")
    .gte("vote_deadline", todayStart)
    .lte("vote_deadline", todayEnd);

  const { data: noDeadlineMatches } = await db
    .from("matches")
    .select("id, team_id, match_date, opponent_name")
    .in("team_id", teamIds)
    .eq("status", "SCHEDULED")
    .eq("match_date", todayStr)
    .is("vote_deadline", null);

  const seenIds = new Set<string>();
  const matches = [...(deadlineMatches ?? []), ...(noDeadlineMatches ?? [])].filter((m) => {
    if (seenIds.has(m.id)) return false;
    seenIds.add(m.id);
    return true;
  });

  if (matches.length === 0) {
    return NextResponse.json({ message: "No matches with deadline today", created: 0 });
  }

  // 3. 경기별 미투표자 벌금 생성
  let totalCreated = 0;

  for (const match of matches) {
    const rule = teamRuleMap.get(match.team_id);
    if (!rule) continue;

    // 활성 멤버
    const { data: members } = await db
      .from("team_members")
      .select("user_id")
      .eq("team_id", match.team_id)
      .eq("status", "ACTIVE")
      .not("user_id", "is", null);

    const allUserIds = (members ?? []).map((m) => m.user_id).filter(Boolean) as string[];
    if (allUserIds.length === 0) continue;

    // 투표한 멤버
    const { data: voted } = await db
      .from("match_attendance")
      .select("user_id")
      .eq("match_id", match.id)
      .not("user_id", "is", null);

    const votedIds = new Set((voted ?? []).map((v) => v.user_id));
    const unvotedIds = allUserIds.filter((uid) => !votedIds.has(uid));
    if (unvotedIds.length === 0) continue;

    // 기존 벌금 중복 방지
    const { data: existing } = await db
      .from("penalty_records")
      .select("member_id")
      .eq("match_id", match.id)
      .eq("rule_id", rule.id);

    const existingSet = new Set((existing ?? []).map((e) => e.member_id));
    const opponent = match.opponent_name ?? "경기";

    const newPenalties = unvotedIds
      .filter((uid) => !existingSet.has(uid))
      .map((uid) => ({
        team_id: match.team_id,
        match_id: match.id,
        member_id: uid,
        rule_id: rule.id,
        amount: rule.amount,
        date: match.match_date,
        note: `${match.match_date} vs ${opponent} 미투표`,
        status: "UNPAID",
        is_paid: false,
      }));

    if (newPenalties.length > 0) {
      const { error } = await db.from("penalty_records").insert(newPenalties);
      if (!error) totalCreated += newPenalties.length;
    }
  }

  return NextResponse.json({ matches: matches.length, created: totalCreated });
}
