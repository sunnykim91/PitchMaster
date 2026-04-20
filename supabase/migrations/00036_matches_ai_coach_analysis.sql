-- ============================================================
-- 00036: matches 에 AI 코치 분석 영속화 컬럼 추가
-- ============================================================
--
-- 문제:
--   AI 코치 분석(/api/ai/tactics) 결과가 DB 에 저장되지 않아
--   한 번 생성 후 재조회 불가. 경기당 1회 rate limit 이라 재생성도 차단
--   → "분석을 봤었는데 다시 못 봄" UX 깨짐.
--
-- 해결:
--   경기 후기(ai_summary) 와 동일한 패턴으로 matches 테이블에 컬럼 추가.
--   스트리밍 완료 시점에 전체 텍스트를 UPDATE 로 저장.
-- ============================================================

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS ai_coach_analysis TEXT,
  ADD COLUMN IF NOT EXISTS ai_coach_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_coach_model TEXT,
  ADD COLUMN IF NOT EXISTS ai_coach_regenerate_count INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN matches.ai_coach_analysis IS
  'AI 코치 분석 텍스트 전문 (3단락 코치식). /api/ai/tactics 스트리밍 완료 후 저장.';
COMMENT ON COLUMN matches.ai_coach_generated_at IS
  'AI 코치 분석 최초 생성 또는 재생성 시점.';
COMMENT ON COLUMN matches.ai_coach_model IS
  '분석 생성에 사용된 모델 이름 (예: claude-haiku-4-5) 또는 "rule" (fallback).';
COMMENT ON COLUMN matches.ai_coach_regenerate_count IS
  'AI 코치 분석 재생성 횟수. 경기 후기와 동일하게 1회 제한 용도.';

-- 검증 (실행 후 수동)
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'matches' AND column_name LIKE 'ai_coach%';
