/**
 * MVP 유효성 임계값 — "실제 MVP"로 인정받으려면 해당 경기 참석자의
 * 일정 비율(기본 70%) 이상이 투표해야 함.
 *
 * 참석 인원이 적거나 투표 참여율이 낮으면 단순히 최다 득표자가 MVP로 확정되는
 * 대신 "MVP 없음"으로 처리해 신뢰도 높은 MVP만 집계에 반영한다.
 */
export const MVP_VOTE_THRESHOLD = 0.7;

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
 * @returns 당선자 candidate_id 또는 null
 */
export function resolveValidMvp(
  votes: string[],
  attendedCount: number
): string | null {
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
