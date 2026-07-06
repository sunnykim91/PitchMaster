/**
 * 경기 후기 입력 타입.
 *
 * 과거엔 이 파일에 Claude Haiku 기반 후기 생성 함수(generateAiMatchSummary 등)가
 * 있었으나, 25차에 결정론적 템플릿으로 이관됐다. 현재 라이브 경로는
 * `matchSummaryTemplate.ts`의 `generateMatchSummaryFromTemplate()`만 사용한다.
 * LLM 생성 함수는 호출처가 없어(dead code) 제거했고, 공유 입력 타입만 남긴다.
 */

export type MatchSummaryInput = {
  matchType: "REGULAR" | "INTERNAL" | "EVENT";
  score: { us: number; opp: number } | null;
  result: "W" | "D" | "L" | null;
  opponent: string | null;
  goals: Array<{ scorerName: string; quarter: number | null; isOwnGoal: boolean }>;
  assists: string[];
  mom: string | null;
  topScorerName: string | null;
  attendanceCount: number;
  /** 이 경기의 필드 인원 수 (축구 8/9/10/11, 풋살 5 등). 참석 인원과 비교해 "풀로/부족/여유" 서술 정확히 하기 위해 필요. */
  playerCount: number;
  location: string | null;
  weather: string | null;
  date: string;
  /** 상대팀 과거 전적 (같은 팀과 이전 경기 있으면) */
  opponentHistory?: {
    played: number;
    won: number;
    drawn: number;
    lost: number;
    lastScore?: { us: number; opp: number; date: string };
  } | null;
  /** 득점자별 시즌 누적 골 수 — 오늘 골 포함. "시즌 X골째" 서술용 */
  scorerSeasonGoals?: Record<string, number>;
  /** MOM 수상자의 이번 시즌 MOM 횟수 — 오늘 포함. "시즌 N번째 MOM" 서술용 */
  momSeasonCount?: number | null;
  /** 팀 최근 경기 결과 (최근 5경기, 오늘 제외) — "3연승 이어가다" 서술용 */
  teamRecentForm?: Array<"W" | "D" | "L">;
  /** 관측성용 */
  userId?: string | null;
  teamId?: string | null;
  matchId?: string | null;
};
