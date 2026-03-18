-- ============================================================
-- S4: matches ON DELETE CASCADE (경기 삭제 → 관련 데이터 자동 삭제)
-- ============================================================

ALTER TABLE match_goals DROP CONSTRAINT IF EXISTS match_goals_match_id_fkey;
ALTER TABLE match_goals ADD CONSTRAINT match_goals_match_id_fkey
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;

ALTER TABLE match_mvp_votes DROP CONSTRAINT IF EXISTS match_mvp_votes_match_id_fkey;
ALTER TABLE match_mvp_votes ADD CONSTRAINT match_mvp_votes_match_id_fkey
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;

ALTER TABLE match_attendance DROP CONSTRAINT IF EXISTS match_attendance_match_id_fkey;
ALTER TABLE match_attendance ADD CONSTRAINT match_attendance_match_id_fkey
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;

ALTER TABLE match_squads DROP CONSTRAINT IF EXISTS match_squads_match_id_fkey;
ALTER TABLE match_squads ADD CONSTRAINT match_squads_match_id_fkey
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;

ALTER TABLE match_diaries DROP CONSTRAINT IF EXISTS match_diaries_match_id_fkey;
ALTER TABLE match_diaries ADD CONSTRAINT match_diaries_match_id_fkey
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;

ALTER TABLE match_guests DROP CONSTRAINT IF EXISTS match_guests_match_id_fkey;
ALTER TABLE match_guests ADD CONSTRAINT match_guests_match_id_fkey
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;

-- ============================================================
-- S5: teams ON DELETE CASCADE (팀 삭제 → 관련 데이터 자동 삭제)
-- ============================================================

ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_team_id_fkey;
ALTER TABLE matches ADD CONSTRAINT matches_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_team_id_fkey;
ALTER TABLE team_members ADD CONSTRAINT team_members_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

ALTER TABLE seasons DROP CONSTRAINT IF EXISTS seasons_team_id_fkey;
ALTER TABLE seasons ADD CONSTRAINT seasons_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_team_id_fkey;
ALTER TABLE posts ADD CONSTRAINT posts_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

ALTER TABLE rules DROP CONSTRAINT IF EXISTS rules_team_id_fkey;
ALTER TABLE rules ADD CONSTRAINT rules_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

ALTER TABLE dues_records DROP CONSTRAINT IF EXISTS dues_records_team_id_fkey;
ALTER TABLE dues_records ADD CONSTRAINT dues_records_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

ALTER TABLE dues_settings DROP CONSTRAINT IF EXISTS dues_settings_team_id_fkey;
ALTER TABLE dues_settings ADD CONSTRAINT dues_settings_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_team_id_fkey;
ALTER TABLE notifications ADD CONSTRAINT notifications_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- ============================================================
-- D3: match_attendance upsert용 unique partial index
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS match_attendance_match_id_member_id_key
  ON match_attendance (match_id, member_id)
  WHERE member_id IS NOT NULL;
