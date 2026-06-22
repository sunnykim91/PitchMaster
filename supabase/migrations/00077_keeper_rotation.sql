-- 풋살 키퍼·교대 순번 (전술 탭 "순번 룰렛")
--
-- 형태: { "keepers": ["playerId", ...], "groups": { "A": ["pid", ...], "B": [...], "TEAM": [...] } }
--   - keepers : 골문 전담(필드 안 뜀) → 순번 풀에서 제외. 선호 포지션이 GK 단독이면 자동 후보.
--   - groups  : 자체전이면 side(A/B/C)별, 일반전이면 "TEAM" 단일. 배열 순서 = 순번(1번부터).
--               1번 = 첫 키퍼(실점 시 다음 번호) + 쉬는 순서 기준. 전담 키퍼 있으면 키퍼 제외 후 필드/휴식 순번.
-- 풋살 전용 · 배정은 STAFF+ · 조회는 전원.
ALTER TABLE matches ADD COLUMN IF NOT EXISTS keeper_rotation jsonb;

COMMENT ON COLUMN matches.keeper_rotation IS '풋살 순번 룰렛: {keepers:[playerId], groups:{side|TEAM:[ordered playerId]}}';
