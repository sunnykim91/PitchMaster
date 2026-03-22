-- notification_settings: user_id unique 제약 재적용 (upsert 오류 수정)
-- 기존 제약이 있으면 삭제 후 재생성
DO $$
BEGIN
  -- 기존 unique 제약 삭제 시도
  BEGIN
    ALTER TABLE notification_settings DROP CONSTRAINT IF EXISTS notification_settings_user_id_key;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- unique 제약 재생성
  ALTER TABLE notification_settings ADD CONSTRAINT notification_settings_user_id_key UNIQUE (user_id);
END $$;

-- email 컬럼 제거 (이메일 알림 미사용)
ALTER TABLE notification_settings DROP COLUMN IF EXISTS email;
