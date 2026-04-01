import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// 포지션 카테고리 분류
type PosCategory = "GK" | "DEF" | "MID" | "FW" | "DEFAULT";

function classifyPosition(positions: string[]): PosCategory {
  if (!positions || positions.length === 0) return "DEFAULT";
  const primary = positions[0].toUpperCase();
  if (primary === "GK") return "GK";
  if (["CB", "RB", "LB", "CDM"].includes(primary)) return "DEF";
  if (["CM", "CAM", "LM", "RM"].includes(primary)) return "MID";
  if (["FW", "LW", "RW", "CF", "ST"].includes(primary)) return "FW";
  return "DEFAULT";
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

// OVR 계산 (45~99)
function calculateOVR(
  cat: PosCategory,
  goalsPerGame: number,
  assistsPerGame: number,
  attendRate: number,
  mvpRate: number,
  winRate: number,
  cleanSheetPerGame: number,
  concededPerGame: number,
  matchCount: number
): number {
  const minGames = 3;
  let raw: number;

  switch (cat) {
    case "FW":
      raw =
        goalsPerGame * 30 +
        assistsPerGame * 20 +
        attendRate * 15 +
        mvpRate * 20 +
        winRate * 15;
      break;
    case "DEF":
      raw =
        cleanSheetPerGame * 25 +
        Math.max(0, 1 - concededPerGame) * 20 +
        attendRate * 20 +
        mvpRate * 20 +
        winRate * 15;
      break;
    case "GK":
      raw =
        cleanSheetPerGame * 30 +
        Math.max(0, 1 - concededPerGame) * 25 +
        attendRate * 15 +
        mvpRate * 15 +
        winRate * 15;
      break;
    case "MID":
      raw =
        assistsPerGame * 25 +
        goalsPerGame * 15 +
        attendRate * 15 +
        mvpRate * 25 +
        winRate * 20;
      break;
    default:
      raw =
        goalsPerGame * 20 +
        assistsPerGame * 20 +
        attendRate * 20 +
        mvpRate * 20 +
        winRate * 20;
  }

  // 경기 수 기반 스케일링
  const gameScale = matchCount >= minGames ? 1 : matchCount / minGames;
  raw = raw * gameScale;

  // 45~99 범위로 매핑 (raw는 대략 0~100)
  const ovr = Math.round(45 + (raw / 100) * 54);
  return Math.max(45, Math.min(99, ovr));
}

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
  const seasonId = request.nextUrl.searchParams.get("seasonId");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // 1. 멤버 정보 조회 (team_members + users 조인)
  const { data: memberData } = await db
    .from("team_members")
    .select("id, user_id, pre_name, jersey_number, users(id, name, preferred_positions)")
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

  // 4. 시즌 기간 내 COMPLETED 경기 조회
  const { data: matches } = await db
    .from("matches")
    .select("id, match_date")
    .eq("team_id", ctx.teamId)
    .eq("status", "COMPLETED")
    .gte("match_date", season.start_date)
    .lte("match_date", season.end_date)
    .order("match_date", { ascending: false });

  const allMatchIds = (matches ?? []).map((m) => m.id);
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

  // 6. 골/어시/MVP 조회
  const [goalsRes, assistsRes, mvpRes, allGoalsRes] = await Promise.all([
    db.from("match_goals").select("scorer_id").in("match_id", allMatchIds).eq("is_own_goal", false),
    db.from("match_goals").select("assist_id").in("match_id", allMatchIds).not("assist_id", "is", null),
    db.from("match_mvp_votes").select("candidate_id").in("match_id", allMatchIds),
    db.from("match_goals").select("match_id, scorer_id, is_own_goal").in("match_id", allMatchIds),
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

  let mvp = 0;
  for (const row of mvpRes.data ?? []) {
    if (lookupIds.includes(row.candidate_id)) mvp++;
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

  for (const mid of attendedMatchIds) {
    const score = matchScores.get(mid) ?? { our: 0, opp: 0 };
    if (score.opp === 0) cleanSheet++;
    if (score.our > score.opp) wins++;
    totalConceded += score.opp;
  }

  const winRate = matchCount > 0 ? wins / matchCount : 0;
  const concededPerGame = matchCount > 0 ? totalConceded / matchCount : 0;
  const attendanceRate = totalMatches > 0 ? matchCount / totalMatches : 0;
  const cleanSheetPerGame = matchCount > 0 ? cleanSheet / matchCount : 0;
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

  // 9. SVG 생성
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
