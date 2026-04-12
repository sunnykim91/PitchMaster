// 선수 카드/시즌 어워드/커리어 프로필에서 공유하는 순수 유틸
// DB 접근 없음 — 서버/클라 양쪽에서 사용 가능

export type Rarity = "ICON" | "HERO" | "RARE" | "COMMON";

export type PositionCategory = "GK" | "DEF" | "MID" | "FW" | "DEFAULT";

export function getRarity(ovr: number): Rarity {
  if (ovr >= 90) return "ICON";
  if (ovr >= 80) return "HERO";
  if (ovr >= 70) return "RARE";
  return "COMMON";
}

export function classifyPosition(positions: string[] | null | undefined): PositionCategory {
  if (!positions || positions.length === 0) return "DEFAULT";
  const primary = positions[0].toUpperCase();
  if (primary === "GK") return "GK";
  if (["CB", "RB", "LB", "CDM"].includes(primary)) return "DEF";
  if (["CM", "CAM", "LM", "RM"].includes(primary)) return "MID";
  if (["FW", "LW", "RW", "CF", "ST"].includes(primary)) return "FW";
  return "DEFAULT";
}

// 포지션별 시그니처 스탯 키 — PlayerCard 의 hero stat 결정
export function getHeroStatKey(cat: PositionCategory): string {
  switch (cat) {
    case "FW":
      return "goals";
    case "MID":
      return "assists";
    case "DEF":
      return "cleanSheet";
    case "GK":
      return "cleanSheet";
    default:
      return "goals";
  }
}

export type SignatureInput = {
  cat: PositionCategory;
  goals: number;
  assists: number;
  mvp: number;
  cleanSheets: number;
  matchCount: number;
  attendanceRate: number; // 0~1
  winRate: number; // 0~1
  isTopScorer?: boolean;
  isTopAssist?: boolean;
  isTopMvp?: boolean;
};

// 한 줄 캐치프레이즈 자동 생성
export function generateSignature(input: SignatureInput): string {
  const {
    cat,
    goals,
    assists,
    mvp,
    cleanSheets,
    matchCount,
    attendanceRate,
    winRate,
    isTopScorer,
    isTopAssist,
    isTopMvp,
  } = input;

  if (matchCount === 0) return "곧 첫 경기를 기다리는 선수";

  // GK / DEF — 수비형 시그니처 우선
  if (cat === "GK" || cat === "DEF") {
    if (cleanSheets >= 5) return `${cleanSheets}경기 무실점 — 팀의 최후방`;
    if (isTopMvp && mvp > 0) return `${mvp}회 MOM — 수비의 핵심`;
    if (winRate >= 0.7)
      return `승률 ${Math.round(winRate * 100)}%, 그가 뛰면 팀은 이긴다`;
    return `${matchCount}경기 출장 · 클린시트 ${cleanSheets}회`;
  }

  // FW / MID / DEFAULT
  if (isTopScorer && goals > 0) {
    if (assists > 0) return `${goals}골 ${assists}어시 — 팀 득점왕`;
    return `${goals}골 — 팀 득점왕`;
  }
  if (isTopAssist && assists > 0) return `${assists}어시 — 팀 도움왕`;
  if (isTopMvp && mvp > 0) return `${mvp}회 MOM — 시즌의 주인공`;
  if (goals + assists >= 10)
    return `${goals}골 ${assists}어시 — 공격 포인트 ${goals + assists}`;
  if (attendanceRate >= 0.9)
    return `출석률 ${Math.round(attendanceRate * 100)}% — 팀의 기둥`;
  if (winRate >= 0.7)
    return `승률 ${Math.round(winRate * 100)}%, 그가 뛰면 팀은 이긴다`;
  return `${matchCount}경기 출장 · ${goals}골 ${assists}어시`;
}

