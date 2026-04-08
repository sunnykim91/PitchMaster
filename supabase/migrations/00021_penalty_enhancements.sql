-- penalty_rules: 트리거 타입 추가 (LATE, ABSENT, NO_VOTE)
ALTER TABLE penalty_rules ADD COLUMN IF NOT EXISTS trigger_type TEXT DEFAULT 'CUSTOM';
ALTER TABLE penalty_rules ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- penalty_records: 경기 연동 + 상태 확장
ALTER TABLE penalty_records ADD COLUMN IF NOT EXISTS match_id UUID REFERENCES matches(id) ON DELETE SET NULL;
ALTER TABLE penalty_records ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'UNPAID';
ALTER TABLE penalty_records ADD COLUMN IF NOT EXISTS dues_record_id UUID REFERENCES dues_records(id) ON DELETE SET NULL;

-- 기존 is_paid → status 마이그레이션
UPDATE penalty_records SET status = 'PAID' WHERE is_paid = true AND status = 'UNPAID';
