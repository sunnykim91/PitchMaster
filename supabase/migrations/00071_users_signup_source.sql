-- users 가입 출처 추적
--
-- 자동 캡처되는 값:
--   utm_source 박힌 마케팅 링크 → 그 값 (예: 'daum_cafe', 'instagram_ad_4')
--   referrer fallback → 호스트 기반 단순화 ('daum', 'naver', 'instagram', 'google', 'youtube', 'kakao', 'direct')
--
-- Why:
--   카카오 OAuth 거치며 referrer 끊김. GA4 도 카카오 인앱 누락.
--   DB 컬럼이 가장 정확한 source-of-truth.
--   광고 cohort 별 retention 측정용. 휴면 회장 직접 컨택 안 통하는 환경에서
--   "다음 가입자부터 자동 측정" 인프라.
--
-- 형식: 짧은 식별자 (raw URL 저장 X, 분석 용이성 우선)
--   - utm_source 우선
--   - 없으면 referrer hostname 단순화
--   - 둘 다 없으면 'direct'
--   - 내부 페이지 이동(같은 도메인)이면 NULL (덮어쓰기 안 함)

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS signup_source TEXT;

COMMENT ON COLUMN public.users.signup_source IS
  '가입 시 utm_source 또는 referrer 자동 캡처 (예: daum_cafe, instagram_ad_4, naver, direct)';

-- 어드민 활성도/광고 cohort 분석에서 자주 필터
CREATE INDEX IF NOT EXISTS idx_users_signup_source
  ON public.users (signup_source)
  WHERE signup_source IS NOT NULL;
