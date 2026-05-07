-- 00066_match_sport_type.sql
-- 경기마다 종목(SOCCER/FUTSAL)을 별도로 지정할 수 있게 함.
-- 축구팀이지만 가끔 풋살을 하거나, 풋살팀이 가끔 축구를 하는 경우 대응.
--
-- 정책:
-- - sport_type IS NULL → 팀의 sport_type을 따라감 (기존 경기 호환)
-- - 새 경기는 명시적으로 SOCCER 또는 FUTSAL 저장
-- - 자동편성·역할가이드·전술판 모두 경기 sport_type 우선

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS sport_type TEXT;

-- CHECK 제약: sport_type은 NULL 또는 'SOCCER'/'FUTSAL'만 허용
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'matches_sport_type_check'
  ) THEN
    ALTER TABLE matches
      ADD CONSTRAINT matches_sport_type_check
      CHECK (sport_type IS NULL OR sport_type IN ('SOCCER', 'FUTSAL'));
  END IF;
END $$;

COMMENT ON COLUMN matches.sport_type IS
  '경기 종목 (SOCCER/FUTSAL). NULL이면 팀 sport_type 따라감. 새 경기는 명시 저장.';
