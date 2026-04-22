-- ============================================================
-- 00043: 회원 탈퇴 플로우 기반 — users.deleted_at + status CHECK 정정
-- ============================================================
-- 배경:
--   - 개인정보처리방침 제7조 "탈퇴 시 즉시 파기" 약속 이행을 위한 기반 마련
--   - team_members.status CHECK 가 DORMANT 를 거부하는 기존 버그도 함께 수정
--     (코드에선 DORMANT 광범위하게 사용 중이라 INSERT 실제 실패 위험)
--
-- 정책 (docs/withdraw-flow-plan.md):
--   - 탈퇴 시점: users.deleted_at = NOW()
--   - 즉시 익명화: phone, birth_date, profile_image_url → NULL, name → "탈퇴한 회원"
--   - team_members: 해당 사용자의 모든 팀 멤버십 status = 'LEFT'
--   - push_subscriptions / notifications / match_mvp_votes: CASCADE 로 즉시 삭제
--   - 14일 후 cron 으로 users row 물리 삭제 → CASCADE 로 posts·match_attendance·post_comments 정리
--
-- 검증:
--   SELECT deleted_at FROM users WHERE ... ;  -- 탈퇴자만 NOT NULL
--   모든 조회 쿼리에 WHERE deleted_at IS NULL 필터 추가 필요 (auth.ts 등)
-- ============================================================


-- 1. users.deleted_at 컬럼 추가
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 활성 사용자만 빠르게 조회하기 위한 부분 인덱스
CREATE INDEX IF NOT EXISTS users_active_idx
  ON public.users (id)
  WHERE deleted_at IS NULL;

-- 2. team_members.status CHECK 제약 재정의
--    기존: ('ACTIVE','PENDING','BANNED') — DORMANT 거부 (코드와 불일치)
--    신규: ('ACTIVE','PENDING','BANNED','DORMANT','LEFT') — DORMANT 정식 인정 + 탈퇴 'LEFT' 추가
ALTER TABLE public.team_members
  DROP CONSTRAINT IF EXISTS team_members_status_check;

ALTER TABLE public.team_members
  ADD CONSTRAINT team_members_status_check
  CHECK (status IN ('ACTIVE', 'PENDING', 'BANNED', 'DORMANT', 'LEFT'));

-- 3. 탈퇴 감사 로그 (추후 분쟁 대비) — 별도 테이블
CREATE TABLE IF NOT EXISTS public.account_withdrawal_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- users.id 참조하되 FK 없음 (hard delete 이후에도 로그 유지)
  kakao_id TEXT,
  withdrawn_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hard_deleted_at TIMESTAMPTZ,
  reason TEXT,
  notes TEXT
);

ALTER TABLE public.account_withdrawal_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_withdrawal_log FROM anon, authenticated;


-- 검증 쿼리 (수동 실행):
--   SELECT column_name, is_nullable FROM information_schema.columns
--    WHERE table_schema='public' AND table_name='users' AND column_name='deleted_at';
--   -- deleted_at / YES
--
--   SELECT conname, pg_get_constraintdef(oid)
--     FROM pg_constraint
--    WHERE conrelid='public.team_members'::regclass
--      AND conname='team_members_status_check';
--   -- CHECK (status IN (...,'DORMANT','LEFT'))
