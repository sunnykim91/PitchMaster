-- 경기 기록(골/어시) 입력을 운영진 이상으로 제한할지 토글
-- 기본값 false: 모든 팀원이 기록 가능 (기존 동작)
-- true 로 설정 시 STAFF 이상만 골/어시 기록 가능, 평회원은 보기만
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS stats_recording_staff_only boolean NOT NULL DEFAULT false;
