-- 00081_referrals.sql
-- 추천 리워드 — 상대팀 회장 초대 → 활성화 시 기프티콘 지급 추적
--
-- 흐름:
--   1) 사용자가 대시보드 초대 카드 → ?ref=<본인 user_id> 링크 공유
--   2) 초대받은 사람이 그 링크로 신규 가입 → referrals INSERT (PENDING)
--   3) 초대된 사람이 팀 생성(회장) → referred_team_id 연결
--   4) 그 팀이 첫 경기를 COMPLETED로 진행 → 활성화 cron 이 status=ACTIVATED
--   5) /admin 추천 리워드 뷰에서 운영자가 기프티콘 발송 후 REWARDED

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,   -- 초대한 사람
  referred_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,   -- 초대받아 가입한 사람
  referred_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,           -- 초대된 사람이 만든 팀
  status TEXT NOT NULL DEFAULT 'PENDING',   -- PENDING | ACTIVATED | REWARDED | VOID
  activated_at TIMESTAMPTZ,                  -- 초대된 팀 첫 COMPLETED 경기 진행 시점
  rewarded_at TIMESTAMPTZ,                   -- 기프티콘 지급 완료
  reward_note TEXT,                          -- 지급 메모 (운영자)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT referrals_referred_user_unique UNIQUE (referred_user_id),        -- 한 사람은 한 번만 피추천
  CONSTRAINT referrals_no_self CHECK (referrer_user_id <> referred_user_id)   -- 자기추천 금지
);

CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals (referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_team ON public.referrals (referred_team_id);

-- RLS: service_role 전용 (일반 클라이언트 직접 접근 차단). API 라우트가 본인 인증 후 admin client 로 처리.
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
-- 정책 미정의 → 일반 클라이언트 접근 차단, service_role 만 가능 (alpha_testers 00067 과 동일 패턴)

COMMENT ON TABLE public.referrals IS '추천 리워드 — 상대팀 회장 초대→활성화(첫 완료경기)→기프티콘 지급 추적';
