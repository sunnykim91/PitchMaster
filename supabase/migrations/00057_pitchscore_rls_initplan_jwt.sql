-- 00057_pitchscore_rls_initplan_jwt.sql
-- 00056 후속 — Performance Advisor 잔여 3건 ("Auth RLS Initialization Plan") 해소.
--
-- 00056에서 적용한 `(SELECT auth.jwt() ->> 'sub')` 패턴은 Advisor 매칭에 여전히 잡힘.
-- 함수 자체만 서브쿼리화하는 정확한 형태로 재작성:
--   `((SELECT auth.jwt()) ->> 'sub')`
--
-- 의미·권한 변화 없음. initPlan 캐시 활용은 동일.
--
-- 적용 대상 3개 정책 (player_evaluations):
--   - evaluations_insert_self
--   - evaluations_update_self
--   - evaluations_delete_self

DROP POLICY IF EXISTS "evaluations_insert_self" ON public.player_evaluations;
CREATE POLICY "evaluations_insert_self" ON public.player_evaluations
  FOR INSERT WITH CHECK (
    evaluator_user_id IN (
      SELECT id FROM public.users WHERE kakao_id = ((SELECT auth.jwt()) ->> 'sub')
    )
  );

DROP POLICY IF EXISTS "evaluations_update_self" ON public.player_evaluations;
CREATE POLICY "evaluations_update_self" ON public.player_evaluations
  FOR UPDATE USING (
    evaluator_user_id IN (
      SELECT id FROM public.users WHERE kakao_id = ((SELECT auth.jwt()) ->> 'sub')
    )
  );

DROP POLICY IF EXISTS "evaluations_delete_self" ON public.player_evaluations;
CREATE POLICY "evaluations_delete_self" ON public.player_evaluations
  FOR DELETE USING (
    evaluator_user_id IN (
      SELECT id FROM public.users WHERE kakao_id = ((SELECT auth.jwt()) ->> 'sub')
    )
  );
