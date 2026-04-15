-- AI 경기 후기 캐싱 컬럼 추가
-- Phase 1 경기 후기 자동 생성 기능
--
-- Why: Claude Haiku로 생성한 카톡 공유용 경기 후기를 matches 테이블에 저장.
-- 경기는 완료 후 스탯 변경 거의 없어 TTL 없이 영구 캐시 (수정 시 수동 재생성 가능).

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS ai_summary TEXT,
  ADD COLUMN IF NOT EXISTS ai_summary_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_summary_model TEXT;

COMMENT ON COLUMN matches.ai_summary IS 'Claude Haiku 등 LLM으로 생성한 경기 후기 (카톡 공유용 1~2단락)';
COMMENT ON COLUMN matches.ai_summary_generated_at IS 'AI 후기 생성 시각 (수정 판단용)';
COMMENT ON COLUMN matches.ai_summary_model IS '사용된 모델 식별자';
