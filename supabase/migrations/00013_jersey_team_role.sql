-- 등번호 (팀 내 유니크, nullable)
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS jersey_number integer;
CREATE UNIQUE INDEX IF NOT EXISTS team_members_jersey_uq
  ON team_members(team_id, jersey_number) WHERE jersey_number IS NOT NULL;

-- 주장/부주장 (팀당 각 1명)
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS team_role text
  CHECK (team_role IN ('CAPTAIN', 'VICE_CAPTAIN'));
CREATE UNIQUE INDEX IF NOT EXISTS team_members_captain_uq
  ON team_members(team_id) WHERE team_role = 'CAPTAIN';
CREATE UNIQUE INDEX IF NOT EXISTS team_members_vice_captain_uq
  ON team_members(team_id) WHERE team_role = 'VICE_CAPTAIN';
