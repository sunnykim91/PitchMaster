-- 경기별 댓글
CREATE TABLE IF NOT EXISTS match_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_match_comments_match ON match_comments(match_id);
ALTER TABLE match_comments ENABLE ROW LEVEL SECURITY;
