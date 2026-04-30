-- 00048_grandfather_users.sql
-- 유료 전환 시 기존 사용자 보호용 grandfather 컬럼.
--
-- 정책:
--   - grandfathered_until = NULL → 일반 신규 사용자 (유료 시 정상 가격 적용)
--   - grandfathered_until = '2027-12-31' → 해당 일자까지 모든 유료 기능 무료 사용
--   - grandfathered_tier = 'pro' / 'premium' → grandfather 종료 후 적용될 평생 할인 tier (선택)
--
-- 백필 (별도 SQL 실행 필요):
--   UPDATE public.users SET grandfathered_until = '2027-12-31'
--    WHERE created_at < '2027-01-01';

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS grandfathered_until DATE,
  ADD COLUMN IF NOT EXISTS grandfathered_tier TEXT
    CHECK (grandfathered_tier IS NULL OR grandfathered_tier IN ('free', 'pro', 'premium'));

COMMENT ON COLUMN public.users.grandfathered_until IS '유료 전환 후 무료 사용 보장 만료일. NULL이면 grandfather 대상 아님.';
COMMENT ON COLUMN public.users.grandfathered_tier IS 'grandfather 만료 후 평생 적용될 tier (할인 정책용). NULL이면 일반 가격.';

-- 인덱스 (만료일 기반 일괄 알림 등에 활용)
CREATE INDEX IF NOT EXISTS users_grandfathered_until_idx
  ON public.users (grandfathered_until)
  WHERE grandfathered_until IS NOT NULL;
