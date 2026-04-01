-- 경기 종료 시간 필드 추가
alter table matches add column if not exists match_end_time time;
