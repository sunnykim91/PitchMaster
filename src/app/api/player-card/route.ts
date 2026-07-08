import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isValidUuid } from "@/lib/validators/uuid";
import { kstDateString, isEligibleMatch } from "@/lib/attendanceEligibility";
import {
  classifyPosition,
  getRarity,
  getHeroStatKey,
  generateSignature,
  computeRankLabel,
  computeStreak,
  calculateOVR,
  type PositionCategory,
} from "@/lib/playerCardUtils";

type PosCategory = PositionCategory;

// 포지션별 시그니처 hero stat 키 (PlayerCard JSON 의 isHero 마킹용)
// — 라우트 내 stats key 와 매칭: goals/assists/cleanSheet
function statKeyToHero(cat: PosCategory): string {
  return getHeroStatKey(cat);
}

// 포지션 카테고리별 표시할 스탯 6개 정의
type StatDef = { label: string; key: string };

const STAT_DEFS: Record<PosCategory, StatDef[]> = {
  GK: [
    { label: "클린시트", key: "cleanSheet" },
    { label: "경기당실점", key: "concededPerGame" },
    { label: "승률", key: "winRate" },
    { label: "출석률", key: "attendanceRate" },
    { label: "MOM", key: "mvp" },
    { label: "경기", key: "matchCount" },
  ],
  DEF: [
    { label: "클린시트", key: "cleanSheet" },
    { label: "승률", key: "winRate" },
    { label: "출석률", key: "attendanceRate" },
    { label: "MOM", key: "mvp" },
    { label: "경기당실점", key: "concededPerGame" },
    { label: "경기", key: "matchCount" },
  ],
  MID: [
    { label: "어시", key: "assists" },
    { label: "골", key: "goals" },
    { label: "MOM", key: "mvp" },
    { label: "승률", key: "winRate" },
    { label: "출석률", key: "attendanceRate" },
    { label: "경기", key: "matchCount" },
  ],
  FW: [
    { label: "골", key: "goals" },
    { label: "어시", key: "assists" },
    { label: "공격P", key: "attackPoints" },
    { label: "MOM", key: "mvp" },
    { label: "출석률", key: "attendanceRate" },
    { label: "경기", key: "matchCount" },
  ],
  DEFAULT: [
    { label: "골", key: "goals" },
    { label: "어시", key: "assists" },
    { label: "MOM", key: "mvp" },
    { label: "출석률", key: "attendanceRate" },
    { label: "승률", key: "winRate" },
    { label: "경기", key: "matchCount" },
  ],
};

