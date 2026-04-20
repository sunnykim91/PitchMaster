-- ============================================================
-- 00034: dues_records 납부자 이름 snapshot
-- ============================================================
--
-- 문제:
--   dues_records.user_id 는 ON DELETE SET NULL 이라 회원 탈퇴·삭제 시
--   납부자 추적 불가 → 회비 감사·분쟁 시 증빙 증발.
--
-- 해결:
--   1) member_name_snapshot TEXT 컬럼 추가
--   2) users 테이블 BEFORE DELETE 트리거로 해당 사용자의
--      dues_records 모든 행에 삭제 직전 이름을 저장
--   3) recorded_by 쪽도 동일하게 recorded_by_name_snapshot 추가
--
-- 주의:
--   - 기존에 이미 NULL 로 날아간 기록은 복구 불가 (이 트리거 이후 삭제되는 건만 보존)
--   - 조회 UI 에서 user_id 가 NULL 이면 snapshot 을 표시하도록 별도 작업 필요
-- ============================================================

-- 1. snapshot 컬럼 추가
ALTER TABLE dues_records
  ADD COLUMN IF NOT EXISTS member_name_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS recorded_by_name_snapshot TEXT;

COMMENT ON COLUMN dues_records.member_name_snapshot IS
  '납부자(user_id) 삭제 직전 이름 보존. 회원 탈퇴·삭제 후 감사용. 트리거 snapshot_dues_before_user_delete 가 자동 채움.';
COMMENT ON COLUMN dues_records.recorded_by_name_snapshot IS
  '기록자(recorded_by) 삭제 직전 이름 보존. 회원 탈퇴·삭제 후 책임 추적용.';

-- 2. 트리거 함수 — users BEFORE DELETE 시점에 snapshot 채우기
CREATE OR REPLACE FUNCTION snapshot_dues_member_name()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- 납부자(user_id) 연결된 행
  UPDATE dues_records
  SET member_name_snapshot = OLD.name
  WHERE user_id = OLD.id
    AND member_name_snapshot IS NULL;

  -- 기록자(recorded_by) 연결된 행
  UPDATE dues_records
  SET recorded_by_name_snapshot = OLD.name
  WHERE recorded_by = OLD.id
    AND recorded_by_name_snapshot IS NULL;

  RETURN OLD;
END;
$$;

-- 3. 트리거 등록 (BEFORE DELETE on users)
DROP TRIGGER IF EXISTS snapshot_dues_before_user_delete ON users;
CREATE TRIGGER snapshot_dues_before_user_delete
  BEFORE DELETE ON users
  FOR EACH ROW
  EXECUTE FUNCTION snapshot_dues_member_name();

-- 4. 검증 (실행 후 수동 확인용 주석)
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'dues_records'
--   AND column_name IN ('member_name_snapshot', 'recorded_by_name_snapshot');
-- SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'snapshot_dues_before_user_delete';
