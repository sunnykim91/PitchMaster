-- quarter_number를 nullable로 변경
-- 0 = 쿼터 모름 → null 로 저장 (기존 0 값도 null 로 업데이트)
ALTER TABLE match_goals ALTER COLUMN quarter_number DROP NOT NULL;

-- 기존에 0으로 저장된 값이 있다면 null로 정리
UPDATE match_goals SET quarter_number = NULL WHERE quarter_number = 0;
