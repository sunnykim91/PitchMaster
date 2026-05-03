-- 00056_pitchscore_rls_initplan.sql
-- Performance Advisor "Auth RLS Initialization Plan" 경고 5건 해소.
--
-- 배경:
--   00050에서 player_evaluations·player_attribute_scores RLS 정책에 `auth.uid()` /
--   `auth.jwt() ->> 'sub'`를 직접 호출. 매 row마다 함수 재호출되어 성능 저하 위험.
--
-- 수정:
--   `(SELECT auth.<fn>())` 로 감싸 initPlan 단계에서 1회만 평가되도록 변경.
--   기능·권한 변화 없음 (논리적 동치).
--
-- 적용 대상 5개 정책:
--   - evaluations_select_authenticated (player_evaluations)
--   - evaluations_insert_self          (player_evaluations)
--   - evaluations_update_self          (player_evaluations)
--   - evaluations_delete_self          (player_evaluations)
--   - scores_select_authenticated      (player_attribute_scores)

-- player_evaluations
DROP POLICY IF EXISTS "evaluations_select_authenticated" ON public.player_evaluations;
CREATE POLICY "evaluations_select_authenticated" ON public.player_evaluations
  FOR SELECT USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "evaluations_insert_self" ON public.player_evaluations;
CREATE POLICY "evaluations_insert_self" ON public.player_evaluations
  FOR INSERT WITH CHECK (
    evaluator_user_id IN (
      SELECT id FROM public.users WHERE kakao_id = (SELECT auth.jwt() ->> 'sub')
    )
  );

DROP POLICY IF EXISTS "evaluations_update_self" ON public.player_evaluations;
CREATE POLICY "evaluations_update_self" ON public.player_evaluations
  FOR UPDATE USING (
    evaluator_user_id IN (
      SELECT id FROM public.users WHERE kakao_id = (SELECT auth.jwt() ->> 'sub')
    )
  );

DROP POLICY IF EXISTS "evaluations_delete_self" ON public.player_evaluations;
CREATE POLICY "evaluations_delete_self" ON public.player_evaluations
  FOR DELETE USING (
    evaluator_user_id IN (
      SELECT id FROM public.users WHERE kakao_id = (SELECT auth.jwt() ->> 'sub')
    )
  );

-- player_attribute_scores
DROP POLICY IF EXISTS "scores_select_authenticated" ON public.player_attribute_scores;
CREATE POLICY "scores_select_authenticated" ON public.player_attribute_scores
  FOR SELECT USING ((SELECT auth.uid()) IS NOT NULL);
