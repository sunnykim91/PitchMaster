-- 00060_pitchscore_drop_legacy_unique.sql
-- PitchScore 평가 종목 분리 (00059) 후속 핫픽스.
--
-- 배경 (43차):
--   00059 의 `DROP CONSTRAINT IF EXISTS player_evaluations_target_user_id_evaluator_user_id_attribute_c`
--   가 실제 자동 생성된 이름과 안 맞아 silent fail.
--   실제 이름: `player_evaluations_target_user_id_evaluator_user_id_attribu_key`
--   결과: sport_type 무관 (target, evaluator, attribute_code) 옛 unique 가 살아있어
--         FCMZ SOCCER 평가 후 FCMZ 풋살(FUTSAL) 평가 시 23505 duplicate key 발생.
--
-- 정책:
--   - `player_evaluations_unique_per_sport` 외 모든 unique constraint 정리.
--   - 미래에 비슷한 이름 미스매치가 또 생겨도 잡히도록 DO 루프로 동적 처리.
--   - 신규 제약이 없으면 안전망으로 재생성.

DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.player_evaluations'::regclass
      AND contype = 'u'
      AND conname <> 'player_evaluations_unique_per_sport'
  LOOP
    EXECUTE format('ALTER TABLE player_evaluations DROP CONSTRAINT %I', c.conname);
  END LOOP;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.player_evaluations'::regclass
      AND conname = 'player_evaluations_unique_per_sport'
  ) THEN
    ALTER TABLE player_evaluations
      ADD CONSTRAINT player_evaluations_unique_per_sport
      UNIQUE (target_user_id, evaluator_user_id, attribute_code, sport_type);
  END IF;
END$$;
