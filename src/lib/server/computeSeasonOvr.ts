import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateOVR, classifyPosition } from "@/lib/playerCardUtils";
import { resolveValidMvp, pickStaffDecision } from "@/lib/mvpThreshold";

/**
 * 단일 팀·시즌 기준으로 여러 선수의 OVR 을 한 번에 계산.
 *
 * /player/[memberId]/page.tsx 의 로직 중 OVR 산출 부분만 발췌.
 * 경기 후 크론에서 출석자들의 OVR 변동 감지용.
 *
 * 성능:
 *   - 팀 단위 골/어시/MVP/출석 조회는 1회씩만 수행
 *   - 선수별 반복 없이 Map 으로 집계 → O(전체 경기 수 × 골수)
 *
 * 반환:
 *   Map<teamMemberId, { ovr, matchCount }>
 */
export async function computeTeamSeasonOvrs(
  db: SupabaseClient,
  teamId: string,
): Promise<Map<string, { ovr: number; matchCount: number }>> {
  const result = new Map<string, { ovr: number; matchCount: number }>();

  // 활성 시즌
  const { data: season } = await db
    .from("seasons")
    .select("id, start_date, end_date")
    .eq("team_id", teamId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (!season) return result;

  // 시즌 내 COMPLETED 경기 (stats_included 반영)
  const { data: matches } = await db
    .from("matches")
    .select("id")
    .eq("team_id", teamId)
    .eq("status", "COMPLETED")
    .neq("stats_included", false)
    .gte("match_date", season.start_date)
    .lte("match_date", season.end_date);
  const matchIds = (matches ?? []).map((m: { id: string }) => m.id);
  if (matchIds.length === 0) return result;

  // 팀 멤버 + 포지션
  const { data: membersData } = await db
    .from("team_members")
    .select("id, user_id, users(preferred_positions)")
    .eq("team_id", teamId)
    .in("status", ["ACTIVE", "DORMANT"])
    .not("user_id", "is", null);
  type MemberRow = {
    id: string;
    user_id: string | null;
    users: { preferred_positions: string[] | null } | { preferred_positions: string[] | null }[] | null;
  };
  const members = (membersData ?? []) as MemberRow[];
  if (members.length === 0) return result;

  // 골/어시/MVP/출석/운영진 병렬 조회
  const [goalsRes, assistsRes, mvpRes, attendRes, goalsAllRes, attendActualRes, staffRes] = await Promise.all([
    db.from("match_goals").select("match_id, scorer_id").in("match_id", matchIds).eq("is_own_goal", false),
    db.from("match_goals").select("match_id, assist_id").in("match_id", matchIds).not("assist_id", "is", null),
    db.from("match_mvp_votes").select("match_id, voter_id, candidate_id, is_staff_decision").in("match_id", matchIds),
    db.from("match_attendance").select("match_id, user_id, member_id").in("match_id", matchIds).eq("vote", "ATTEND"),
    db.from("match_goals").select("match_id, scorer_id, is_own_goal").in("match_id", matchIds),
    db.from("match_attendance").select("match_id").in("match_id", matchIds).in("attendance_status", ["PRESENT", "LATE"]),
    db.from("team_members").select("user_id").eq("team_id", teamId).in("role", ["STAFF", "PRESIDENT"]).not("user_id", "is", null),
  ]);

  type GoalRow = { match_id: string; scorer_id: string };
  type AssistRow = { match_id: string; assist_id: string };
  type MvpRow = { match_id: string; voter_id: string; candidate_id: string; is_staff_decision: boolean | null };
  type AttendRow = { match_id: string; user_id: string | null; member_id: string | null };
  type GoalAllRow = { match_id: string; scorer_id: string; is_own_goal: boolean };

  // 경기별 스코어 집계
  const scoreByMatch = new Map<string, { our: number; opp: number }>();
  for (const g of (goalsAllRes.data ?? []) as GoalAllRow[]) {
    const s = scoreByMatch.get(g.match_id) ?? { our: 0, opp: 0 };
    if (g.scorer_id === "OPPONENT" || g.is_own_goal) s.opp++;
    else s.our++;
    scoreByMatch.set(g.match_id, s);
  }

  // 경기별 실제 출석자 수 (MVP threshold 계산용)
  const attendedPerMatch = new Map<string, number>();
  for (const a of attendActualRes.data ?? []) {
    const mid = (a as { match_id: string }).match_id;
    attendedPerMatch.set(mid, (attendedPerMatch.get(mid) ?? 0) + 1);
  }
  const staffVoterIds = new Set<string>(
    (staffRes.data ?? [])
      .map((m) => (m as { user_id: string | null }).user_id)
      .filter((id): id is string => !!id),
  );

  // 경기별 MVP winner
  const mvpVotesByMatch = new Map<string, { votes: string[]; rows: MvpRow[] }>();
  for (const v of (mvpRes.data ?? []) as MvpRow[]) {
    if (!v.candidate_id) continue;
    const agg = mvpVotesByMatch.get(v.match_id) ?? { votes: [], rows: [] };
    agg.votes.push(v.candidate_id);
    agg.rows.push(v);
    mvpVotesByMatch.set(v.match_id, agg);
  }
  const mvpWinnerByMatch = new Map<string, string>();
  for (const [mid, agg] of mvpVotesByMatch) {
    const staffDecision = pickStaffDecision(agg.rows, staffVoterIds);
    const winner = resolveValidMvp(agg.votes, attendedPerMatch.get(mid) ?? 0, staffDecision);
    if (winner) mvpWinnerByMatch.set(mid, winner);
  }

  // 선수별 집계
  for (const mem of members) {
    const lookupIds: string[] = mem.user_id ? [mem.user_id, mem.id] : [mem.id];
    const userObj = Array.isArray(mem.users) ? mem.users[0] : mem.users;
    const positions = userObj?.preferred_positions ?? [];
    const cat = classifyPosition(positions);

    // 출석한 경기
    const attendedMatchIds = new Set<string>();
    for (const a of (attendRes.data ?? []) as AttendRow[]) {
      if ((a.user_id && lookupIds.includes(a.user_id)) || (a.member_id && lookupIds.includes(a.member_id))) {
        attendedMatchIds.add(a.match_id);
      }
    }
    const attended = attendedMatchIds.size;
    if (attended === 0) {
      result.set(mem.id, { ovr: 45, matchCount: 0 });
      continue;
    }

    const myGoals = ((goalsRes.data ?? []) as GoalRow[]).filter((g) => lookupIds.includes(g.scorer_id));
    const myAssists = ((assistsRes.data ?? []) as AssistRow[]).filter((a) => lookupIds.includes(a.assist_id));
    const myMvpCount = [...mvpWinnerByMatch.values()].filter((w) => lookupIds.includes(w)).length;

    // 출석 경기 기준 승률·클린시트·실점
    let wins = 0;
    let cleanSheets = 0;
    let conceded = 0;
    for (const mid of attendedMatchIds) {
      const s = scoreByMatch.get(mid) ?? { our: 0, opp: 0 };
      if (s.opp === 0) cleanSheets++;
      if (s.our > s.opp) wins++;
      conceded += s.opp;
    }

    const ovr = calculateOVR(
      cat,
      myGoals.length / attended,
      myAssists.length / attended,
      attended / matchIds.length,
      myMvpCount / attended,
      wins / attended,
      cleanSheets / attended,
      conceded / attended,
      attended,
    );

    result.set(mem.id, { ovr, matchCount: attended });
  }

  return result;
}
