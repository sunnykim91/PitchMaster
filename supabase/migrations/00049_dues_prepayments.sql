-- 00049_dues_prepayments.sql
-- 회비 선납 (3·6·12개월) 지원.
--
-- 정책:
--   - 회원이 회비를 미리 N개월치 납부 → 그 기간 동안 매월 자동 "납부 완료" 처리
--   - 면제 기간(휴면·부상)이 겹치면 면제 우선, 선납 기간 자동 연장 (현재는 단순 정책: 단순 차감 X)
--   - 환불·취소 시 status='cancelled' (실제 데이터 삭제 X, 감사 추적용)
--
-- 사용:
--   - 선납 등록 시: dues_prepayments 신규 + dues_records (INCOME) 신규
--   - 월별 납부 상태 조회 시: dues_records IN (월 매칭) UNION 활성 dues_prepayments 기간 포함

CREATE TABLE IF NOT EXISTS public.dues_prepayments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES public.users(id) ON DELETE SET NULL,
  member_id       UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  member_name     TEXT, -- snapshot (회원 삭제 시 이름 보존)

  amount          INT NOT NULL CHECK (amount > 0),
  period_months   INT NOT NULL CHECK (period_months IN (3, 6, 12)),

  start_month     DATE NOT NULL, -- e.g., 2026-05-01
  end_month       DATE NOT NULL, -- e.g., 2026-10-31

  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'cancelled')),
  cancelled_at    TIMESTAMPTZ,
  cancelled_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,

  -- 자동 생성된 dues_records (INCOME) 링크 — 환불 시 같이 무효화
  linked_dues_record_id UUID REFERENCES public.dues_records(id) ON DELETE SET NULL,

  notes           TEXT,
  recorded_by     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 팀별 활성 선납 조회 효율
CREATE INDEX IF NOT EXISTS dues_prepayments_team_status_idx
  ON public.dues_prepayments (team_id, status);

-- 회원별 선납 기간 조회 (월별 납부 상태 계산용)
CREATE INDEX IF NOT EXISTS dues_prepayments_member_period_idx
  ON public.dues_prepayments (member_id, start_month, end_month)
  WHERE status = 'active';

-- RLS — 팀원만 조회, STAFF+ 만 등록·취소
ALTER TABLE public.dues_prepayments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dues_prepayments_select ON public.dues_prepayments;
CREATE POLICY dues_prepayments_select ON public.dues_prepayments
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM public.team_members
       WHERE user_id = auth.uid() AND status IN ('ACTIVE', 'DORMANT')
    )
  );

DROP POLICY IF EXISTS dues_prepayments_insert ON public.dues_prepayments;
CREATE POLICY dues_prepayments_insert ON public.dues_prepayments
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT team_id FROM public.team_members
       WHERE user_id = auth.uid()
         AND status IN ('ACTIVE', 'DORMANT')
         AND role IN ('PRESIDENT', 'STAFF')
    )
  );

DROP POLICY IF EXISTS dues_prepayments_update ON public.dues_prepayments;
CREATE POLICY dues_prepayments_update ON public.dues_prepayments
  FOR UPDATE USING (
    team_id IN (
      SELECT team_id FROM public.team_members
       WHERE user_id = auth.uid()
         AND status IN ('ACTIVE', 'DORMANT')
         AND role IN ('PRESIDENT', 'STAFF')
    )
  );

COMMENT ON TABLE public.dues_prepayments IS '회비 선납 (3·6·12개월). status=active 인 기간엔 자동 납부 완료 처리.';
COMMENT ON COLUMN public.dues_prepayments.period_months IS '3 | 6 | 12 (개월)';
COMMENT ON COLUMN public.dues_prepayments.linked_dues_record_id IS '선납 등록 시 자동 생성된 dues_records (INCOME) 링크. 취소 시 함께 무효화.';