// 팀 내 랭킹 라벨 — 동일 스탯 모음에서 value 의 위치를 산출
// 0 또는 음수는 랭킹 대상에서 제외 (출전 없음/기록 없음)
export function computeRankLabel(
  value: number,
  allValues: number[]
): string | undefined {
  if (value <= 0) return undefined;
  const positives = allValues.filter((v) => v > 0).sort((a, b) => b - a);
  if (positives.length === 0) return undefined;
  const idx = positives.indexOf(value);
  if (idx === -1) return undefined;
  if (idx === 0) return "🏆 팀 1위";
  if (idx === 1) return "🥈 팀 2위";
  if (idx === 2) return "🥉 팀 3위";
  const pct = ((idx + 1) / positives.length) * 100;
  if (pct <= 10) return "상위 10%";
  if (pct <= 25) return "상위 25%";
  return undefined;
}

// 비율 기반(%) 랭킹 — 출석률/승률용. 최소 표본 보장
export function computeRateRankLabel(
  value: number,
  allValues: number[],
  minSample = 3
): string | undefined {
  if (value <= 0) return undefined;
  const valid = allValues.filter((v) => v > 0).sort((a, b) => b - a);
  if (valid.length < minSample) return undefined;
  const idx = valid.indexOf(value);
  if (idx === -1) return undefined;
  if (idx === 0) return "🏆 팀 1위";
  if (idx === 1) return "🥈 팀 2위";
  const pct = ((idx + 1) / valid.length) * 100;
  if (pct <= 10) return "상위 10%";
  if (pct <= 25) return "상위 25%";
  return undefined;
}

// 정렬된 boolean 배열에서 가장 긴 연속 true 길이
export function computeStreak(flags: boolean[]): number {
  let max = 0;
  let cur = 0;
  for (const f of flags) {
    if (f) {
      cur++;
      if (cur > max) max = cur;
    } else {
      cur = 0;
    }
  }
  return max;
}

// 시즌 한 줄 요약
export function generateSeasonSummary(
  record: { wins: number; draws: number; losses: number },
  totalMatches: number
): string | undefined {
  if (totalMatches === 0) return undefined;
  const winRate = record.wins / totalMatches;
  if (winRate >= 0.75) return "압도적인 시즌 — 우승 후보다운 경기력";
  if (winRate >= 0.6) return "단단했던 시즌, 절반 이상을 승리로 채웠다";
  if (winRate >= 0.5) return "꾸준함이 빛난 시즌";
  if (winRate >= 0.35) return "다음 시즌의 도약을 기약하는 시즌";
  return "쉽지 않았던 시즌, 그래도 끝까지 달렸다";
}

// 어워드별 한 줄 컨텍스트 (전 시즌 대비 비교가 없을 때 사용)
export function awardContext(
  kind:
    | "topScorer"
    | "topAssist"
    | "topMvp"
    | "topAttendance"
    | "ironWall"
    | "luckyCharm",
  value: number,
  totalMatches: number
): string | undefined {
  if (totalMatches === 0) return undefined;
  switch (kind) {
    case "topScorer":
      return value >= totalMatches ? "경기당 1골 이상" : undefined;
    case "topAssist":
      return value >= totalMatches * 0.7 ? "어시 머신" : undefined;
    case "topMvp":
      return value >= totalMatches * 0.4 ? "팀의 주인공" : undefined;
    case "ironWall":
      return value >= 5 ? `${value}경기 무실점` : undefined;
    case "luckyCharm":
      return "그가 뛰면 팀이 이긴다";
    default:
      return undefined;
  }
}

// 베스트 모먼트 산출용 입력
export type MatchPerformance = {
  matchId: string;
  date: string;
  opponent: string;
  ourScore: number;
  oppScore: number;
  attended: boolean;
  goals: number;
  assists: number;
  mvp: boolean;
};

export type BestMoment =
  | {
      kind: "bestMatch";
      headline: string; // "vs 강남 FC, 5:2 승"
      detail: string; // "본인 2골 1어시"
      date: string;
    }
  | {
      kind: "firstGoal";
      headline: string;
      detail: string;
      date: string;
    }
  | {
      kind: "streak";
      headline: string; // "13경기 연속 출장"
      detail: string;
      date: string;
    };

