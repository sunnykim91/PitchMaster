-- RLS 미활성화 4개 테이블 보안 수정
-- Supabase Security Advisor 경고 해결

ALTER TABLE post_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_join_requests ENABLE ROW LEVEL SECURITY;
