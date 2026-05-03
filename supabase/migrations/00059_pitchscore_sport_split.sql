-- 00059_pitchscore_sport_split.sql
-- PitchScore 능력치 평가를 sport_type 단위로 분리.
--
-- 배경 (42차):
--   같은 사용자가 축구팀(FCMZ)과 풋살팀(FCMZ 풋살)에 둘 다 가입한 케이스.
--   00050 초기 설계는 user 레벨 글로벌 저장이라 점수가 두 팀에 다 적용됨.
--   풋살에서는 헤딩·크로스·롱패스 같은 능력치가 의미가 약한데도 합쳐져
--   종목 구분 없는 부정확한 평가가 됨.
--
-- 정책:
--   - sport_type 단위로 분리 (SOCCER vs FUTSAL)
--   - 같은 종목 내에선 글로벌 유지 (이직 케이스 보호)
--   - 풋살에서 비활성: CROSS, FREE_KICK, HEADING, LONG_PASS
--   - 풋살 특유 능력치 신규 추가 없음 (기존 22개 중 18개로 평가)
--
-- 기존 데이터 처리:
--   - player_evaluations 18건 (FCMZ SOCCER 본인 SELF) → team_id 의 sport_type 으로 백필
--   - player_attribute_scores 0건 → 신규 PK 적용 후 다음 집계 시 자연 재생성
--
-- 마이그레이션 후 작업:
--   - 코드 6개: aggregate.ts·route.ts(2)·types.ts·PitchScoreCard·EvaluationModal sport_type 분기
--   - 단위 테스트 sport 분기 케이스 추가
--   - 빌드·테스트·김선휘 검증 (Feature Flag 유지된 상태)

-- 1) player_evaluations 에 sport_type
ALTER TABLE player_evaluations
  ADD COLUMN IF NOT EXISTS sport_type text NOT NULL DEFAULT 'SOCCER'
  CHECK (sport_type IN ('SOCCER', 'FUTSAL'));

-- 2) 기존 평가 데이터 백필 — team_id 의 sport_type 으로
UPDATE player_evaluations pe
SET sport_type = t.sport_type
FROM teams t
WHERE pe.team_id = t.id AND pe.sport_type = 'SOCCER';

-- 3) unique constraint 갱신 (sport_type 포함)
--    PG 자동 생성 이름이 63자에서 잘려 저장됨 (..._attribute_c)
ALTER TABLE player_evaluations
  DROP CONSTRAINT IF EXISTS player_evaluations_target_user_id_evaluator_user_id_attribute_c;
ALTER TABLE player_evaluations
  ADD CONSTRAINT player_evaluations_unique_per_sport
  UNIQUE (target_user_id, evaluator_user_id, attribute_code, sport_type);

-- 4) player_attribute_scores 에 sport_type + PK 재구성
ALTER TABLE player_attribute_scores
  ADD COLUMN IF NOT EXISTS sport_type text NOT NULL DEFAULT 'SOCCER'
  CHECK (sport_type IN ('SOCCER', 'FUTSAL'));

ALTER TABLE player_attribute_scores
  DROP CONSTRAINT IF EXISTS player_attribute_scores_pkey;
ALTER TABLE player_attribute_scores
  ADD CONSTRAINT player_attribute_scores_pkey
  PRIMARY KEY (user_id, sport_type, attribute_code);

-- 5) 능력치 코드에 적용 종목 컬럼
ALTER TABLE player_attribute_codes
  ADD COLUMN IF NOT EXISTS applicable_sports text[] NOT NULL
  DEFAULT ARRAY['SOCCER', 'FUTSAL'];

-- 6) 축구 전용 4개 (풋살에서 비활성)
UPDATE player_attribute_codes
SET applicable_sports = ARRAY['SOCCER']
WHERE code IN ('CROSS', 'FREE_KICK', 'HEADING', 'LONG_PASS');

-- 7) sport_type 분기 쿼리 효율을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_player_evaluations_target_sport
  ON player_evaluations(target_user_id, sport_type, attribute_code);

COMMENT ON COLUMN player_evaluations.sport_type IS 'PitchScore 평가 종목 (SOCCER/FUTSAL). team_id 의 sport_type 과 일치해야 함';
COMMENT ON COLUMN player_attribute_scores.sport_type IS 'PitchScore 집계 종목별 분리. 같은 user 도 SOCCER·FUTSAL 별도 row';
COMMENT ON COLUMN player_attribute_codes.applicable_sports IS '능력치 적용 종목 배열. 풋살에 적용 안 되는 4개(CROSS·FREE_KICK·HEADING·LONG_PASS)는 ARRAY[''SOCCER'']';
