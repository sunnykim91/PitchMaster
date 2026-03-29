-- 골 유형 컬럼 추가 (NORMAL, PK, FK, HEADER, OWN_GOAL)
ALTER TABLE match_goals ADD COLUMN IF NOT EXISTS goal_type TEXT NOT NULL DEFAULT 'NORMAL';

-- 기존 자책골 데이터 마이그레이션
UPDATE match_goals SET goal_type = 'OWN_GOAL' WHERE is_own_goal = true AND goal_type = 'NORMAL';
