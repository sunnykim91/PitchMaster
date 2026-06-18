-- ============================================================
-- 00076: 자체전(INTERNAL) 3팀(A·B·C) 지원
-- ============================================================
-- 배경: 자체전 팀 편성이 A/B 2팀으로만 가능했음. 풋살팀 자체전은
--       18명 6:6:6 같은 3팀(3파전) 운영이 대다수라 C팀까지 허용.
--
-- 1) match_internal_teams.side: CHECK (A,B) → (A,B,C)
--    (match_squads.side / match_goals.side 는 제약 없는 TEXT 라 변경 불필요)
-- 2) matches.internal_team_results: 팀별 가벼운 승/무/패 수기 카운트 저장
--    형태: { "A": {"w":2,"d":0,"l":1}, "B": {...}, "C": {...} }
--    (매치업별 결과는 저장 안 함 — 팀별 합산 카운트만)
-- ============================================================

-- 1) side CHECK 완화 (인라인 CHECK 의 표준 이름)
ALTER TABLE match_internal_teams DROP CONSTRAINT IF EXISTS match_internal_teams_side_check;
ALTER TABLE match_internal_teams ADD CONSTRAINT match_internal_teams_side_check CHECK (side IN ('A', 'B', 'C'));

-- 2) 자체전 팀별 승/무/패 수기 카운트 (matches 는 기존 테이블이라 추가 GRANT 불필요)
ALTER TABLE matches ADD COLUMN IF NOT EXISTS internal_team_results JSONB DEFAULT NULL;
