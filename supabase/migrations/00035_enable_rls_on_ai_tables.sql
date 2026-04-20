-- ============================================================
-- 00035: AI 관련 캐시·로그 테이블 RLS 활성화
-- ============================================================
--
-- 문제:
--   ai_usage_log / ai_ocr_cache / ai_team_stats_cache 세 테이블이
--   마이그레이션 00029~31 생성 당시 RLS enable 구문이 누락돼
--   anon key 로 curl 직접 조회 시 전체 데이터 유출 가능.
--   Supabase Security Advisor 에 "RLS Disabled in Public" ERROR 3건.
--
-- 영향 분석:
--   - 서버 admin client (service_role) 은 RLS 우회하므로 기존 기능 영향 0.
--   - anon client 는 이 3개 테이블을 구독·조회하지 않음 (Realtime 대상 아님).
--   - 따라서 enable 만 해도 정책 없이 "아무도 접근 못 함" 상태가 되며
--     이것이 우리가 원하는 기본값.
--
-- 근본 방어 (B안 — 카카오 세션 → Supabase JWT) 는 별도 스프린트.
--   이 마이그레이션은 "기본값 맞추기" 수준의 최소 조치.
-- ============================================================

ALTER TABLE public.ai_usage_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_ocr_cache        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_team_stats_cache ENABLE ROW LEVEL SECURITY;

-- 검증 (실행 후 수동)
-- SELECT tablename, rowsecurity FROM pg_tables
--   WHERE schemaname = 'public'
--   AND tablename IN ('ai_usage_log','ai_ocr_cache','ai_team_stats_cache');
-- 결과 rowsecurity 모두 true 여야 함.
