-- AI 레이트리밋 v2: 경기당 1회 + 팀당 월 한도
--
-- 변경 내용:
--   1) ai_usage_log.match_id — 경기당 중복 호출 방지 (tactics, full-plan)
--   2) matches.ai_summary_regenerate_count — 경기 후기 재생성 1회 제한
--
-- 설계 원칙:
--   - 전술 분석 / 라인업: 경기당 1회 + 팀당 월 10회
--   - 경기 후기: 자동생성 1회(generated_at으로 추적) + 재생성 1회(regenerate_count)
--   - OCR: 제한 없음 (이미지 해시 캐시로 중복 방지)

-- ① ai_usage_log에 match_id 추가
ALTER TABLE ai_usage_log
  ADD COLUMN IF NOT EXISTS match_id UUID REFERENCES matches(id) ON DELETE SET NULL;

-- 경기당 중복 체크용 인덱스
CREATE INDEX IF NOT EXISTS ai_usage_log_match_feature_team_idx
  ON ai_usage_log (match_id, feature, team_id)
  WHERE match_id IS NOT NULL AND source = 'ai';

-- 팀 월별 집계용 인덱스
CREATE INDEX IF NOT EXISTS ai_usage_log_team_feature_created_idx
  ON ai_usage_log (team_id, feature, created_at)
  WHERE source = 'ai';

-- ② matches에 재생성 횟수 컬럼 추가
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS ai_summary_regenerate_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN ai_usage_log.match_id IS '경기당 AI 기능 중복 호출 방지. OCR 등 경기 무관 기능은 NULL.';
COMMENT ON COLUMN matches.ai_summary_regenerate_count IS 'AI 경기 후기 재생성 횟수. 최대 1회 허용.';
