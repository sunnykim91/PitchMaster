import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const memberId = request.nextUrl.searchParams.get("memberId");
  const type = request.nextUrl.searchParams.get("type"); // goals | assists | mvp | attendance
  const seasonId = request.nextUrl.searchParams.get("seasonId");
  const startDate = request.nextUrl.searchParams.get("startDate");
  const endDate = request.nextUrl.searchParams.get("endDate");

  if (!memberId || !type) return apiError("memberId and type required");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // 시즌 날짜 범위 결정
  let dateFrom: string | null = startDate;
  let dateTo: string | null = endDate;
  if (!dateFrom && seasonId) {
    const { data: season } = await db.from("seasons").select("start_date, end_date").eq("id", seasonId).single();
    if (season) {
      dateFrom = season.start_date;
      dateTo = season.end_date;
    }
  }

  // 해당 멤버의 user_id와 team_members.id 모두 확인 (양쪽으로 기록 가능)
  const { data: memberRow } = await db
    .from("team_members")
    .select("id, user_id")
    .eq("team_id", ctx.teamId)
    .or(`user_id.eq.${memberId},id.eq.${memberId}`)
    .limit(1)
    .single();

  const lookupIds: string[] = [];
  if (memberRow) {
    lookupIds.push(memberRow.id);
    if (memberRow.user_id) lookupIds.push(memberRow.user_id);
  } else {
    lookupIds.push(memberId);
  }

  // 경기 목록 조회 (시즌 필터)
  let matchQuery = db
    .from("matches")
    .select("id, match_date, opponent_name, match_type")
    .eq("team_id", ctx.teamId)
    .eq("status", "COMPLETED")
    .neq("stats_included", false);

  if (dateFrom && dateTo) {
    matchQuery = matchQuery.gte("match_date", dateFrom).lte("match_date", dateTo);
  }

  const { data: matches } = await matchQuery;
  if (!matches || matches.length === 0) return apiSuccess({ details: [] });

  const matchIds = matches.map((m) => m.id);
  const matchMap = new Map(matches.map((m) => [m.id, m]));

  // 각 경기 스코어 계산용 전체 골 조회
  const { data: allGoals } = await db
    .from("match_goals")
    .select("match_id, scorer_id, is_own_goal")
    .in("match_id", matchIds);

  const scoreMap = new Map<string, { our: number; their: number }>();
  for (const g of allGoals ?? []) {
    const s = scoreMap.get(g.match_id) ?? { our: 0, their: 0 };
    if (g.scorer_id === "OPPONENT" && !g.is_own_goal) s.their++;
    else if (g.scorer_id !== "OPPONENT" && g.is_own_goal) s.their++;
    else if (g.scorer_id !== "OPPONENT" && !g.is_own_goal) s.our++;
    else if (g.scorer_id === "OPPONENT" && g.is_own_goal) s.our++;
    scoreMap.set(g.match_id, s);
  }

  type DetailRow = { matchId: string; matchDate: string; opponentName: string; count: number; score?: string };
  const details: DetailRow[] = [];

  if (type === "goals") {
    const { data: goals } = await db
      .from("match_goals")
      .select("match_id, scorer_id")
      .in("match_id", matchIds)
      .in("scorer_id", lookupIds)
      .eq("is_own_goal", false);

    const countMap = new Map<string, number>();
    for (const g of goals ?? []) {
      countMap.set(g.match_id, (countMap.get(g.match_id) ?? 0) + 1);
    }
    for (const [matchId, count] of countMap) {
      const m = matchMap.get(matchId);
      if (m) { const sc = scoreMap.get(matchId); details.push({ matchId, matchDate: m.match_date, opponentName: m.opponent_name ?? (m.match_type === "INTERNAL" ? "자체전" : ""), count, score: sc ? `${sc.our}:${sc.their}` : undefined }); }
    }
  } else if (type === "assists") {
    const { data: assists } = await db
      .from("match_goals")
      .select("match_id, assist_id")
      .in("match_id", matchIds)
      .in("assist_id", lookupIds);

    const countMap = new Map<string, number>();
    for (const a of assists ?? []) {
      countMap.set(a.match_id, (countMap.get(a.match_id) ?? 0) + 1);
    }
    for (const [matchId, count] of countMap) {
      const m = matchMap.get(matchId);
      if (m) { const sc = scoreMap.get(matchId); details.push({ matchId, matchDate: m.match_date, opponentName: m.opponent_name ?? (m.match_type === "INTERNAL" ? "자체전" : ""), count, score: sc ? `${sc.our}:${sc.their}` : undefined }); }
    }
  } else if (type === "mvp") {
    // 기록 페이지 MVP 숫자와 일관성 유지 — "확정 winner가 본인인 경기"만 반환.
    // (단순 득표 카운트는 투표받은 모두가 MVP로 찍히는 문제 + 숫자/상세 불일치를 낳음)
    const [mvpRes, attendanceRes, staffRes] = await Promise.all([
      db.from("match_mvp_votes").select("match_id, voter_id, candidate_id, is_staff_decision").in("match_id", matchIds),
      db.from("match_attendance").select("match_id").in("match_id", matchIds).in("attendance_status", ["PRESENT", "LATE"]),
      db.from("team_members").select("user_id").eq("team_id", ctx.teamId).in("role", ["STAFF", "PRESIDENT"]).not("user_id", "is", null),
    ]);
    const attendedPerMatch = new Map<string, number>();
    for (const a of attendanceRes.data ?? []) {
      attendedPerMatch.set(a.match_id, (attendedPerMatch.get(a.match_id) ?? 0) + 1);
    }
    const staffVoterIds = new Set<string>(
      (staffRes.data ?? []).map((m) => m.user_id).filter((id): id is string => !!id)
    );
    type MvpRow = { match_id: string; voter_id: string; candidate_id: string; is_staff_decision: boolean | null };
    const aggByMatch = new Map<string, { votes: string[]; rows: MvpRow[] }>();
    for (const v of (mvpRes.data ?? []) as MvpRow[]) {
      if (!v.candidate_id) continue;
      const agg = aggByMatch.get(v.match_id) ?? { votes: [], rows: [] };
      agg.votes.push(v.candidate_id);
      agg.rows.push(v);
      aggByMatch.set(v.match_id, agg);
    }
    const { resolveValidMvp, pickStaffDecision } = await import("@/lib/mvpThreshold");
    for (const [matchId, agg] of aggByMatch) {
      const staffDecision = pickStaffDecision(agg.rows, staffVoterIds);
      const winner = resolveValidMvp(agg.votes, attendedPerMatch.get(matchId) ?? 0, staffDecision);
      if (!winner || !lookupIds.includes(winner)) continue;
      const m = matchMap.get(matchId);
      if (m) {
        const sc = scoreMap.get(matchId);
        details.push({
          matchId,
          matchDate: m.match_date,
          opponentName: m.opponent_name ?? (m.match_type === "INTERNAL" ? "자체전" : ""),
          count: 1,
          score: sc ? `${sc.our}:${sc.their}` : undefined,
        });
      }
    }
  } else if (type === "attendance") {
    const { data: attendance } = await db
      .from("match_attendance")
      .select("match_id, user_id, member_id")
      .in("match_id", matchIds)
      .eq("vote", "ATTEND");

    const attendedSet = new Set<string>();
    for (const a of attendance ?? []) {
      if (lookupIds.includes(a.user_id) || lookupIds.includes(a.member_id)) {
        attendedSet.add(a.match_id);
      }
    }
    for (const matchId of attendedSet) {
      const m = matchMap.get(matchId);
      if (m) { const sc = scoreMap.get(matchId); details.push({ matchId, matchDate: m.match_date, opponentName: m.opponent_name ?? (m.match_type === "INTERNAL" ? "자체전" : ""), count: 1, score: sc ? `${sc.our}:${sc.their}` : undefined }); }
    }
  } else {
    return apiError("type must be goals, assists, mvp, or attendance");
  }

  // 날짜 내림차순 정렬
  details.sort((a, b) => b.matchDate.localeCompare(a.matchDate));

  return apiSuccess({ details });
}
