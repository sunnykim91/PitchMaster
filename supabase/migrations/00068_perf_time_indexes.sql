-- 자주 시간 필터되는 컬럼 인덱스 추가
--
-- Why: 어드민 활성도 분석·게시판 정렬·향후 cohort 쿼리 등에서
--      gte/lte(시간_컬럼, value) 필터가 빈번. 인덱스 없으면 full scan → Disk IO 부담.
--      Disk IO Budget 압박 상황(2026-05-12)에서 cost-effective 한 마이그레이션.
--
-- 영향: write 약간 느려짐 (인덱스 갱신) vs read 큰 폭 빨라짐. 활성도/리스트 read >> write라 순이익.
--
-- 메모: dues_records.recorded_at 은 00012의 idx_dues_records_team_date 가 이미 커버.
--       match_attendance(match_id, user_id) 등 다른 인덱스도 이미 있음.

-- 어드민 활성도 + 매치 검색에서 voted_at 시간 필터
CREATE INDEX IF NOT EXISTS idx_match_attendance_voted_at
  ON match_attendance(voted_at);

-- 어드민 활성도에서 골 기록 시간 필터
CREATE INDEX IF NOT EXISTS idx_match_goals_created_at
  ON match_goals(created_at);

-- 게시판 최신순 정렬 + 어드민 활성도
CREATE INDEX IF NOT EXISTS idx_posts_created_at
  ON posts(created_at);
