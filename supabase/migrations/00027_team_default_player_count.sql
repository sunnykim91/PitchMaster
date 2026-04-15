-- 팀별 기본 참가 인원 수 컬럼 추가
-- 축구: 기본 11 (8/9/10/11 지원), 풋살: 기본 6 (3~6 지원)
-- 경기 등록 시 이 값을 기본값으로 상속, 경기별 오버라이드 가능

ALTER TABLE teams ADD COLUMN IF NOT EXISTS default_player_count INT DEFAULT 11;

-- 풋살팀은 6으로 재설정 (ADD COLUMN DEFAULT 11이 이미 적용된 상태 대응)
UPDATE teams SET default_player_count = 6
  WHERE sport_type = 'FUTSAL';

-- 축구팀은 기본 11 유지 (명시적 재설정은 NULL 방어 용도)
UPDATE teams SET default_player_count = 11
  WHERE sport_type = 'SOCCER' AND default_player_count IS NULL;
