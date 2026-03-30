-- 팀 기본 포메이션 설정
ALTER TABLE teams ADD COLUMN IF NOT EXISTS default_formation_id text;
