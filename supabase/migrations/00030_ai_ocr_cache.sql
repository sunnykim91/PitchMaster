-- AI OCR 결과 캐시 테이블
-- Phase B — 같은 이미지 재업로드 시 Vision 호출 생략 (건당 3~5원 절약)
--
-- Why:
--   회비 엑셀 업로드 플로우에서 같은 영수증 스크린샷을 실수로 두 번 올리거나,
--   브라우저 새로고침 후 재업로드하는 경우가 종종 발생.
--   이미지 SHA256 해시로 캐시하면 중복 호출을 완전 차단 가능.
--
-- TTL: 24시간 (같은 이미지가 하루 이상 재활용될 가능성 낮음 — 저장 공간 절약)

CREATE TABLE IF NOT EXISTS ai_ocr_cache (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 이미지 내용 기반 해시 (크기 16자 절단된 SHA256)
  image_hash       TEXT        NOT NULL,
  team_id          UUID        REFERENCES teams(id) ON DELETE CASCADE,

  transactions     JSONB       NOT NULL,   -- ParsedTransaction[]
  warnings         JSONB,                  -- string[] (sanity check 경고)
  model            TEXT,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 조회: (image_hash, team_id) 복합 인덱스 — 팀 경계 유지 + 빠른 해시 조회
CREATE INDEX IF NOT EXISTS ai_ocr_cache_hash_team_idx
  ON ai_ocr_cache (image_hash, team_id);

-- TTL 정리용 — 24시간 지난 row 일괄 삭제
CREATE INDEX IF NOT EXISTS ai_ocr_cache_created_idx
  ON ai_ocr_cache (created_at);

COMMENT ON TABLE ai_ocr_cache IS '이미지 해시 기반 OCR 결과 캐시 (24시간 TTL, Vision 호출 생략용)';
COMMENT ON COLUMN ai_ocr_cache.image_hash IS 'SHA256 상위 16자 — aiOcrParse.ts와 동일 형식';
COMMENT ON COLUMN ai_ocr_cache.transactions IS 'ParsedTransaction[] — 구조는 src/lib/server/aiOcrParse.ts 참조';
