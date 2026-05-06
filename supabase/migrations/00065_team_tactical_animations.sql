-- 00065_team_tactical_animations.sql
-- 팀별 전술 애니메이션 — 빌드업·수비 시퀀스 영상 데이터 영속 저장.
--
-- 배경 (45차 후속):
--   FormationMotion (lib/formationMotions/4-2-3-1.ts) 는 모든 팀 공유 표준 템플릿.
--   각 팀의 감독·운영진이 자기팀 전술을 자유롭게 편집·저장하고
--   MatchRoleGuide 의 "팀 움직임 보기" 토글이 표준 대신 팀 전용 데이터를 노출하도록.
--
-- 구조:
--   - team_id + formation_id 단위로 여러 개 가능 (예: "우리 빌드업 v1", "v2")
--   - is_default = 한 팀의 한 포메이션당 기본 1개. MatchRoleGuide 폴백 시 사용
--   - animation_data JSONB: FormationMotion 형태 ({ attack: MotionPhase[], defense: MotionPhase[] })
--
-- 권한 (다른 테이블과 동일 패턴 — RLS 미적용, service_role 전용):
--   - API 레이어에서 운영진(STAFF/PRESIDENT) 검증

CREATE TABLE IF NOT EXISTS team_tactical_animations (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         UUID         NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  formation_id    TEXT         NOT NULL,
  name            TEXT         NOT NULL,
  description     TEXT,
  animation_data  JSONB        NOT NULL,
  is_default      BOOLEAN      NOT NULL DEFAULT false,
  created_by      UUID         REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 팀 단위 조회
CREATE INDEX IF NOT EXISTS team_tactical_animations_team_idx
  ON team_tactical_animations(team_id);

-- 팀 + 포메이션 조회 (MatchRoleGuide 폴백 시 default 1건 빠르게)
CREATE INDEX IF NOT EXISTS team_tactical_animations_team_formation_idx
  ON team_tactical_animations(team_id, formation_id);

-- 한 팀의 한 포메이션당 default 1 개만 (PARTIAL UNIQUE)
CREATE UNIQUE INDEX IF NOT EXISTS team_tactical_animations_default_unique_idx
  ON team_tactical_animations(team_id, formation_id)
  WHERE is_default = true;

COMMENT ON TABLE team_tactical_animations IS '팀별 전술 애니메이션 (빌드업·수비 시퀀스 영상 데이터). MatchRoleGuide 폴백: 팀 데이터 있으면 그것, 없으면 표준 템플릿.';
COMMENT ON COLUMN team_tactical_animations.animation_data IS 'FormationMotion: { attack: MotionPhase[], defense: MotionPhase[] }. 각 phase: { label, steps: [{ caption, ball, positions, duration }] }';
COMMENT ON COLUMN team_tactical_animations.is_default IS '한 팀의 한 포메이션당 default 1 개. MatchRoleGuide 폴백 시 사용.';