// 색상 밝기 조정
function adjustColor(hex: string, amount: number): string {
  const clean = hex.replace("#", "");
  const r = Math.max(0, Math.min(255, parseInt(clean.slice(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(clean.slice(2, 4), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(clean.slice(4, 6), 16) + amount));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

// 스탯 값 포맷
function formatStat(key: string, stats: Record<string, number>): string {
  switch (key) {
    case "attendanceRate":
    case "winRate":
      return `${Math.round((stats[key] ?? 0) * 100)}%`;
    case "concededPerGame":
      return (stats[key] ?? 0).toFixed(1);
    default:
      return String(stats[key] ?? 0);
  }
}

// 이름 포맷 (공백으로 벌리기)
function formatName(name: string): string {
  if (name.length <= 4) return name.split("").join(" ");
  return name;
}

// SVG XML 특수문자 이스케이프
function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const memberId = request.nextUrl.searchParams.get("memberId");
  if (!memberId) return apiError("memberId required");
  // .or() 보간 방어
  if (!isValidUuid(memberId)) return apiError("invalid memberId");
  const seasonId = request.nextUrl.searchParams.get("seasonId");
  const format = request.nextUrl.searchParams.get("format"); // "json" | null
  const isJson = format === "json";

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // 1. 멤버 정보 조회 (team_members + users 조인)
  const { data: memberData } = await db
    .from("team_members")
    .select("id, user_id, pre_name, jersey_number, joined_at, users(id, name, preferred_positions)")
    .eq("team_id", ctx.teamId)
    .or(`user_id.eq.${memberId},id.eq.${memberId}`)
    .limit(1)
    .single();

  if (!memberData) return apiError("Member not found", 404);

  const user = Array.isArray(memberData.users) ? memberData.users[0] : memberData.users;
  const playerName = (user?.name ?? memberData.pre_name ?? "선수") as string;
  const positions = (user?.preferred_positions ?? []) as string[];
  const jerseyNumber = (memberData.jersey_number as number | null) ?? null;
  const userId = (memberData.user_id as string | null) ?? (memberData.id as string);
  const tmMemberId = memberData.id as string;

  // 2. 시즌 정보 조회
  let season: { id: string; name: string; start_date: string; end_date: string } | null = null;
  if (seasonId) {
    const { data } = await db
      .from("seasons")
      .select("id, name, start_date, end_date")
      .eq("id", seasonId)
      .eq("team_id", ctx.teamId)
      .single();
    season = data;
  } else {
    const { data } = await db
      .from("seasons")
      .select("id, name, start_date, end_date")
      .eq("team_id", ctx.teamId)
      .eq("is_active", true)
      .single();
    season = data;
  }
  if (!season) return apiError("Season not found", 404);

  // 3. 팀 정보 (이름, 유니폼 색상)
  const { data: team } = await db
    .from("teams")
    .select("name, uniform_primary, uniform_secondary")
    .eq("id", ctx.teamId)
    .single();

  const teamName = (team?.name ?? "TEAM") as string;
  const primaryColor = ((team?.uniform_primary as string | null) ?? "#0b1428") as string;

  // 4. 시즌 기간 내 COMPLETED 경기 조회 — 자체전 중 전적 반영 안 함은 제외
  const { data: matches } = await db
    .from("matches")
    .select("id, match_date, match_type")
    .eq("team_id", ctx.teamId)
    .eq("status", "COMPLETED")
    .neq("stats_included", false)
    .gte("match_date", season.start_date)
    .lte("match_date", season.end_date)
    .order("match_date", { ascending: false });

  // 출석률·연속기록 분모는 가입(joined_at) 이후 경기만 — 가입 전 경기를 결석으로 세지 않음.
  const joinKst = kstDateString((memberData.joined_at as string | null) ?? null);
  const allMatchIds = (matches ?? []).map((m) => m.id);
  // 자체전: 선수가 A/B/C 한 팀 소속이라 "우리 vs 상대" 승/클린시트가 성립 안 함 → 승률·클린시트·실점 집계에서 제외 (골·어시·MVP·출전수엔 포함)
  const internalMatchIds = new Set((matches ?? []).filter((m) => m.match_type === "INTERNAL").map((m) => m.id));
  const totalMatches = allMatchIds.length;

  if (totalMatches === 0) {
    // 경기가 없으면 기본 카드 반환
    const cat = classifyPosition(positions);
    const ovr = 45;
    const statDefs = STAT_DEFS[cat];
    const stats: Record<string, number> = {
      goals: 0, assists: 0, mvp: 0, attackPoints: 0,
      attendanceRate: 0, winRate: 0, cleanSheet: 0,
      concededPerGame: 0, matchCount: 0,
    };

    if (isJson) {
      return apiSuccess({
        ovr,
        rarity: getRarity(ovr),
        positionLabel: positions[0] ?? "-",
        positionCategory: cat,
        playerName,
        jerseyNumber,
        teamName,
        teamPrimaryColor: primaryColor,
        seasonName: season.name,
        signature: "곧 첫 경기를 기다리는 선수",
        stats: statDefs.map((def) => ({
          label: def.label,
          value: formatStat(def.key, stats),
          isHero: def.key === statKeyToHero(cat),
        })),
      });
    }

    const svg = buildSvg(
      ovr, positions[0] ?? "-", teamName, playerName,
      jerseyNumber, statDefs, stats, primaryColor, season.name
    );
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  // 5. 해당 선수 출전 경기 필터 (match_attendance)
  const lookupIds = memberData.user_id ? [userId, tmMemberId] : [tmMemberId];
  const { data: attendanceData } = await db
    .from("match_attendance")
    .select("match_id, user_id, member_id")
    .in("match_id", allMatchIds)
    .eq("vote", "ATTEND");

  // 선수가 출전한 경기 ID 세트
  const attendedMatchIds = new Set<string>();
  for (const row of attendanceData ?? []) {
    if (lookupIds.includes(row.user_id) || lookupIds.includes(row.member_id)) {
      attendedMatchIds.add(row.match_id);
    }
  }
  const matchCount = attendedMatchIds.size;

  // 출석률·연속 분모 = 가입(joined_at) 이후 경기. 단 가입 전 출석 기록이 있으면(과거 데이터 이관 멤버)
  // 가입일 게이트를 무시하고 시즌 전체를 분모로 — records 탭의 computeAttendanceRateWithHistory와 동일 규칙.
  const attendedDates = (matches ?? []).filter((m) => attendedMatchIds.has(m.id)).map((m) => m.match_date as string);
  const hasPreJoinAttendance = !!joinKst && attendedDates.some((d) => d < joinKst);
  const eligibleMatches = (matches ?? []).filter((m) =>
    isEligibleMatch(m.match_date as string, hasPreJoinAttendance ? null : joinKst),
  );

  // 6. 골/어시/MVP 조회
  const [goalsRes, assistsRes, mvpRes, allGoalsRes, actualAttendRes] = await Promise.all([
    db.from("match_goals").select("scorer_id").in("match_id", allMatchIds).eq("is_own_goal", false),
    db.from("match_goals").select("assist_id").in("match_id", allMatchIds).not("assist_id", "is", null),
    db.from("match_mvp_votes").select("match_id, voter_id, candidate_id, is_staff_decision, created_at").in("match_id", allMatchIds),
    db.from("match_goals").select("match_id, scorer_id, is_own_goal").in("match_id", allMatchIds),
    db.from("match_attendance").select("match_id").in("match_id", allMatchIds).in("attendance_status", ["PRESENT", "LATE"]),
  ]);

  // 선수 골/어시/MVP 카운트
  let goals = 0;
  for (const row of goalsRes.data ?? []) {
    if (lookupIds.includes(row.scorer_id)) goals++;
  }

  let assists = 0;
  for (const row of assistsRes.data ?? []) {
    if (lookupIds.includes(row.assist_id)) assists++;
  }

  // MVP — 경기별 winner(정책 검증) 단일소스. 본인 카운트 + 팀 랭킹 풀(아래 9-2) 양쪽에 사용.
  const { resolveMvpWinnersByMatch } = await import("@/lib/mvpThreshold");
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
  // 새 MVP 정책 (mvp_vote_staff_only=OFF + match_date >= 2026-05-04)
  const { data: teamSettingsForMvp } = await db.from("teams").select("mvp_vote_staff_only").eq("id", ctx.teamId).maybeSingle();
  const mvpVoteStaffOnly = (teamSettingsForMvp as { mvp_vote_staff_only?: boolean } | null)?.mvp_vote_staff_only ?? false;
  const matchDateById = new Map<string, string>();
  for (const m of matches ?? []) matchDateById.set(m.id, m.match_date);

  const mvpWinnersByMatch = resolveMvpWinnersByMatch(
    (mvpRes.data ?? []) as Parameters<typeof resolveMvpWinnersByMatch>[0],
    attendedPerMatch, matchDateById, staffVoterIds, mvpVoteStaffOnly,
  );
  let mvp = 0;
  for (const winners of mvpWinnersByMatch.values()) {
    if (winners.some((w) => lookupIds.includes(w))) mvp++;
  }

  // 7. 경기별 스코어 계산 (클린시트/승률/실점)
  const matchScores = new Map<string, { our: number; opp: number }>();
  for (const g of allGoalsRes.data ?? []) {
    if (!matchScores.has(g.match_id)) matchScores.set(g.match_id, { our: 0, opp: 0 });
    const s = matchScores.get(g.match_id)!;
    if (g.scorer_id === "OPPONENT" || g.is_own_goal) s.opp++;
    else s.our++;
  }

  let cleanSheet = 0;
  let wins = 0;
  let totalConceded = 0;
  let recordMatchCount = 0; // 자체전 제외한 상대전 출전 수 — 승률·클린시트·실점의 분모

  for (const mid of attendedMatchIds) {
    if (internalMatchIds.has(mid)) continue; // 자체전은 승/클린시트/실점 집계 제외
    recordMatchCount++;
    const score = matchScores.get(mid) ?? { our: 0, opp: 0 };
    if (score.opp === 0) cleanSheet++;
    if (score.our > score.opp) wins++;
    totalConceded += score.opp;
  }

  const winRate = recordMatchCount > 0 ? wins / recordMatchCount : 0;
  const concededPerGame = recordMatchCount > 0 ? totalConceded / recordMatchCount : 0;
  const attendanceRate = eligibleMatches.length > 0 ? matchCount / eligibleMatches.length : 0;
  const cleanSheetPerGame = recordMatchCount > 0 ? cleanSheet / recordMatchCount : 0;
  const goalsPerGame = matchCount > 0 ? goals / matchCount : 0;
  const assistsPerGame = matchCount > 0 ? assists / matchCount : 0;
  const mvpRate = matchCount > 0 ? mvp / matchCount : 0;

  // 8. 포지션 분류 & OVR 산출
  const cat = classifyPosition(positions);
  const ovr = calculateOVR(
    cat, goalsPerGame, assistsPerGame, attendanceRate,
    mvpRate, winRate, cleanSheetPerGame, concededPerGame, matchCount
  );

  const statDefs = STAT_DEFS[cat];
  const stats: Record<string, number> = {
    goals,
    assists,
    mvp,
    attackPoints: goals + assists,
    attendanceRate,
    winRate,
    cleanSheet,
    concededPerGame,
    matchCount,
  };

  // 9. JSON 응답이 필요하면 팀 내 랭킹/연속기록/시그니처까지 산출
  let signature: string | undefined;
  const rankByKey = new Map<string, string | undefined>();
  const streakByKey = new Map<string, string | undefined>();

  if (isJson) {
    // 9-1. 팀 멤버 전체 조회 (랭킹 산출용)
    const { data: allMembers } = await db
      .from("team_members")
      .select("id, user_id")
      .eq("team_id", ctx.teamId)
      .in("status", ["ACTIVE", "DORMANT"]);

    type MemberLookup = { ids: string[]; goals: number; assists: number; mvp: number };
    const memberAggs: MemberLookup[] = (allMembers ?? []).map((m) => ({
      ids: m.user_id ? [m.user_id, m.id] : [m.id],
      goals: 0,
      assists: 0,
      mvp: 0,
    }));

    // 9-2. 멤버별 골/어시/MVP 집계 (이미 로드된 데이터 재사용)
    // id(user_id·member_id) → agg 인덱스. 이전엔 row마다 memberAggs.find() → O(rows×members) (86차 perf).
    // id 는 멤버 간 유일하므로 .find 첫 매칭과 동일 결과.
    const aggById = new Map<string, MemberLookup>();
    for (const agg of memberAggs) for (const id of agg.ids) aggById.set(id, agg);

    for (const row of goalsRes.data ?? []) {
      const agg = aggById.get(row.scorer_id);
      if (agg) agg.goals++;
    }
    for (const row of assistsRes.data ?? []) {
      const agg = aggById.get(row.assist_id);
      if (agg) agg.assists++;
    }
    // 랭킹 MVP도 검증된 winner 기준 (raw 투표수 금지 — 본인 mvp 값과 동일 정책)
    for (const winners of mvpWinnersByMatch.values()) {
      for (const w of winners) {
        const agg = aggById.get(w);
        if (agg) agg.mvp++;
      }
    }

    const allGoals = memberAggs.map((m) => m.goals);
    const allAssists = memberAggs.map((m) => m.assists);
    const allMvp = memberAggs.map((m) => m.mvp);

    rankByKey.set("goals", computeRankLabel(goals, allGoals));
    rankByKey.set("assists", computeRankLabel(assists, allAssists));
    rankByKey.set("mvp", computeRankLabel(mvp, allMvp));
    rankByKey.set("attackPoints", computeRankLabel(goals + assists, memberAggs.map((m) => m.goals + m.assists)));

    const isTopScorer = goals > 0 && rankByKey.get("goals") === "🏆 팀 1위";
    const isTopAssist = assists > 0 && rankByKey.get("assists") === "🏆 팀 1위";
    const isTopMvp = mvp > 0 && rankByKey.get("mvp") === "🏆 팀 1위";

    // 9-3. 연속 기록 — 가입 이후 경기만, 날짜 오름차순으로 walk (가입 전 경기로 streak 끊지 않음)
    const matchesByDateAsc = [...eligibleMatches]
      .slice()
      .sort((a, b) => (a.match_date < b.match_date ? -1 : 1));

    const attendFlags = matchesByDateAsc.map((m) => attendedMatchIds.has(m.id));
    const attendStreak = computeStreak(attendFlags);

    // 골 연속 기록 — 출전한 경기 중 골을 넣은 경기 시퀀스
    // 경기별 본인 골 수 산정
    const myGoalsByMatch = new Map<string, number>();
    for (const g of allGoalsRes.data ?? []) {
      if (lookupIds.includes(g.scorer_id) && !g.is_own_goal) {
        myGoalsByMatch.set(g.match_id, (myGoalsByMatch.get(g.match_id) ?? 0) + 1);
      }
    }
    const goalFlags = matchesByDateAsc
      .filter((m) => attendedMatchIds.has(m.id))
      .map((m) => (myGoalsByMatch.get(m.id) ?? 0) > 0);
    const goalStreak = computeStreak(goalFlags);

    if (attendStreak >= 5) streakByKey.set("attendanceRate", `🔥 ${attendStreak}경기 연속`);
    if (goalStreak >= 3) streakByKey.set("goals", `🔥 ${goalStreak}경기 연속`);

    // 9-4. 시그니처 한 줄
    signature = generateSignature({
      cat,
      goals,
      assists,
      mvp,
      cleanSheets: cleanSheet,
      matchCount,
      attendanceRate,
      winRate,
      isTopScorer,
      isTopAssist,
      isTopMvp,
      playerKey: playerName,
    });
  }

  // 10. JSON 응답
  if (isJson) {
    const heroKey = statKeyToHero(cat);
    return apiSuccess({
      ovr,
      rarity: getRarity(ovr),
      positionLabel: positions[0] ?? "-",
      positionCategory: cat,
      playerName,
      jerseyNumber,
      teamName,
      teamPrimaryColor: primaryColor,
      seasonName: season.name,
      signature,
      stats: statDefs.map((def) => ({
        label: def.label,
        value: formatStat(def.key, stats),
        rank: rankByKey.get(def.key),
        streak: streakByKey.get(def.key),
        isHero: def.key === heroKey,
      })),
    });
  }

  // 11. SVG 생성 (기존 경로)
  const svg = buildSvg(
    ovr, positions[0] ?? "-", teamName, playerName,
    jerseyNumber, statDefs, stats, primaryColor, season.name
  );

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

function buildSvg(
  ovr: number,
  position: string,
  teamName: string,
  playerName: string,
  jerseyNumber: number | null,
  statDefs: StatDef[],
  stats: Record<string, number>,
  primaryColor: string,
  seasonName: string
): string {
  const colorLight = adjustColor(primaryColor, 40);
  const colorDark = adjustColor(primaryColor, -40);
  const posDisplay = escapeXml(position.toUpperCase());
  const nameDisplay = escapeXml(formatName(playerName));
  const teamDisplay = escapeXml(teamName);
  const seasonDisplay = escapeXml(seasonName);
  const jerseyDisplay = jerseyNumber !== null ? `#${jerseyNumber}` : "";

  // OVR 색상 등급
  let ovrColor = "#ffffff";
  if (ovr >= 90) ovrColor = "#ffd700";
  else if (ovr >= 80) ovrColor = "#ff7a45";
  else if (ovr >= 70) ovrColor = "#2bd3b5";

  // 스탯 그리드 (3x2)
  const xPositions = [150, 300, 450];
  const yRows = [
    { labelY: 500, valueY: 535 },
    { labelY: 600, valueY: 635 },
  ];

  let statsSvg = "";
  for (let i = 0; i < 6; i++) {
    const def = statDefs[i];
    if (!def) break;
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = xPositions[col];
    const ly = yRows[row].labelY;
    const vy = yRows[row].valueY;
    const label = escapeXml(def.label);
    const value = escapeXml(formatStat(def.key, stats));
    statsSvg += `
    <text x="${x}" y="${ly}" text-anchor="middle" fill="white" fill-opacity="0.6" font-size="14" font-family="'Noto Sans KR', sans-serif">${label}</text>
    <text x="${x}" y="${vy}" text-anchor="middle" fill="white" font-size="32" font-weight="bold" font-family="'Noto Sans KR', sans-serif">${value}</text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0%" stop-color="${colorLight}"/>
      <stop offset="100%" stop-color="${colorDark}"/>
    </linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="white" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="white" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- 카드 배경 -->
  <rect width="600" height="800" fill="url(#bg)" rx="24"/>
  <rect width="600" height="400" fill="url(#shine)" rx="24"/>

  <!-- OVR 점수 -->
  <text x="80" y="120" fill="${ovrColor}" font-size="72" font-weight="bold" font-family="'Noto Sans KR', sans-serif">${ovr}</text>

  <!-- 포지션 -->
  <text x="80" y="160" fill="white" fill-opacity="0.8" font-size="28" font-weight="600" font-family="'Noto Sans KR', sans-serif">${posDisplay}</text>

  <!-- 팀명 -->
  <text x="520" y="60" text-anchor="end" fill="white" fill-opacity="0.6" font-size="16" font-family="'Noto Sans KR', sans-serif">${teamDisplay}</text>

  <!-- 장식 라인 -->
  <line x1="80" y1="180" x2="180" y2="180" stroke="white" stroke-opacity="0.2" stroke-width="2"/>

  <!-- 선수 이름 -->
  <text x="300" y="340" text-anchor="middle" fill="white" font-size="42" font-weight="bold" font-family="'Noto Sans KR', sans-serif">${nameDisplay}</text>

  <!-- 등번호 -->
  <text x="300" y="380" text-anchor="middle" fill="white" fill-opacity="0.6" font-size="20" font-family="'Noto Sans KR', sans-serif">${jerseyDisplay}</text>

  <!-- 구분선 -->
  <line x1="100" y1="450" x2="500" y2="450" stroke="white" stroke-opacity="0.3" stroke-width="1"/>

  <!-- 스탯 6개 (3x2 그리드) -->${statsSvg}

  <!-- 시즌 -->
  <text x="300" y="720" text-anchor="middle" fill="white" fill-opacity="0.4" font-size="14" font-family="'Noto Sans KR', sans-serif">${seasonDisplay}</text>

  <!-- 브랜드 -->
  <text x="300" y="770" text-anchor="middle" fill="white" fill-opacity="0.3" font-size="12" font-family="'Noto Sans KR', sans-serif" letter-spacing="3">PITCHMASTER</text>
</svg>`;
}
