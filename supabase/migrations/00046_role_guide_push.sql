-- ============================================================
-- 00046: 투표 마감 직후 "역할 가이드" 푸시 발송 추적
-- ============================================================
--
-- 목적:
--   vote_deadline 이 지나면 참석(ATTEND) 투표자들에게 개인별 예상 역할 알림.
--   편성(match_squads) 있으면 쿼터별 구체 포지션, 없으면 일반 안내.
--
-- 추가 컬럼:
--   - matches.role_guide_push_sent_at — 중복 발송 방지
--
-- 중요: 기존 vote_deadline 지난 경기는 전부 "이미 발송" 으로 백필 처리
--       (mvp_push_sent_at 때 겪은 과거 경기 푸시 폭탄 사고 재발 방지)
-- ============================================================

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS role_guide_push_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.matches.role_guide_push_sent_at IS
  '투표 마감 후 역할 가이드 푸시 발송 시각. NULL = 미발송.';

-- 미발송 경기 빠른 조회 인덱스
CREATE INDEX IF NOT EXISTS matches_role_guide_push_unsent_idx
  ON public.matches (vote_deadline, status)
  WHERE role_guide_push_sent_at IS NULL AND status = 'SCHEDULED';

-- 기존 vote_deadline 지난 경기는 전부 sent 로 마킹 (푸시 폭탄 방지)
UPDATE public.matches
   SET role_guide_push_sent_at = NOW()
 WHERE role_guide_push_sent_at IS NULL
   AND vote_deadline IS NOT NULL
   AND vote_deadline <= NOW();

-- 검증 (수동):
-- SELECT column_name FROM information_schema.columns
--  WHERE table_name = 'matches' AND column_name = 'role_guide_push_sent_at';
-- SELECT COUNT(*) FROM matches
--  WHERE role_guide_push_sent_at IS NULL AND vote_deadline <= NOW();
-- → 0 이어야 정상 (백필 성공)
