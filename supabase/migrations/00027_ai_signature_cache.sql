-- AI 생성 시그니처 캐싱 컬럼 추가
-- Phase 0 시그니처 카피 자동 생성 기능
--
-- Why: Claude Haiku로 생성한 시그니처를 DB에 캐싱해 재호출 비용 절감.
-- 선수 스탯 변경 시 재생성 (경기 완료·멤버 수정 후 stale 처리).

ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS ai_signature TEXT,
  ADD COLUMN IF NOT EXISTS ai_signature_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_signature_model TEXT;

COMMENT ON COLUMN team_members.ai_signature IS 'Claude Haiku 등 LLM으로 생성한 한 줄 카피 (선수 카드 표시용)';
COMMENT ON COLUMN team_members.ai_signature_generated_at IS 'AI 시그니처 생성 시각 (신선도 판단용)';
COMMENT ON COLUMN team_members.ai_signature_model IS '사용된 모델 식별자 (예: claude-haiku-4-5-20251001)';
