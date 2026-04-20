-- MVP 투표 운영진 전용 설정
-- mvp_vote_staff_only: true이면 STAFF 이상만 MVP 투표 가능
-- 기본값 false → 기존 팀 동작 유지 (모든 참석자 투표 가능)
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS mvp_vote_staff_only boolean NOT NULL DEFAULT false;

-- is_staff_decision: 운영진이 직접 지정한 투표 여부
-- true이면 투표율(70%) 체크 없이 즉시 MVP 확정
ALTER TABLE match_mvp_votes
  ADD COLUMN IF NOT EXISTS is_staff_decision boolean NOT NULL DEFAULT false;
