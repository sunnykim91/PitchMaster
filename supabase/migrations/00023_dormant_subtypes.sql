-- team_members 휴면 세분화: 부상 / 개인사정
-- status는 기존 DORMANT 그대로 사용, 세부 사유를 별도 컬럼으로 관리
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS dormant_type TEXT; -- 'INJURED' | 'PERSONAL'
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS dormant_until DATE;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS dormant_reason TEXT;
