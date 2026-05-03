-- 00055_users_is_banned.sql
-- 영구 차단 플래그 추가 — 자발적 탈퇴(deleted_at)와 분리.
--
-- 배경:
--   - 38차 보안 사고: SQL injection payload 가입자(`'; DROP TABLE users; --` 등) → 운영진 deleted_at 으로 차단
--   - 한계: cron/hard-delete-withdrawn 이 14일 후 row 삭제 → kakao_id 기반 차단 풀림 → 재가입 가능
--   - 해결: is_banned=true 인 row 는 hard-delete cron 제외 + 카카오 로그인 진입 시 차단
--
-- 정책:
--   - 자발적 탈퇴: deleted_at 만 설정. 14일 후 hard-delete (재가입 가능)
--   - 영구 차단: is_banned=true. hard-delete 제외. 영구 차단

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false;

-- 차단된 row 조회 효율 (소수의 row만 true이므로 partial index)
CREATE INDEX IF NOT EXISTS users_is_banned_idx
  ON public.users (is_banned) WHERE is_banned = true;

COMMENT ON COLUMN public.users.is_banned IS '영구 차단 플래그. true면 카카오 로그인 거부 + hard-delete cron 제외 (영구 보존).';
