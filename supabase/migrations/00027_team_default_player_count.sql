-- 팀별 기본 참가 인원 수 컬럼 추가
-- 축구: 기본 11 (8/9/10/11 지원), 풋살: 기본 6 (3~6 지원)
-- 경기 등록 시 이 값을 기본값으로 상속, 경기별 오버라이드 가능

ALTER TABLE teams ADD COLUMN IF NOT EXISTS default_player_count INT DEFAULT 11;

-- 풋살팀은 기본 6으로 보정 (NULL인 경우만)
UPDATE teams SET default_player_count = 6
  WHERE sport_type = 'FUTSAL' AND default_player_count IS NULL;

-- 축구팀은 NULL이면 11로 보정
UPDATE teams SET default_player_count = 11
  WHERE sport_type = 'SOCCER' AND default_player_count IS NULL;
