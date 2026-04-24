-- ============================================================
-- 00045: MVP 투표 시작 푸시 + 선수 카드 OVR 변동 알림 인프라
-- ============================================================
--
-- 목적:
--   1) 경기 종료 감지 직후 "MVP 투표 시작" 팀 전체 푸시 — 멱등 보장
--   2) 경기 출석자의 OVR 재계산해 변동 감지 → 개인 푸시
--
-- 추가 컬럼:
--   - matches.mvp_push_sent_at — 중복 발송 방지
--   - team_members.last_ovr / last_ovr_updated_at — 직전 OVR 스냅샷
--
-- 참고:
--   match_result 크론과 유사한 멱등성 패턴 (UPDATE ... WHERE IS NULL)
-- ============================================================

-- 1. matches.mvp_push_sent_at — MVP 투표 시작 푸시 발송 시각
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS mvp_push_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.matches.mvp_push_sent_at IS
  'MVP 투표 시작 푸시 발송 시각. NULL 이면 미발송. 크론이 멱등 보장 UPDATE 에 사용.';

-- 미발송 경기 빠른 조회 인덱스
CREATE INDEX IF NOT EXISTS matches_mvp_push_unsent_idx
  ON public.matches (status, match_date)
  WHERE mvp_push_sent_at IS NULL AND status = 'COMPLETED';

-- 중요: 기존 COMPLETED 경기는 전부 "이미 발송됨" 으로 백필 처리.
-- 이 백필이 없으면 크론이 전체 과거 경기에 대해 MVP 푸시를 쏘는 사고가 남
-- (실제로 2026-04-24 첫 배포 때 발생해 수습 SQL 별도로 실행).
UPDATE public.matches
   SET mvp_push_sent_at = NOW()
 WHERE status = 'COMPLETED'
   AND mvp_push_sent_at IS NULL;

-- 2. team_members.last_ovr — 직전 시즌 OVR 스냅샷
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS last_ovr SMALLINT,
  ADD COLUMN IF NOT EXISTS last_ovr_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.team_members.last_ovr IS
  '직전에 알림 발송한 OVR 값. 경기 후 재계산 결과와 비교해 변동 감지.';
COMMENT ON COLUMN public.team_members.last_ovr_updated_at IS
  'last_ovr 마지막 업데이트 시각.';

-- 3. 검증 (수동 실행용):
-- SELECT column_name, data_type FROM information_schema.columns
--  WHERE table_name = 'matches' AND column_name = 'mvp_push_sent_at';
-- SELECT column_name, data_type FROM information_schema.columns
--  WHERE table_name = 'team_members' AND column_name IN ('last_ovr', 'last_ovr_updated_at');
-- SELECT indexname FROM pg_indexes WHERE indexname = 'matches_mvp_push_unsent_idx';
