-- ============================================================
-- 운영공지 시스템 — posts.is_global 컬럼 추가
-- ============================================================
-- 운영공지 (is_global=true): PitchMaster 운영자만 작성, 모든 팀 홈 노출
-- 팀공지 (category='NOTICE', is_global=false): 각 팀 STAFF+ 작성, 해당 팀에만 노출
-- 일반 (category='FREE'): 기존 자유게시판
-- ============================================================

alter table posts
  add column if not exists is_global boolean not null default false;

-- 운영공지 조회 빈도 ↑ (모든 팀 홈 SSR마다) → partial index 로 효율화
create index if not exists idx_posts_is_global
  on posts(created_at desc)
  where is_global = true;

-- 팀공지 정렬용 보조 인덱스 — team_id 안에서 category 필터링
create index if not exists idx_posts_team_category
  on posts(team_id, category, is_pinned desc, created_at desc);
