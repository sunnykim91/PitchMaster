-- 00067_alpha_testers.sql
-- Play Store 알파 테스터 등록 명단 + 14일 활동 추적
--
-- 배경:
--   Google Play 프로덕션 액세스 요건: 12명 이상이 14일 연속 비공개 테스트 참여.
--   "참여" = 단순 옵트인이 아니라 실제 매일 앱 실행이 측정됨.
--   누가 며칠째 안 켰는지 식별해 reminder 보낼 운영 도구 필요.
--
-- 흐름:
--   1) 사용자가 안드로이드에서 대시보드 모달 → 구글 이메일 입력 → alpha_testers INSERT
--   2) 운영자가 Play Console에 해당 이메일 등록 후 approved_at 표시
--   3) 사용자가 PitchMaster 진입할 때마다 /api/alpha-testers/ping → daily_log UPSERT
--   4) /admin/alpha-testers 페이지에서 14일 출석 그리드 확인

-- 알파 테스터 등록 명단
CREATE TABLE IF NOT EXISTS public.alpha_testers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  google_email TEXT NOT NULL,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,  -- 운영자가 Play Console에 등록 완료한 시점
  rewarded_at TIMESTAMPTZ,  -- 커피 쿠폰 지급 완료 시점
  notes TEXT,
  CONSTRAINT alpha_testers_user_unique UNIQUE (user_id),
  CONSTRAINT alpha_testers_email_unique UNIQUE (google_email)
);

CREATE INDEX IF NOT EXISTS idx_alpha_testers_registered_at
  ON public.alpha_testers (registered_at DESC);

-- 일별 출석 로그 (KST 기준 날짜)
CREATE TABLE IF NOT EXISTS public.alpha_tester_daily_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alpha_tester_id UUID NOT NULL REFERENCES public.alpha_testers(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT alpha_tester_daily_log_unique UNIQUE (alpha_tester_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_alpha_tester_daily_log_tester_date
  ON public.alpha_tester_daily_log (alpha_tester_id, log_date DESC);

-- RLS: 두 테이블 모두 service_role 전용 (일반 클라이언트 직접 접근 차단)
-- API 라우트가 본인 인증 후 admin client로 처리
ALTER TABLE public.alpha_testers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alpha_tester_daily_log ENABLE ROW LEVEL SECURITY;
-- 정책 미정의 → 일반 클라이언트 접근 차단, service_role 만 가능

COMMENT ON TABLE public.alpha_testers IS 'Play Store 알파 테스터 등록 명단 (구글 이메일 + PitchMaster user_id 매핑)';
COMMENT ON TABLE public.alpha_tester_daily_log IS '알파 테스터 일별 출석 로그 (14일 연속 활동 추적용)';
