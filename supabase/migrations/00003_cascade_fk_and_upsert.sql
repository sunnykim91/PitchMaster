-- P2-S4: 경기 삭제 시 관련 데이터 원자적 CASCADE 삭제
-- P2-S5: 팀 삭제 시 관련 데이터 원자적 CASCADE 삭제
-- P2-D3: 참석 투표 upsert를 위한 unique constraint 보완

-- ============================================================
-- S4: matches ON DELETE CASCADE (경기 삭제 → 관련 데이터 자동 삭제)
-- ============================================================

-- match_goals
ALTER TABLE match_goals DROP CONSTRAINT IF EXISTS match_goals_match_id_fkey;
ALTER TABLE match_goals ADD CONSTRAINT match_goals_match_id_fkey
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;

-- match_mvp_votes
ALTER TABLE match_mvp_votes DROP CONSTRAINT IF EXISTS match_mvp_votes_match_id_fkey;
ALTER TABLE match_mvp_votes ADD CONSTRAINT match_mvp_votes_match_id_fkey
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;

-- match_attendance
ALTER TABLE match_attendance DROP CONSTRAINT IF EXISTS match_attendance_match_id_fkey;
ALTER TABLE match_attendance ADD CONSTRAINT match_attendance_match_id_fkey
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;

-- match_squad
ALTER TABLE match_squad DROP CONSTRAINT IF EXISTS match_squad_match_id_fkey;
ALTER TABLE match_squad ADD CONSTRAINT match_squad_match_id_fkey
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;

-- match_diary (테이블명 확인 필요 — diary 또는 match_diary)
-- ALTER TABLE match_diary DROP CONSTRAINT IF EXISTS match_diary_match_id_fkey;
-- ALTER TABLE match_diary ADD CONSTRAINT match_diary_match_id_fkey
--   FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;

-- match_guests
ALTER TABLE match_guests DROP CONSTRAINT IF EXISTS match_guests_match_id_fkey;
ALTER TABLE match_guests ADD CONSTRAINT match_guests_match_id_fkey
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;

-- ============================================================
-- S5: teams ON DELETE CASCADE (팀 삭제 → 관련 데이터 자동 삭제)
-- ============================================================

-- matches
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_team_id_fkey;
ALTER TABLE matches ADD CONSTRAINT matches_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- team_members
ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_team_id_fkey;
ALTER TABLE team_members ADD CONSTRAINT team_members_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- seasons
ALTER TABLE seasons DROP CONSTRAINT IF EXISTS seasons_team_id_fkey;
ALTER TABLE seasons ADD CONSTRAINT seasons_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- posts
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_team_id_fkey;
ALTER TABLE posts ADD CONSTRAINT posts_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- rules
ALTER TABLE rules DROP CONSTRAINT IF EXISTS rules_team_id_fkey;
ALTER TABLE rules ADD CONSTRAINT rules_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- dues_records
ALTER TABLE dues_records DROP CONSTRAINT IF EXISTS dues_records_team_id_fkey;
ALTER TABLE dues_records ADD CONSTRAINT dues_records_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- dues_settings
ALTER TABLE dues_settings DROP CONSTRAINT IF EXISTS dues_settings_team_id_fkey;
ALTER TABLE dues_settings ADD CONSTRAINT dues_settings_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- notifications
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_team_id_fkey;
ALTER TABLE notifications ADD CONSTRAINT notifications_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- ============================================================
-- D3: match_attendance upsert용 unique constraint 보완
-- member_id 기반 unique도 필요 (미연동 멤버 대리투표)
-- ============================================================

-- 기존: match_attendance_match_id_user_id_key (match_id, user_id)
-- 추가: match_attendance_match_id_member_id_key (match_id, member_id)
CREATE UNIQUE INDEX IF NOT EXISTS match_attendance_match_id_member_id_key
  ON match_attendance (match_id, member_id)
  WHERE member_id IS NOT NULL;
