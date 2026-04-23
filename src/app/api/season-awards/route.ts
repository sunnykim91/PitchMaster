import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  generateSeasonSummary,
  awardContext,
} from "@/lib/playerCardUtils";

type MemberRow = {
  id: string;
  user_id: string | null;
  pre_name: string | null;
  users:
    | { id: string; name: string }
    | { id: string; name: string }[]
    | null;
};

type AwardEntry = {
  name: string;
  value: number | string;
  label: string;
  [key: string]: unknown;
};

type BestMatchEntry = {
  date: string;
  opponent: string;
  score: string;
  label: string;
};

export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const seasonId = request.nextUrl.searchParams.get("seasonId");
  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // 팀 이름 조회
  const { data: team } = await db
    .from("teams")
    .select("name")
    .eq("id", ctx.teamId)
    .single();
  const teamName = team?.name ?? "PitchMaster";

  // 시즌 조회 (지정 or 활성)
  let season: { id: string; start_date: string; end_date: string; name?: string } | null = null;
  if (seasonId) {
    const { data } = await db
      .from("seasons")
      .select("id, start_date, end_date, name")
      .eq("id", seasonId)
      .eq("team_id", ctx.teamId)
      .single();
    season = data;
  } else {
    const { data } = await db
      .from("seasons")
      .select("id, start_date, end_date, name, is_active")
      .eq("team_id", ctx.teamId)
      .order("start_date", { ascending: false });
    const list = data ?? [];
    season =
      list.find((s: { is_active: boolean }) => s.is_active) ?? list[0] ?? null;
  }

  if (!season) {
    return apiSuccess({
      awards: {},
      seasonName: "",
      teamName,
      totalMatches: 0,
      record: { wins: 0, draws: 0, losses: 0 },
    });
  }

  const seasonName =
    season.name ?? season.start_date?.slice(0, 4) ?? "";

  // 해당 시즌 COMPLETED + stats_included 경기 조회
  const { data: matches } = await db
    .from("matches")
    .select("id, match_date, opponent_name")
    .eq("team_id", ctx.teamId)
    .eq("status", "COMPLETED")
    .neq("stats_included", false)
    .gte("match_date", season.start_date)
    .lte("match_date", season.end_date)
    .order("match_date", { ascending: false });

  const matchList = matches ?? [];
  const matchIds = matchList.map((m) => m.id);
  const totalMatches = matchIds.length;

  if (totalMatches === 0) {
    return apiSuccess({
      awards: {},
      seasonName,
      teamName,
      totalMatches: 0,
      record: { wins: 0, draws: 0, losses: 0 },
    });
  }

  // 멤버 조회 (ACTIVE + DORMANT)
  const { data: members } = await db
    .from("team_members")
    .select("id, user_id, pre_name, users(id, name)")
    .eq("team_id", ctx.teamId)
    .in("status", ["ACTIVE", "DORMANT"]);

  const typedMembers = (members ?? []) as MemberRow[];

  // ID → 이름 매핑
  const idToName = new Map<string, string>();
  for (const m of typedMembers) {
    const user = Array.isArray(m.users) ? m.users[0] : m.users;
    const name = user?.name ?? m.pre_name ?? "";
    if (name) {
      if (m.user_id) idToName.set(m.user_id, name);
      idToName.set(m.id, name);
    }
  }

  // member → lookup IDs (user_id + member.id 양쪽)
  const memberLookups = typedMembers.map((m) => ({
    ids: m.user_id ? [m.user_id, m.id] : [m.id],
    name:
      (Array.isArray(m.users) ? m.users[0] : m.users)?.name ??
      m.pre_name ??
      "",
    userId: m.user_id,
    memberId: m.id,
  }));

  // Bulk 데이터 조회
  const [goalsRes, mvpRes, attendanceRes, actualAttendRes] = await Promise.all([
    db
      .from("match_goals")
      .select("match_id, scorer_id, assist_id, is_own_goal")
      .in("match_id", matchIds),
    db
      .from("match_mvp_votes")
      .select("match_id, voter_id, candidate_id, is_staff_decision")
      .in("match_id", matchIds),
    db
      .from("match_attendance")
      .select("match_id, user_id, member_id, vote")
      .in("match_id", matchIds)
      .eq("vote", "ATTEND"),
    // 실제 참석자 — MVP 70% 임계값 판정용
    db
      .from("match_attendance")
      .select("match_id")
      .in("match_id", matchIds)
      .in("attendance_status", ["PRESENT", "LATE"]),
  ]);

  const allGoals = goalsRes.data ?? [];
  const allMvpVotes = mvpRes.data ?? [];
  const allAttendance = attendanceRes.data ?? [];

  // === 경기별 스코어 계산 (팀 전적 + 베스트매치) ===
  const matchScores = new Map<
    string,
    { our: number; opp: number }
  >();
  for (const g of allGoals) {
    if (!matchScores.has(g.match_id))
      matchScores.set(g.match_id, { our: 0, opp: 0 });
    const s = matchScores.get(g.match_id)!;
    if (g.scorer_id === "OPPONENT" || g.is_own_goal) s.opp++;
    else s.our++;
  }

  let wins = 0,
    draws = 0,
    losses = 0;
  for (const mid of matchIds) {
    const s = matchScores.get(mid) ?? { our: 0, opp: 0 };
    if (s.our > s.opp) wins++;
    else if (s.our === s.opp) draws++;
    else losses++;
  }

  // === 1. 득점왕 ===
  const goalMap = new Map<string, number>();
  for (const g of allGoals) {
    if (g.scorer_id && g.scorer_id !== "OPPONENT" && !g.is_own_goal) {
      goalMap.set(g.scorer_id, (goalMap.get(g.scorer_id) ?? 0) + 1);
    }
  }

  // 멤버별 골 합산 (user_id, member_id 양쪽)
  let topScorer: AwardEntry | null = null;
  {
    let maxGoals = 0;
    let bestName = "";
    for (const m of memberLookups) {
      const total = m.ids.reduce(
        (sum, id) => sum + (goalMap.get(id) ?? 0),
        0
      );
      if (total > maxGoals) {
        maxGoals = total;
        bestName = m.name;
      }
    }
    if (maxGoals > 0) {
      topScorer = {
        name: bestName,
        value: maxGoals,
        label: "득점왕",
      };
    }
  }

  // === 2. 도움왕 ===
  const assistMap = new Map<string, number>();
  for (const g of allGoals) {
    if (g.assist_id) {
      assistMap.set(
        g.assist_id,
        (assistMap.get(g.assist_id) ?? 0) + 1
      );
    }
  }

  let topAssist: AwardEntry | null = null;
  {
    let maxAssists = 0;
    let bestName = "";
    for (const m of memberLookups) {
      const total = m.ids.reduce(
        (sum, id) => sum + (assistMap.get(id) ?? 0),
        0
      );
      if (total > maxAssists) {
        maxAssists = total;
        bestName = m.name;
      }
    }
    if (maxAssists > 0) {
      topAssist = {
        name: bestName,
        value: maxAssists,
        label: "도움왕",
      };
    }
  }

  // === 3. 출석왕 (최소 50% 이상 경기 출전) ===
  const attendByUser = new Map<string, number>();
  const attendByMember = new Map<string, number>();
  for (const row of allAttendance) {
    if (row.user_id)
      attendByUser.set(
        row.user_id,
        (attendByUser.get(row.user_id) ?? 0) + 1
      );
    if (row.member_id)
      attendByMember.set(
        row.member_id,
        (attendByMember.get(row.member_id) ?? 0) + 1
      );
  }

  let topAttendance: AwardEntry | null = null;
  {
    let maxRate = 0;
    let bestName = "";
    const minGames = Math.ceil(totalMatches * 0.5);
    for (const m of memberLookups) {
      const attended = Math.max(
        m.userId ? (attendByUser.get(m.userId) ?? 0) : 0,
        attendByMember.get(m.memberId) ?? 0
      );
      if (attended >= minGames) {
        const rate = attended / totalMatches;
        if (rate > maxRate) {
          maxRate = rate;
          bestName = m.name;
        }
      }
    }
    if (maxRate > 0) {
      topAttendance = {
        name: bestName,
        value: `${Math.round(maxRate * 100)}%`,
        label: "출석왕",
      };
    }
  }

  // === 4. MOM (경기별 최다득표자 집계) ===
  // 경기별 winner 한 명만 카운트. 투표율 70% 미달이면 "MVP 없음" → 아무도 카운트 안 됨.
  // 운영진 직접 지정(is_staff_decision)은 투표율 무관 즉시 확정.
  const { resolveValidMvp, pickStaffDecision } = await import("@/lib/mvpThreshold");
  const { data: staffMembersData } = await db
    .from("team_members")
    .select("user_id")
    .eq("team_id", ctx.teamId)
    .in("role", ["STAFF", "PRESIDENT"])
    .not("user_id", "is", null);
  const staffVoterIds = new Set<string>(
    (staffMembersData ?? []).map((m) => m.user_id).filter((id): id is string => !!id)
  );
  const attendedPerMatch = new Map<string, number>();
  for (const a of actualAttendRes.data ?? []) {
    attendedPerMatch.set(a.match_id, (attendedPerMatch.get(a.match_id) ?? 0) + 1);
  }
  type MvpRow = { match_id: string; voter_id: string; candidate_id: string; is_staff_decision: boolean | null };
  const mvpAggByMatch = new Map<string, { votes: string[]; rows: MvpRow[] }>();
  for (const v of allMvpVotes as MvpRow[]) {
    if (!v.candidate_id) continue;
    const agg = mvpAggByMatch.get(v.match_id) ?? { votes: [], rows: [] };
    agg.votes.push(v.candidate_id);
    agg.rows.push(v);
    mvpAggByMatch.set(v.match_id, agg);
  }
  const mvpMap = new Map<string, number>();
  for (const [mid, agg] of mvpAggByMatch) {
    const staffDecision = pickStaffDecision(agg.rows, staffVoterIds);
    const winner = resolveValidMvp(agg.votes, attendedPerMatch.get(mid) ?? 0, staffDecision);
    if (winner) mvpMap.set(winner, (mvpMap.get(winner) ?? 0) + 1);
  }

  let topMvp: AwardEntry | null = null;
  {
    let maxMvp = 0;
    let bestName = "";
    for (const m of memberLookups) {
      const total = m.ids.reduce(
        (sum, id) => sum + (mvpMap.get(id) ?? 0),
        0
      );
      if (total > maxMvp) {
        maxMvp = total;
        bestName = m.name;
      }
    }
    if (maxMvp > 0) {
      topMvp = {
        name: bestName,
        value: maxMvp,
        label: "MOM",
      };
    }
  }

  // === 5. 철벽수비 (출전 경기 중 클린시트 수) ===
  // 경기별 출전 멤버 목록
  const matchAttendees = new Map<string, Set<string>>();
  for (const row of allAttendance) {
    const mid = row.match_id;
    if (!matchAttendees.has(mid)) matchAttendees.set(mid, new Set());
    const set = matchAttendees.get(mid)!;
    if (row.user_id) set.add(row.user_id);
    if (row.member_id) set.add(row.member_id);
  }

  // 클린시트 경기 (상대팀 골 0)
  const cleanSheetMatches = new Set<string>();
  for (const mid of matchIds) {
    const s = matchScores.get(mid) ?? { our: 0, opp: 0 };
    if (s.opp === 0) cleanSheetMatches.add(mid);
  }

  let ironWall: AwardEntry | null = null;
  {
    let maxCS = 0;
    let bestName = "";
    for (const m of memberLookups) {
      let cs = 0;
      for (const csMid of cleanSheetMatches) {
        const attendees = matchAttendees.get(csMid);
        if (attendees && m.ids.some((id) => attendees.has(id))) {
          cs++;
        }
      }
      if (cs > maxCS) {
        maxCS = cs;
        bestName = m.name;
      }
    }
    if (maxCS > 0) {
      ironWall = {
        name: bestName,
        value: maxCS,
        cleanSheets: maxCS,
        label: "철벽수비",
      };
    }
  }

  // === 6. 승리요정 (최소 5경기 이상 출전, 최고 승률) ===
  // 경기별 승패 판정
  const matchResult = new Map<string, "W" | "D" | "L">();
  for (const mid of matchIds) {
    const s = matchScores.get(mid) ?? { our: 0, opp: 0 };
    if (s.our > s.opp) matchResult.set(mid, "W");
    else if (s.our === s.opp) matchResult.set(mid, "D");
    else matchResult.set(mid, "L");
  }

  let luckyCharm: AwardEntry | null = null;
  {
    let maxWinRate = 0;
    let bestName = "";
    const minAppearances = 5;
    for (const m of memberLookups) {
      let played = 0;
      let memberWins = 0;
      for (const mid of matchIds) {
        const attendees = matchAttendees.get(mid);
        if (attendees && m.ids.some((id) => attendees.has(id))) {
          played++;
          if (matchResult.get(mid) === "W") memberWins++;
        }
      }
      if (played >= minAppearances) {
        const wr = memberWins / played;
        if (wr > maxWinRate) {
          maxWinRate = wr;
          bestName = m.name;
        }
      }
    }
    if (maxWinRate > 0) {
      luckyCharm = {
        name: bestName,
        value: `${Math.round(maxWinRate * 100)}%`,
        winRate: Math.round(maxWinRate * 100) / 100,
        label: "승리요정",
      };
    }
  }

  // === 7. 베스트매치 (가장 큰 득점차 승리) ===
  let bestMatch: BestMatchEntry | null = null;
  {
    let maxDiff = 0;
    let bestMid = "";
    for (const mid of matchIds) {
      const s = matchScores.get(mid) ?? { our: 0, opp: 0 };
      const diff = s.our - s.opp;
      if (diff > maxDiff) {
        maxDiff = diff;
        bestMid = mid;
      }
    }
    if (bestMid && maxDiff > 0) {
      const match = matchList.find((m) => m.id === bestMid);
      const s = matchScores.get(bestMid)!;
      bestMatch = {
        date: match?.match_date ?? "",
        opponent: match?.opponent_name ?? "",
        score: `${s.our}:${s.opp}`,
        label: "베스트매치",
      };
    }
  }

  // 어워드별 컨텍스트 라벨 부착
  if (topScorer) {
    const ctx = awardContext("topScorer", Number(topScorer.value), totalMatches);
    if (ctx) topScorer.context = ctx;
  }
  if (topAssist) {
    const ctx = awardContext("topAssist", Number(topAssist.value), totalMatches);
    if (ctx) topAssist.context = ctx;
  }
  if (topMvp) {
    const ctx = awardContext("topMvp", Number(topMvp.value), totalMatches);
    if (ctx) topMvp.context = ctx;
  }
  if (ironWall) {
    const ctx = awardContext("ironWall", Number(ironWall.value), totalMatches);
    if (ctx) ironWall.context = ctx;
  }
  if (luckyCharm) {
    const ctx = awardContext("luckyCharm", 0, totalMatches);
    if (ctx) luckyCharm.context = ctx;
  }

  // 시즌 MVP 자동 선정 — topScorer > topMvp > topAssist 우선순위로 가장 임팩트 있는 1명
  let mvpAward: { name: string; signature: string; keyStats: Array<{ label: string; value: string | number }> } | null = null;
  const pickName = (a: AwardEntry | null) => (a ? a.name : null);
  const mvpName = pickName(topScorer) ?? pickName(topMvp) ?? pickName(topAssist);
  if (mvpName) {
    const keyStats: Array<{ label: string; value: string | number }> = [];
    if (topScorer && topScorer.name === mvpName)
      keyStats.push({ label: "골", value: topScorer.value });
    if (topAssist && topAssist.name === mvpName)
      keyStats.push({ label: "어시", value: topAssist.value });
    if (topMvp && topMvp.name === mvpName)
      keyStats.push({ label: "MOM", value: topMvp.value });
    if (topAttendance && topAttendance.name === mvpName)
      keyStats.push({ label: "출석률", value: topAttendance.value });
    if (ironWall && ironWall.name === mvpName)
      keyStats.push({ label: "클린시트", value: ironWall.value });

    // 시그니처 캐치프레이즈
    const goalsVal = topScorer && topScorer.name === mvpName ? Number(topScorer.value) : 0;
    const assistsVal = topAssist && topAssist.name === mvpName ? Number(topAssist.value) : 0;
    const mvpVal = topMvp && topMvp.name === mvpName ? Number(topMvp.value) : 0;
    let sig = `${mvpName} — 이 시즌의 주인공`;
    if (goalsVal > 0 && assistsVal > 0)
      sig = `${goalsVal}골 ${assistsVal}어시 — 이 시즌의 주인공`;
    else if (goalsVal > 0) sig = `${goalsVal}골 — 시즌의 득점왕`;
    else if (mvpVal > 0) sig = `${mvpVal}회 MOM — 팀의 주인공`;
    else if (assistsVal > 0) sig = `${assistsVal}어시 — 시즌의 도움왕`;

    mvpAward = { name: mvpName, signature: sig, keyStats };
  }

  // 결과 조합
  const awards: Record<string, AwardEntry | BestMatchEntry> = {};
  if (topScorer) awards.topScorer = topScorer;
  if (topAssist) awards.topAssist = topAssist;
  if (topAttendance) awards.topAttendance = topAttendance;
  if (topMvp) awards.topMvp = topMvp;
  if (ironWall) awards.ironWall = ironWall;
  if (luckyCharm) awards.luckyCharm = luckyCharm;
  if (bestMatch) awards.bestMatch = bestMatch;

  return apiSuccess({
    awards,
    seasonName,
    teamName,
    totalMatches,
    record: { wins, draws, losses },
    mvp: mvpAward,
    seasonSummary: generateSeasonSummary({ wins, draws, losses }, totalMatches),
  });
}