// MatchPerformance 배열은 날짜 오름차순 정렬되어 있다고 가정
export function findBestMoments(history: MatchPerformance[]): BestMoment[] {
  const moments: BestMoment[] = [];
  if (history.length === 0) return moments;

  // 1. 베스트 경기 — 본인 활약(골+어시)이 가장 큰 출전 경기
  const attended = history.filter((m) => m.attended);
  if (attended.length > 0) {
    let best = attended[0];
    let bestImpact = best.goals * 2 + best.assists + (best.mvp ? 1 : 0);
    for (const m of attended) {
      const impact = m.goals * 2 + m.assists + (m.mvp ? 1 : 0);
      if (impact > bestImpact) {
        bestImpact = impact;
        best = m;
      }
    }
    if (bestImpact > 0) {
      const result =
        best.ourScore > best.oppScore
          ? "승"
          : best.ourScore < best.oppScore
            ? "패"
            : "무";
      const opponent = best.opponent || "경기";
      const detailParts: string[] = [];
      if (best.goals > 0) detailParts.push(`${best.goals}골`);
      if (best.assists > 0) detailParts.push(`${best.assists}어시`);
      if (best.mvp) detailParts.push("MOM");
      moments.push({
        kind: "bestMatch",
        headline: `vs ${opponent} ${best.ourScore}:${best.oppScore} ${result}`,
        detail: detailParts.join(" · ") || "출전",
        date: best.date,
      });
    }
  }

  // 2. 시즌 첫 골
  const firstGoalMatch = history.find((m) => m.attended && m.goals > 0);
  if (firstGoalMatch) {
    moments.push({
      kind: "firstGoal",
      headline: "시즌 첫 골",
      detail: firstGoalMatch.opponent
        ? `vs ${firstGoalMatch.opponent}`
        : "첫 골을 신고했다",
      date: firstGoalMatch.date,
    });
  }

  // 3. 가장 긴 연속 기록 — 출전/득점/MOM 중 가장 인상적인 것
  const attendStreak = computeStreak(history.map((m) => m.attended));
  const goalStreak = computeStreak(
    history.filter((m) => m.attended).map((m) => m.goals > 0)
  );
  const mvpStreak = computeStreak(
    history.filter((m) => m.attended).map((m) => m.mvp)
  );

  // 우선순위: MOM 연속 ≥ 3 > 득점 연속 ≥ 3 > 출전 연속 ≥ 5
  if (mvpStreak >= 3) {
    moments.push({
      kind: "streak",
      headline: `${mvpStreak}경기 연속 MOM`,
      detail: "팀의 주인공",
      date: history[history.length - 1]?.date ?? "",
    });
  } else if (goalStreak >= 3) {
    moments.push({
      kind: "streak",
      headline: `${goalStreak}경기 연속 득점`,
      detail: "득점력 폭발",
      date: history[history.length - 1]?.date ?? "",
    });
  } else if (attendStreak >= 5) {
    moments.push({
      kind: "streak",
      headline: `${attendStreak}경기 연속 출장`,
      detail: "팀의 기둥",
      date: history[history.length - 1]?.date ?? "",
    });
  }

  return moments;
}

/**
 * OVR 계산 (45~99 범위).
 * 포지션 카테고리별 가중치로 5개 지표를 평가한 뒤 경기 수 보정.
 * 원본: /api/player-card/route.ts — 공유 유틸로 이동.
 */
export function calculateOVR(
  cat: PositionCategory,
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
      raw = goalsPerGame * 30 + assistsPerGame * 20 + attendRate * 15 + mvpRate * 20 + winRate * 15;
      break;
    case "DEF":
      raw = cleanSheetPerGame * 25 + Math.max(0, 1 - concededPerGame) * 20 + attendRate * 20 + mvpRate * 20 + winRate * 15;
      break;
    case "GK":
      raw = cleanSheetPerGame * 30 + Math.max(0, 1 - concededPerGame) * 25 + attendRate * 15 + mvpRate * 15 + winRate * 15;
      break;
    case "MID":
      raw = assistsPerGame * 25 + goalsPerGame * 15 + attendRate * 15 + mvpRate * 25 + winRate * 20;
      break;
    default:
      raw = goalsPerGame * 20 + assistsPerGame * 20 + attendRate * 20 + mvpRate * 20 + winRate * 20;
  }

  const gameScale = matchCount >= minGames ? 1 : matchCount / minGames;
  raw = raw * gameScale;

  const ovr = Math.round(45 + (raw / 100) * 54);
  return Math.max(45, Math.min(99, ovr));
}
