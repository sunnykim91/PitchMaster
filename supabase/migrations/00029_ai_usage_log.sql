-- AI 사용량/관측성 로그 테이블
-- Phase A 전체: 4개 AI 기능(signature/match_summary/tactics/ocr)의 호출 추적.
--
-- Why:
--   1. 운영 가시성 — 어떤 기능이 얼마나 호출되는지, fallback율, 평균 latency
--   2. 비용 추적 — 토큰 사용량·cache_read 비율로 실제 요금 추정
--   3. 레이트리밋 기반 — user_id/team_id별 일일 호출 횟수 쿼리
--   4. 프롬프트 튜닝 — error_reason으로 실패 유형 분석

CREATE TABLE IF NOT EXISTS ai_usage_log (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  feature          TEXT        NOT NULL,   -- signature | match_summary | tactics | ocr
  source           TEXT        NOT NULL,   -- ai | rule | error
  model            TEXT,                   -- claude-haiku-4-5 등

  user_id          UUID        REFERENCES users(id) ON DELETE SET NULL,
  team_id          UUID        REFERENCES teams(id) ON DELETE SET NULL,

  input_tokens          INTEGER,
  output_tokens         INTEGER,
  cache_read_tokens     INTEGER,
  cache_creation_tokens INTEGER,

  latency_ms       INTEGER,

  -- 실패/재시도 분석
  error_reason     TEXT,                   -- low_quality | api_error | invalid_json | rate_limited | null
  retry_count      SMALLINT    NOT NULL DEFAULT 0,

  -- 식별자 (어떤 엔티티에 대한 호출인지 디버깅용, 선택)
  entity_id        TEXT,                   -- member_id / match_id / placement_hash / image_hash

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 레이트리밋 체크용 인덱스 (user_id + feature + created_at)
CREATE INDEX IF NOT EXISTS ai_usage_log_user_feature_time_idx
  ON ai_usage_log (user_id, feature, created_at DESC);

-- 팀별 사용량 집계용
CREATE INDEX IF NOT EXISTS ai_usage_log_team_feature_time_idx
  ON ai_usage_log (team_id, feature, created_at DESC);

-- 운영 모니터링 (최근 에러 빠르게 조회)
CREATE INDEX IF NOT EXISTS ai_usage_log_error_time_idx
  ON ai_usage_log (created_at DESC) WHERE error_reason IS NOT NULL;

COMMENT ON TABLE ai_usage_log IS 'AI 호출 관측성 로그 — 비용/성능/실패율 추적 + 레이트리밋 기반';
COMMENT ON COLUMN ai_usage_log.feature IS 'signature | match_summary | tactics | ocr';
COMMENT ON COLUMN ai_usage_log.source IS 'ai (LLM 성공) | rule (fallback) | error (완전 실패)';
COMMENT ON COLUMN ai_usage_log.error_reason IS 'low_quality | api_error | invalid_json | rate_limited | null(정상)';
COMMENT ON COLUMN ai_usage_log.retry_count IS '재시도 횟수 (0=첫 호출 성공, 1=1회 재시도 후 성공)';
