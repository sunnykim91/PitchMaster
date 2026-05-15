-- ============================================================
-- P3 평면화 후속 — 카테고리별 대표 영상 여러 개 허용
-- ============================================================
-- 기존: (team_id, formation_id) 단위 unique → 한 포메이션당 default 1개
-- 변경: 제약 자체 DROP. is_default는 사용자의 자유 "핀/즐겨찾기" 의미로 확장.
--       카테고리별 N개 가능. 매치 노출은 카테고리별 default ASC + 최신순 정렬.
-- ============================================================

DROP INDEX IF EXISTS team_tactical_animations_default_unique_idx;

COMMENT ON COLUMN team_tactical_animations.is_default IS
  '대표 영상 핀 — 카테고리별 여러 개 가능. 매치 노출·목록 정렬 시 맨 위로.';
