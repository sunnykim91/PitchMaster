-- 팀 일정(EVENT) 종료일 필드
ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_end_date date;
