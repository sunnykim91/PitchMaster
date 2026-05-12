-- 00069_player_ratings.sql
-- 운영진 단방향 회원 평점·코멘트 시스템 (잠정 도입)
--
-- 배경:
--   FCO2 팀 요청 (2026-05-12). 운영진(STAFF+)이 경기 단위로 회원에게
--   1.0~10.0 소수점 평점 + 코멘트를 단방향으로 남기는 기능.
--   메모리상 2026-05-06 "경기 평점 도입 안 함" 결정 변경 — 잠정 진행
--   (재논의 트리거 1번 "다수 사용자 요청" 첫 시그널).
--
-- 가역성:
--   teams.player_rating_enabled 기본 false → 모든 기존 팀 영향 0.
--   본인 팀(FCMZ·FK Rebirth·FC DEMO·시즌FC) 토글 OFF 유지.

-- 1) 팀 토글
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS player_rating_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.teams.player_rating_enabled IS
  '운영진 단방향 평점·코멘트 기능 활성화 (잠정 도입, 기본 OFF)';

-- 2) 평점 본문
CREATE TABLE IF NOT EXISTS public.player_ratings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  match_id   UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  ratee_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rater_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  score      NUMERIC(3,1) NOT NULL,
  comment    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT player_ratings_score_range
    CHECK (score >= 1.0 AND score <= 10.0),
  CONSTRAINT player_ratings_score_decimal
    CHECK ((score * 10) = FLOOR(score * 10)),
  CONSTRAINT player_ratings_comment_len
    CHECK (comment IS NULL OR char_length(comment) <= 500),
  CONSTRAINT player_ratings_unique
    UNIQUE (match_id, ratee_id, rater_id)
);

CREATE INDEX IF NOT EXISTS idx_player_ratings_match
  ON public.player_ratings (match_id);
CREATE INDEX IF NOT EXISTS idx_player_ratings_team_ratee
  ON public.player_ratings (team_id, ratee_id);
CREATE INDEX IF NOT EXISTS idx_player_ratings_season
  ON public.player_ratings (team_id, ratee_id, created_at DESC);

-- 3) updated_at 자동 갱신
CREATE OR REPLACE FUNCTION public.trg_player_ratings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS player_ratings_updated_at ON public.player_ratings;
CREATE TRIGGER player_ratings_updated_at
  BEFORE UPDATE ON public.player_ratings
  FOR EACH ROW EXECUTE FUNCTION public.trg_player_ratings_updated_at();

-- 4) RLS: 정책 미정의 → service_role 통한 API 라우트만 접근 (alpha_testers 패턴)
ALTER TABLE public.player_ratings ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.player_ratings IS
  '운영진 단방향 회원 평점·코멘트 (1 운영진 = 1 회원 = 1 경기당 1 row)';
