/**
 * MVP 유효성 임계값 — "실제 MVP"로 인정받으려면 해당 경기 참석자의
 * 일정 비율(기본 70%) 이상이 투표해야 함.
 *
 * 참석 인원이 적거나 투표 참여율이 낮으면 단순히 최다 득표자가 MVP로 확정되는
 * 대신 "MVP 없음"으로 처리해 신뢰도 높은 MVP만 집계에 반영한다.
 */
export const MVP_VOTE_THRESHOLD = 0.7;

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
 * @param votes match_mvp_votes 원시 행들 (voter_id, candidate_id, is_staff_decision 필요)
 * @param staffVoterIds 해당 팀에서 현재 STAFF 이상인 사용자의 user_id 집합
 * @returns 첫 번째로 발견된 "staff 지정" candidate_id, 없으면 null
 */
export function pickStaffDecision(
  votes: Array<{ voter_id: string; candidate_id: string; is_staff_decision: boolean | null }>,
  staffVoterIds: Set<string>
): string | null {
  for (const v of votes) {
    if (v.is_staff_decision || staffVoterIds.has(v.voter_id)) return v.candidate_id;
  }
  return null;
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
 * MVP 후보 목록에서 유효한 MVP 당선자를 판정.
 * 투표 참여율이 임계값 미만이면 null 반환.
 *
 * @param votes candidate_id 배열 (중복 있음 — 한 후보에 여러 표)
 * @param attendedCount 해당 경기 실제 참석 인원
 * @param staffDecisionCandidateId 운영진이 직접 지정한 후보 ID (있으면 즉시 확정)
 * @returns 당선자 candidate_id 또는 null
 */
export function resolveValidMvp(
  votes: string[],
  attendedCount: number,
  staffDecisionCandidateId?: string | null
): string | null {
  // 운영진 직접 지정이 있으면 투표율 무관하게 즉시 확정
  if (staffDecisionCandidateId) return staffDecisionCandidateId;

  if (!votes.length) return null;
  // 투표자 수 = 실제 표 개수 (voter_id 유니크 제약이 DB에 있어 voter 수 = 표 수)
  if (!isValidMvpVoteTurnout(votes.length, attendedCount)) return null;

  const counts: Record<string, number> = {};
  for (const id of votes) counts[id] = (counts[id] ?? 0) + 1;
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return null;
  // 동률일 경우: 첫 번째 반환 (상위 로직에서 필요시 동률 처리)
  return sorted[0][0];
}
