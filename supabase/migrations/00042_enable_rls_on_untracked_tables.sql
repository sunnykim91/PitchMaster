-- ============================================================
-- 00042: 대시보드 수동 생성 테이블 RLS 활성화
-- ============================================================
-- 배경:
--   Supabase Security Advisor 에서 "rls_disabled_in_public" 경고 발생
--   (2026-04-19 이메일). 원인은 아래 두 테이블이 supabase/migrations/
--   이력 없이 대시보드 SQL 에디터에서 직접 생성돼 RLS 플래그가 OFF 상태.
--
--   - dues_payment_status  (회비 월별 납부 상태 캐시, 791 rows)
--   - legacy_player_stats  (과거 선수 기록 이관용, 441 rows)
--
-- 위험:
--   현재는 anon/authenticated 에 GRANT 가 없어 외부 접근 차단됐지만,
--   실수로 GRANT 한 번 추가되면 즉시 공개. 그리고 Advisor 경고는 계속됨.
--
-- 조치 (00035 와 동일 방침):
--   서버는 service_role 로만 접근하므로 정책 없이 ENABLE RLS 만으로 충분.
--   방어적으로 anon/authenticated 권한 revoke 병행.
--
-- 롤백:
--   운영상 정책 공백이 문제되면 ALTER ... DISABLE ROW LEVEL SECURITY 로
--   되돌릴 수 있지만, Advisor 경고가 재발함.
-- ============================================================

ALTER TABLE public.dues_payment_status   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legacy_player_stats   ENABLE ROW LEVEL SECURITY;

-- 방어적 권한 회수 (service_role 은 RLS 우회하므로 서버 로직 영향 없음)
REVOKE ALL ON public.dues_payment_status FROM anon, authenticated;
REVOKE ALL ON public.legacy_player_stats FROM anon, authenticated;

-- 검증용 쿼리 (수동 실행):
--   SELECT tablename, rowsecurity
--     FROM pg_tables
--    WHERE schemaname='public'
--      AND tablename IN ('dues_payment_status','legacy_player_stats');
--   -- 둘 다 rowsecurity = true 여야 함
