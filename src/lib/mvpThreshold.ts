/**
 * MVP 유효성 임계값 — "실제 MVP"로 인정받으려면 해당 경기 참석자의
 * 일정 비율(기본 70%) 이상이 투표해야 함.
 *
 * 참석 인원이 적거나 투표 참여율이 낮으면 단순히 최다 득표자가 MVP로 확정되는
 * 대신 "MVP 없음"으로 처리해 신뢰도 높은 MVP만 집계에 반영한다.
 */
export const MVP_VOTE_THRESHOLD = 0.7;

/**
 * 새 정책(운영진 즉시 확정 권한을 mvp_vote_staff_only 토글에 종속) 적용 시작 날짜.
 * 이 날짜 이후 경기에선:
 *  - mvp_vote_staff_only=OFF 팀의 STAFF 투표는 일반 표로 처리 (70% 룰만 적용)
 *  - mvp_vote_staff_only=ON 팀에선 기존 동작 유지 (즉시 확정)
 * 이 날짜 이전 경기는 백필 치유 포함 옛 정책 그대로 (과거 MVP 결과 보존).
 */
export const STAFF_DECISION_POLICY_CUTOFF = "2026-05-04";

export interface PickStaffDecisionOptions {
  /**
   * 백필 치유 분기 활성 여부.
   * - true (기본): is_staff_decision=true OR 현재 STAFF voter 모두 staff decision
   * - false: is_staff_decision=true row 만 staff decision (백필 치유 비활성)
   *
   * 새 정책 (mvp_vote_staff_only=OFF + match_date >= 2026-05-04) 에서는 false.
   */
  applyBackfillHealing?: boolean;
}

/**
 * match_mvp_votes 원시 row에서 "확정 지정"(is_staff_decision)을 판정.
 *
 * 왜 동적 판정이 필요한가:
 *  - `is_staff_decision` 컬럼은 2026-04-20 커밋(2d457b8)에서 도입됐고,
 *    그 이전에 운영진이 남긴 투표 row는 모두 false로 저장되어 있음 → 집계 누락.
 *  - 과거 데이터를 그대로 두되, 집계 시점에 voter가 현재 STAFF 이상이면
 *    그 투표를 `staff_decision`으로 간주해 누락을 치유.
 *  - 미래에 STAFF로 승격된 사람의 과거 투표도 자연스럽게 확정 처리됨.
 *
 * 새 정책 (2026-05-04 이후 + mvp_vote_staff_only=OFF):
 *  - applyBackfillHealing=false 로 호출하여 백필 치유 분기 비활성
 *  - is_staff_decision=true row만 staff decision (POST 시 mvpVoteStaffOnly && isStaff 일 때만 true 저장)
 *
 * @param votes match_mvp_votes 원시 행들 (voter_id, candidate_id, is_staff_decision 필요)
 * @param staffVoterIds 해당 팀에서 현재 STAFF 이상인 사용자의 user_id 집합
 * @param options applyBackfillHealing — 새 정책 케이스에선 false 전달
 * @returns 첫 번째로 발견된 "staff 지정" candidate_id, 없으면 null
 */
