-- 자체전(Internal Match) 기능 추가
-- matches: 경기 유형 + 통계 반영 여부
ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_type TEXT DEFAULT 'REGULAR';
ALTER TABLE matches ADD COLUMN IF NOT EXISTS stats_included BOOLEAN DEFAULT TRUE;

-- match_goals: A팀/B팀 구분
ALTER TABLE match_goals ADD COLUMN IF NOT EXISTS side TEXT DEFAULT NULL;

-- match_squads: A팀/B팀 전술 분리
ALTER TABLE match_squads ADD COLUMN IF NOT EXISTS side TEXT DEFAULT NULL;

-- unique constraint 재구성 (constraint 먼저 삭제 → partial index 2개)
ALTER TABLE match_squads DROP CONSTRAINT IF EXISTS match_squads_match_id_quarter_number_key;
CREATE UNIQUE INDEX IF NOT EXISTS match_squads_regular_uq
  ON match_squads(match_id, quarter_number) WHERE side IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS match_squads_internal_uq
  ON match_squads(match_id, quarter_number, side) WHERE side IS NOT NULL;

-- 새 테이블: 자체전 팀 편성
CREATE TABLE IF NOT EXISTS match_internal_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  side TEXT NOT NULL CHECK (side IN ('A', 'B')),
  player_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, player_id)
);
CREATE INDEX IF NOT EXISTS idx_internal_teams_match ON match_internal_teams(match_id);

-- RLS 활성화
ALTER TABLE match_internal_teams ENABLE ROW LEVEL SECURITY;
