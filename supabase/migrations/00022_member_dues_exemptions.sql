-- 회원 회비 면제/휴회/부상 상태 관리
CREATE TABLE IF NOT EXISTS member_dues_exemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL,
  exemption_type TEXT NOT NULL CHECK (exemption_type IN ('EXEMPT', 'LEAVE', 'INJURED')),
  reason TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  ended_by UUID
);

CREATE INDEX IF NOT EXISTS idx_member_dues_exemptions_team ON member_dues_exemptions(team_id);
CREATE INDEX IF NOT EXISTS idx_member_dues_exemptions_active ON member_dues_exemptions(team_id, is_active) WHERE is_active = true;