export function pickStaffDecision(
  votes: Array<{ voter_id: string; candidate_id: string; is_staff_decision: boolean | null }>,
  staffVoterIds: Set<string>,
  options: PickStaffDecisionOptions = {}
): string | null {
  const applyBackfillHealing = options.applyBackfillHealing ?? true;
  // staff 지정으로 인정되는 후보들을 모아 '최다 득표' 후보를 선택.
  // (예전엔 첫 row 를 반환해, 운영진이 서로 다른 후보를 찍으면 DB row 순서에 따라
  //  결과가 달라지는 비결정론이 있었음 — 같은 경기를 두 번 집계하면 MVP가 바뀔 수 있었음)
  const staffCounts = new Map<string, number>();
  for (const v of votes) {
    if (!v.candidate_id) continue;
    const isStaffPick = v.is_staff_decision || (applyBackfillHealing && staffVoterIds.has(v.voter_id));
    if (isStaffPick) staffCounts.set(v.candidate_id, (staffCounts.get(v.candidate_id) ?? 0) + 1);
  }
  if (staffCounts.size === 0) return null;
  // 최다 득표 → 동률 시 candidate_id 사전순으로 결정론적 tiebreak
  return [...staffCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
}

/**
 * 새 정책(STAFF_DECISION_POLICY_CUTOFF 이후 + mvp_vote_staff_only=OFF) 적용 여부 판정.
 * 호출처에서 pickStaffDecision options 결정에 사용.
 */
export function shouldApplyNewMvpPolicy(
  matchDate: string | null | undefined,
  mvpVoteStaffOnly: boolean
): boolean {
  if (mvpVoteStaffOnly) return false; // 토글 ON이면 옛 정책 그대로 (운영진 즉시 확정)
  if (!matchDate) return false;
  return matchDate >= STAFF_DECISION_POLICY_CUTOFF;
}

/**
 * 유효한 MVP 득표율인지 판정.
 * @param mvpVoteCount MVP 투표에 참여한 사람 수 (match_mvp_votes 고유 voter 수)
 * @param attendedCount 해당 경기 실제 참석 인원
 *
 * 폴백 정책: 참석 체크가 안 된 경기(attendedCount === 0)는 과거 로직 보존을 위해
 * "참여율 불명"으로 간주하고 true 반환 — 기존 MVP 기록 유지.
 * 참석 체크된 경기에만 70% 임계값 적용.
 */
export function isValidMvpVoteTurnout(
  mvpVoteCount: number,
  attendedCount: number
): boolean {
  if (attendedCount <= 0) return mvpVoteCount > 0; // 참석 체크 미기록 경기 폴백
  return mvpVoteCount / attendedCount >= MVP_VOTE_THRESHOLD;
}

/**
 * MVP 후보 목록에서 유효한 MVP 당선자(들)를 판정 — 공동 1등 전원 반환.
 * 투표 참여율이 임계값 미만이면 빈 배열.
 *
 * 투표로 뽑힌 경우 최다 득표가 동률이면 공동 MVP로 전원 인정한다.
 * (운영진 직접 지정은 명시적으로 1명을 고르는 개념이라 공동 적용 안 함.)
 *
 * @param votes candidate_id 배열 (중복 있음 — 한 후보에 여러 표)
 * @param attendedCount 해당 경기 실제 참석 인원
 * @param staffDecisionCandidateId 운영진이 직접 지정한 후보 ID (있으면 그 1명 즉시 확정)
 * @returns 당선자 candidate_id 배열 (공동 1등이면 복수, 없으면 빈 배열). candidate_id 사전순 정렬.
 */
export function resolveValidMvps(
  votes: string[],
  attendedCount: number,
  staffDecisionCandidateId?: string | null
): string[] {
  // 운영진 직접 지정이 있으면 투표율 무관하게 그 1명 즉시 확정 (공동 적용 안 함)
  if (staffDecisionCandidateId) return [staffDecisionCandidateId];

  if (!votes.length) return [];
  // 투표자 수 = 실제 표 개수 (voter_id 유니크 제약이 DB에 있어 voter 수 = 표 수)
  if (!isValidMvpVoteTurnout(votes.length, attendedCount)) return [];

  const counts: Record<string, number> = {};
  for (const id of votes) counts[id] = (counts[id] ?? 0) + 1;
  const max = Math.max(...Object.values(counts));
  // 최다 득표 동률(공동 1등) 전원 — candidate_id 사전순으로 결정론적 반환
  return Object.keys(counts)
    .filter((id) => counts[id] === max)
    .sort();
}

/**
 * 단일 MVP 당선자 — 공동 1등이면 사전순 첫 번째 1명만.
 * 단수 winner가 필요한 레거시 경로(실시간 표시 등)용 얇은 래퍼.
 * 집계·기록 경로는 resolveValidMvps(복수)를 써서 공동 MVP를 모두 반영할 것.
 *
 * @returns 당선자 candidate_id 또는 null
 */
export function resolveValidMvp(
  votes: string[],
  attendedCount: number,
  staffDecisionCandidateId?: string | null
): string | null {
  return resolveValidMvps(votes, attendedCount, staffDecisionCandidateId)[0] ?? null;
}

/** match_mvp_votes 원시 행 (집계 헬퍼 입력) */
export interface MvpVoteRow {
  match_id: string;
  voter_id: string;
  candidate_id: string;
  is_staff_decision: boolean | null;
}

/**
 * 경기별 MVP 당선자를 집계해 candidate_id별 MVP 횟수 맵을 반환하는 단일 오케스트레이션.
 *
 * 이전엔 getRecordsData(SSR)·records route(API) 두 곳이 이 ~25줄(votesByMatch 그룹핑 →
 * shouldApplyNewMvpPolicy → pickStaffDecision → resolveValidMvps → mvpMap +1)을 줄단위
 * 복붙해 divergence 위험이 있었음. MVP 정책이 11곳 경로에 흩어져 있어 단일소스로 묶는다.
 *
 * 공동 1등이면 전원 +1 (공동 MVP). resolveValidMvps 가 동률 전원을 반환하므로 그대로 누적.
 *
 * @param mvpRows     match_mvp_votes (match_id·voter_id·candidate_id·is_staff_decision)
 * @param attendedPerMatch match_id → 실제 참석 인원 (70% 임계값 분모)
 * @param matchDateById    match_id → match_date (새 정책 컷오프 판정용)
 * @param staffVoterIds    현재 STAFF+ 인 voter의 user_id 집합 (백필 치유)
 * @param mvpVoteStaffOnly 팀 설정 토글 (ON이면 운영진 즉시 확정 옛 정책)
 * @returns candidate_id → MVP 확정 횟수
 */
export function aggregateMvpsByMatch(
  mvpRows: MvpVoteRow[],
  attendedPerMatch: Map<string, number>,
  matchDateById: Map<string, string>,
  staffVoterIds: Set<string>,
  mvpVoteStaffOnly: boolean
): Map<string, number> {
  const aggByMatch = new Map<string, { votes: string[]; rows: MvpVoteRow[] }>();
  for (const v of mvpRows) {
    if (!v.candidate_id) continue;
    const agg = aggByMatch.get(v.match_id) ?? { votes: [], rows: [] };
    agg.votes.push(v.candidate_id);
    agg.rows.push(v);
    aggByMatch.set(v.match_id, agg);
  }

  const mvpMap = new Map<string, number>();
  for (const [mid, agg] of aggByMatch) {
    const newPolicy = shouldApplyNewMvpPolicy(matchDateById.get(mid), mvpVoteStaffOnly);
    const staffDecision = pickStaffDecision(agg.rows, staffVoterIds, {
      applyBackfillHealing: !newPolicy,
    });
    // 공동 1등이면 전원 +1 (공동 MVP)
    const winners = resolveValidMvps(agg.votes, attendedPerMatch.get(mid) ?? 0, staffDecision);
    for (const winner of winners) mvpMap.set(winner, (mvpMap.get(winner) ?? 0) + 1);
  }
  return mvpMap;
}
