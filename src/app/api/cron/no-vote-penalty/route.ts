import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getActiveExemptions } from "@/lib/server/getActiveExemptions";
import { getPenaltyExemptUserIds } from "@/lib/server/getPenaltyExemptUserIds";
import { getKstNow } from "@/lib/kstDate";

/**
 * 미투표 벌금 자동 생성 크론 (매시간 정각 실행 — vercel.json: "0 * * * *")
 *
 * 1. NO_VOTE 규칙이 활성화된 팀만 대상
 * 2. 최근 7일 내 투표 마감이 지난 경기 (vote_deadline 기준, UTC 비교 + 백필)
 * 3. 투표 안 한 활성 멤버에게 벌금 생성 (중복은 existingSet+upsert 로 방지)
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

  // 2. 마감이 지난(최근 7일) 경기 조회 — 백필 포함.
  //    ⚠️ vote_deadline 은 timestamptz(UTC) 이므로 반드시 UTC ISO 로 비교.
  //    (이전 버그: KST 날짜 naive 문자열 `todayStr+"T00:00:00"` 을 UTC 컬럼과 비교 →
  //     KST 00:00~08:59 마감인 경기는 UTC 상 전날이라 그 날 윈도우 밖으로 빠져 영영 누락됐음.)
  //    "오늘"만 보던 것을 "최근 7일 내 지난 마감"으로 넓혀 cron 1회 누락·마감 사후수정도 자동 복구.
  const now = new Date();
  const nowIso = now.toISOString();
  const sevenDaysAgoIso = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  // 마감 없는 경기는 match_date(DATE, tz 무관) 기준 KST 날짜 윈도우 사용
  const kstNow = getKstNow(now.getTime());
  const todayStrKst = kstNow.toISOString().split("T")[0];
  const sevenAgoStrKst = new Date(kstNow.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // status 를 SCHEDULED 로만 거르면 마감일 당일 종료돼 COMPLETED 자동전환된 경기가 누락됨 → 3종 모두 포함.
  const PENALTY_MATCH_STATUSES = ["SCHEDULED", "IN_PROGRESS", "COMPLETED"];
  // 마감이 이미 지난(<= now) + 최근 7일 이내인 경기
  const { data: deadlineMatches } = await db
    .from("matches")
    .select("id, team_id, match_date, opponent_name")
    .in("team_id", teamIds)
    .in("status", PENALTY_MATCH_STATUSES)
    .gte("vote_deadline", sevenDaysAgoIso)
    .lte("vote_deadline", nowIso);

  // 마감 없이 경기일이 지난(최근 7일) 경기
  const { data: noDeadlineMatches } = await db
    .from("matches")
    .select("id, team_id, match_date, opponent_name")
    .in("team_id", teamIds)
    .in("status", PENALTY_MATCH_STATUSES)
    .is("vote_deadline", null)
    .gte("match_date", sevenAgoStrKst)
    .lte("match_date", todayStrKst);

  const seenIds = new Set<string>();
  const matches = [...(deadlineMatches ?? []), ...(noDeadlineMatches ?? [])].filter((m) => {
    if (seenIds.has(m.id)) return false;
    seenIds.add(m.id);
    return true;
  });

  if (matches.length === 0) {
    return NextResponse.json({ message: "No recently-closed matches", created: 0 });
  }

  // 3. 경기별 미투표자 벌금 생성
  let totalCreated = 0;
  // 같은 팀이 같은 날 여러 경기면 면제 조회 반복 호출 → 팀별 1회 캐싱 (86차 perf)
  const exemptionsByTeam = new Map<string, Awaited<ReturnType<typeof getActiveExemptions>>>();
  // 휴회(LEAVE)·부상(INJURED) 회비면제 회원도 미투표 벌금 제외 (정책 2026-06-22, 팀별 캐싱)
  const penaltyExemptByTeam = new Map<string, Set<string>>();

  for (const match of matches) {
    const rule = teamRuleMap.get(match.team_id);
    if (!rule) continue;

    // 활성 멤버
    const { data: members } = await db
      .from("team_members")
      .select("user_id, joined_at")
      .eq("team_id", match.team_id)
      .eq("status", "ACTIVE")
      .not("user_id", "is", null);

    // 가입일 이전 경기는 벌금 대상 아님 — 가입 후의 회원만 (투표 기회가 있던 회원만).
    const allUserIdsRaw = (members ?? [])
      .filter((m) => {
        if (!m.user_id) return false;
        if (!m.joined_at) return true;
        const joinedDateKst = getKstNow(new Date(m.joined_at).getTime())
          .toISOString()
          .slice(0, 10);
        return match.match_date >= joinedDateKst;
      })
      .map((m) => m.user_id) as string[];
    if (allUserIdsRaw.length === 0) continue;

    // 휴면(DORMANT) 회원 제외 (팀별 1회만 조회)
    let exemptions = exemptionsByTeam.get(match.team_id);
    if (!exemptions) {
      exemptions = await getActiveExemptions(match.team_id);
      exemptionsByTeam.set(match.team_id, exemptions);
    }
    // 휴회·부상 회비면제 회원 제외 (선납·키퍼 등 EXEMPT 는 미투표 벌금 부과)
    let penaltyExempt = penaltyExemptByTeam.get(match.team_id);
    if (!penaltyExempt) {
      penaltyExempt = await getPenaltyExemptUserIds(match.team_id);
      penaltyExemptByTeam.set(match.team_id, penaltyExempt);
    }
    const allUserIds = allUserIdsRaw.filter(
      (uid) => !exemptions.has(uid) && !penaltyExempt.has(uid)
    );

    // 투표한 멤버 — 미정(MAYBE)은 '투표함'으로 보지 않음.
    // 마감까지 미정이면 의사표시를 안 한 것으로 간주해 미투표 벌금 대상 (정책 2026-06-25).
    // 참석/불참 같은 확정 의사표시(또는 출석만 기록된 vote=null 행)만 '투표함'으로 인정.
    const { data: voted } = await db
      .from("match_attendance")
      .select("user_id, vote")
      .eq("match_id", match.id)
      .not("user_id", "is", null);

    const votedIds = new Set(
      (voted ?? []).filter((v) => v.vote !== "MAYBE").map((v) => v.user_id)
    );
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
      // ⚠️ (match_id, member_id, rule_id) UNIQUE 제약이 DB에 없어 onConflict upsert 가 항상 에러났음
      // (NO_VOTE 벌금이 전역 0건이던 주원인). existingSet 으로 이미 중복 제거했고 cron 은
      // 단일 일일 실행이라 plain insert 로 충분. 에러는 삼키지 말고 로그.
      const { data: inserted, error } = await db
        .from("penalty_records")
        .insert(newPenalties)
        .select("id");
      if (error) {
        console.error(`[no-vote-penalty] insert 실패 (match ${match.id}):`, error.message);
      } else {
        totalCreated += inserted?.length ?? 0;
      }
    }
  }

  return NextResponse.json({ matches: matches.length, created: totalCreated });
}
