-- 00054_team_creation_log.sql
-- 팀 생성 rate limit용 audit 테이블.
--
-- 배경: 38차 보안 사고 — 동일 카카오 ID(장진영)가 8초 간격으로 2팀 생성 / DROP TABLE payload 시도
-- 정책: 사용자당 시간 1팀, 일 3팀 제한 (`src/lib/server/teamCreationRateLimit.ts`)
--
-- teams 테이블에는 created_by 컬럼이 없어 팀 생성자 추적 불가했음.
-- 별도 log 테이블로 분리 — 팀 삭제·이임 영향 없이 감사 추적.

CREATE TABLE IF NOT EXISTS public.team_creation_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  kakao_id    TEXT,                                    -- snapshot (users 행 삭제 후에도 추적용)
  team_id     UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  team_name   TEXT,                                    -- snapshot
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rate limit 조회 인덱스 (user별 최근순)
CREATE INDEX IF NOT EXISTS team_creation_log_user_created_idx
  ON public.team_creation_log (user_id, created_at DESC);

-- kakao_id 기준 조회 (사용자 row 삭제 후 추적)
CREATE INDEX IF NOT EXISTS team_creation_log_kakao_created_idx
  ON public.team_creation_log (kakao_id, created_at DESC)
  WHERE kakao_id IS NOT NULL;

-- RLS — service role만 insert/select. 일반 사용자 직접 접근 불필요
ALTER TABLE public.team_creation_log ENABLE ROW LEVEL SECURITY;

-- 모든 정책 미정의 = 비-service role 차단

COMMENT ON TABLE public.team_creation_log IS '팀 생성 audit log — rate limit + 의심 행위 추적';
COMMENT ON COLUMN public.team_creation_log.kakao_id IS '카카오 ID snapshot. users 행 삭제 후에도 차단 조회 가능';
