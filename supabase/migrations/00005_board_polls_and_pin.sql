-- ============================================================
-- 게시판 개선: 카테고리 제거 + 고정(pin) + 투표(poll) 기능
-- ============================================================

-- 1. posts 테이블: category 제약조건 제거, is_pinned 추가
alter table posts drop constraint if exists posts_category_check;
alter table posts alter column category set default 'FREE';
alter table posts add column if not exists is_pinned boolean not null default false;
alter table posts add column if not exists pinned_at timestamptz;

-- 2. 투표(poll) 테이블
create table if not exists post_polls (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references posts(id) on delete cascade,
  question text not null,
  allow_multiple boolean not null default false,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  unique(post_id)
);

create table if not exists post_poll_options (
  id uuid primary key default uuid_generate_v4(),
  poll_id uuid not null references post_polls(id) on delete cascade,
  label text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists post_poll_votes (
  id uuid primary key default uuid_generate_v4(),
  poll_id uuid not null references post_polls(id) on delete cascade,
  option_id uuid not null references post_poll_options(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(poll_id, user_id)
);
