-- 출석 상태 컬럼 추가 (PRESENT, LATE, ABSENT)
-- 기존 actually_attended boolean은 유지 (하위 호환)
ALTER TABLE match_attendance ADD COLUMN IF NOT EXISTS attendance_status TEXT DEFAULT NULL;

-- 기존 데이터 마이그레이션
UPDATE match_attendance SET attendance_status = 'PRESENT' WHERE actually_attended = true AND attendance_status IS NULL;
UPDATE match_attendance SET attendance_status = 'ABSENT' WHERE actually_attended = false AND attendance_status IS NULL;
