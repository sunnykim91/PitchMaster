-- ============================================================
-- 팀 검색 + 가입 신청 기능
-- ============================================================

-- 1. teams: is_searchable 컬럼 추가 (sport_type은 이미 존재)
alter table teams
  add column if not exists is_searchable boolean not null default false;

-- 2. team_join_requests 테이블 생성
create table if not exists team_join_requests (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  phone text,
  position text,
  message text,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  reviewed_by uuid references users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 동일 팀에 PENDING 신청이 하나만 존재하도록 partial unique index
create unique index if not exists team_join_requests_pending_unique
  on team_join_requests (team_id, user_id)
  where (status = 'PENDING');

create index if not exists idx_team_join_requests_team on team_join_requests(team_id);
create index if not exists idx_team_join_requests_user on team_join_requests(user_id);
create index if not exists idx_team_join_requests_status on team_join_requests(status);
