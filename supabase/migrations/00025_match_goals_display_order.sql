-- 골 기록 카드 수동 순서 조정 기능
-- display_order: 사용자가 드래그로 재정렬했을 때의 순서 (0부터 시작)
-- NULL: 아직 재정렬 안 함 → 정렬 시 NULLS LAST + created_at으로 fallback

ALTER TABLE match_goals
  ADD COLUMN IF NOT EXISTS display_order INT;

-- 경기별 display_order 인덱스 (재정렬 후 정렬 쿼리 가속)
CREATE INDEX IF NOT EXISTS idx_match_goals_display_order
  ON match_goals(match_id, display_order)
  WHERE display_order IS NOT NULL;
