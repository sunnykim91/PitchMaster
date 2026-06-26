/**
 * 경기 스코어 문자열 집계 — SSR(getMatchesData)·API(matches route) 공통 단일소스.
 *
 * 자책골(is_own_goal) 처리는 프로젝트의 분산된 골 집계 경로 중 가장 깨지기 쉬운 규칙이라
 * (reference_goal_score_aggregation_dual_rule) 두 경로가 같은 함수를 쓰게 묶는다.
 *  - 자체전 3파전(side C 존재): 팀별 골 합계, 자책골은 카운트에서 제외
 *  - 자체전 2팀: 자책골은 "범한 side 의 상대 사이드" 득점으로 집계
 *  - 일반전: scorer_id==="OPPONENT" 또는 is_own_goal 이면 실점, 그 외 득점
 *
 * ⚠️ 빈 배열 처리는 호출처 책임 — 두 경로가 의도적으로 다르게 낸다(합치지 말 것):
 *    getMatchesData 는 골 없는 경기에 null(미기록) 을, matches route 는 "0 : 0"(완료) 을 낸다.
 *    그래서 이 헬퍼는 빈 배열이면 "0 : 0"(2팀)/"0 : 0 : 0"(3파전 불가) 을 그대로 내고,
 *    null 로 막고 싶은 호출처가 직접 빈 배열을 가드한다.
 *
 * ⚠️ 일반전 자책골 두 규칙 공존 (102차 전수조사 — 현행 유지 결정):
 *    이 헬퍼·서버 전 경로 = "is_own_goal 이면 무조건 실점"(단순). 그러나 경기상세 3뷰
 *    (MatchInfoTab·MatchDetailClient·MatchRecordTab)는 "scorer_id==='OPPONENT' + is_own_goal
 *    → 우리 득점"(축구 정석)으로 정밀하게 본다. 차이는 OPPONENT+자책골 row 에서만 발생하는데
 *    득점 폼이 OPPONENT 행에 is_own_goal 을 못 넣어 **UI로 생성 불가 → 현재 미발현**.
 *    통일하려다 동작 코드에 회귀 낼 위험이 커 의도적으로 둘을 유지한다(합치려면 한 규칙으로 결정 후).
 */
export interface ScoreGoalRow {
  scorer_id: string;
  is_own_goal: boolean;
  side: string | null;
}

export function computeMatchScore(goals: ScoreGoalRow[], isInternal: boolean): string {
  if (isInternal) {
    if (goals.some((g) => g.side === "C")) {
      // 3파전: 팀별 골 합계 (자책골 제외)
      const tally = (s: string) => goals.filter((g) => g.side === s && !g.is_own_goal).length;
      return `${tally("A")} : ${tally("B")} : ${tally("C")}`;
    }
    // 2팀: 자책골은 상대 사이드 득점으로 집계
    const a =
      goals.filter((g) => g.side === "A" && !g.is_own_goal).length +
      goals.filter((g) => g.side === "B" && g.is_own_goal).length;
    const b =
      goals.filter((g) => g.side === "B" && !g.is_own_goal).length +
      goals.filter((g) => g.side === "A" && g.is_own_goal).length;
    return `${a} : ${b}`;
  }
  // 일반: 우리 vs 상대
  let our = 0,
    opp = 0;
  for (const g of goals) {
    if (g.scorer_id === "OPPONENT" || g.is_own_goal) opp++;
    else our++;
  }
  return `${our} : ${opp}`;
}
