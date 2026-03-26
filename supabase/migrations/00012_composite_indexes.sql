-- 성능 최적화: 복합 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_team_members_team_user ON team_members(team_id, user_id);
CREATE INDEX IF NOT EXISTS idx_matches_team_date_status ON matches(team_id, match_date DESC, status);
CREATE INDEX IF NOT EXISTS idx_match_attendance_match_user ON match_attendance(match_id, user_id);
CREATE INDEX IF NOT EXISTS idx_match_mvp_votes_match_voter ON match_mvp_votes(match_id, voter_id);
CREATE INDEX IF NOT EXISTS idx_dues_records_team_date ON dues_records(team_id, recorded_at DESC);
