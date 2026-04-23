-- ============================================================
-- 00041: push_subscriptions RLS 정책 중복 제거
-- ============================================================
--
-- 문제:
--   Supabase Performance Advisor "Multiple Permissive Policies" 경고.
--   00039 에서 만든 두 정책이 authenticated 역할의 SELECT 액션에 대해
--   동시에 평가됨 → 쿼리당 두 번 평가되는 비용.
--     - push_subscriptions_select_own (FOR SELECT)
--     - push_subscriptions_modify_own (FOR ALL)  ← SELECT 도 포함
--
--   "FOR ALL" 이 이미 SELECT/INSERT/UPDATE/DELETE 전부 커버하므로
--   별도 FOR SELECT 정책은 불필요.
--
-- 해결:
--   push_subscriptions_select_own 정책만 DROP.
--   push_subscriptions_modify_own 이 동일한 조건으로 SELECT 도 계속 허용.
--
-- 기능 영향: 없음. 조건 (user_id = (SELECT auth.uid())) 가 양쪽에서
--   동일했으므로 SELECT 권한 변화 없음.
-- ============================================================

DROP POLICY IF EXISTS push_subscriptions_select_own ON public.push_subscriptions;

-- 검증 (수동):
-- SELECT polname, polcmd, pg_get_expr(polqual, polrelid) AS qual
--   FROM pg_policy
--  WHERE polrelid = 'public.push_subscriptions'::regclass;
-- 결과에 push_subscriptions_modify_own 1 개만 남아야 성공.
