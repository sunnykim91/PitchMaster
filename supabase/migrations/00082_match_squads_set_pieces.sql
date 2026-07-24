-- 쿼터별 세트피스 키커 지정 (프리킥 · 좌/우 코너킥 · 페널티킥)
--
-- match_squads 는 이미 (match_id × quarter_number × side) 단위 행이라
-- 쿼터별 · 자체전(side A/B)별로 자동 분리 저장된다.
--
-- 값 형태(JSONB, nullable):
--   { "fk": playerId, "ck_left": playerId, "ck_right": playerId, "pk": playerId }
--   키 누락/부분 지정 허용. playerId 는 positions 와 동일 체계
--   (users.id / team_members.id / match_guests.id).
ALTER TABLE match_squads
  ADD COLUMN IF NOT EXISTS set_pieces jsonb;

COMMENT ON COLUMN match_squads.set_pieces IS
  '쿼터별 세트피스 키커 { fk, ck_left, ck_right, pk } — 값은 배치와 동일한 playerId(users/team_members/match_guests). nullable.';
