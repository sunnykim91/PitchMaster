-- ============================================================
-- 00039: push_subscriptions RLS 정책 성능 최적화
-- ============================================================
--
-- 문제:
--   Supabase Performance Advisor "Auth RLS Initialization Plan" 경고 2건.
--   push_subscriptions 테이블의 RLS 정책이 auth.uid() 를 정책 expression
--   안에서 직접 호출 → PostgreSQL 이 모든 행마다 함수를 재실행.
--   규모가 커지면 SELECT 성능이 행 수만큼 선형 열화.
--
-- 해결:
--   (SELECT auth.uid()) 로 감싸서 InitPlan 으로 승격 → 쿼리당 1회만 평가.
--   공식 권고: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
--
-- 맥락:
--   PitchMaster 는 카카오 OAuth + 자체 세션쿠키 사용. Supabase Auth 를
--   쓰지 않으므로 auth.uid() 는 anon/authenticated 세션에서 항상 NULL.
--   실서비스 접근은 전부 SERVICE_ROLE (api/push/subscribe/route.ts) 로
--   RLS 우회. 본 정책은 "혹시라도 anon 키로 찔리더라도 못 읽게" 의 방어층.
--
-- 기존 정책 이름을 모르기 때문에 동적으로 전부 DROP 후 재생성.
-- ============================================================

-- 1. 기존 정책 전부 제거 (이름 모를 2건 포함)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT polname
      FROM pg_policy
     WHERE polrelid = 'public.push_subscriptions'::regclass
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.push_subscriptions', pol.polname);
  END LOOP;
END
$$;

-- 2. RLS 활성화 보장 (00009 에서 이미 켰지만 멱등 보장)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 3. 최적화된 정책 재생성 — (SELECT auth.uid()) 패턴
CREATE POLICY "push_subscriptions_select_own"
  ON public.push_subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "push_subscriptions_modify_own"
  ON public.push_subscriptions
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- 4. 검증 (수동):
-- SELECT polname, pg_get_expr(polqual, polrelid) AS qual
--   FROM pg_policy
--  WHERE polrelid = 'public.push_subscriptions'::regclass;
-- qual 이 "(user_id = ( SELECT auth.uid() AS uid))" 처럼 SELECT 감싸져 있으면 성공.
