-- ============================================================
-- 00038: snapshot_dues_member_name 함수 search_path 고정
-- ============================================================
--
-- 문제:
--   Supabase Security Advisor 경고 "Function Search Path Mutable".
--   00034 에서 만든 public.snapshot_dues_member_name() 는 search_path
--   가 설정돼 있지 않아 세션별로 달라질 수 있음.
--   악성 스키마를 먼저 검색하도록 조작되면 다른 테이블이 UPDATE 될
--   여지가 있음 (SECURITY DEFINER 아님에도 권고 사항).
--
-- 해결:
--   함수에 SET search_path = public, pg_temp 고정.
--   - public: dues_records 가 있는 스키마
--   - pg_temp: PostgreSQL 권고 관행 (임시 테이블용 꼬리)
--
-- 주의:
--   함수 바디·트리거는 그대로. 옵션만 추가하는 ALTER.
-- ============================================================

ALTER FUNCTION public.snapshot_dues_member_name()
  SET search_path = public, pg_temp;

-- 검증 (실행 후 수동 확인용):
-- SELECT proname, proconfig
--   FROM pg_proc
--  WHERE proname = 'snapshot_dues_member_name';
-- proconfig 에 {search_path=public, pg_temp} 가 보이면 성공.
