-- PitchMaster: Full database schema
-- Run this in Supabase SQL Editor or via supabase db push

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. teams
-- ============================================================
create table if not exists teams (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  logo_url text,
  invite_code text not null unique,
  invite_expires_at timestamptz,
  join_mode text not null default 'AUTO' check (join_mode in ('AUTO','MANUAL')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- 2. users
-- ============================================================
create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  kakao_id text unique,
  name text not null,
  birth_date date,
  phone text,
  preferred_positions text[] default '{}',
  preferred_foot text check (preferred_foot in ('RIGHT','LEFT','BOTH')),
  profile_image_url text,
  is_profile_complete boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 3. team_members
-- ============================================================
create table if not exists team_members (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null default 'MEMBER' check (role in ('PRESIDENT','STAFF','MEMBER')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','PENDING','BANNED')),
  joined_at timestamptz not null default now(),
  unique(team_id, user_id)
);

-- ============================================================
-- 4. seasons
-- ============================================================
create table if not exists seasons (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references teams(id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 5. matches
-- ============================================================
create table if not exists matches (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references teams(id) on delete cascade,
  season_id uuid references seasons(id) on delete set null,
  opponent_name text,
  match_date date not null,
  match_time time,
  location text,
  quarter_count int not null default 4,
  quarter_duration int not null default 25,
  break_duration int not null default 5,
  status text not null default 'SCHEDULED' check (status in ('SCHEDULED','IN_PROGRESS','COMPLETED')),
  vote_deadline timestamptz,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

-- ============================================================
-- 6. match_attendance
-- ============================================================
create table if not exists match_attendance (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid not null references matches(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  vote text not null check (vote in ('ATTEND','ABSENT','MAYBE')),
  actually_attended boolean,
  voted_at timestamptz not null default now(),
  unique(match_id, user_id)
);

-- ============================================================
-- 7. match_squads
-- ============================================================
create table if not exists match_squads (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid not null references matches(id) on delete cascade,
  quarter_number int not null,
  formation text,
  positions jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique(match_id, quarter_number)
);

-- ============================================================
-- 8. match_goals
-- ============================================================
create table if not exists match_goals (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid not null references matches(id) on delete cascade,
  quarter_number int not null,
  minute int,
  scorer_id text, -- uuid or special value like 'OPPONENT','MERCENARY','UNKNOWN'
  assist_id text, -- uuid or special value, nullable
  is_own_goal boolean not null default false,
  recorded_by uuid references users(id),
  created_at timestamptz not null default now()
);

-- ============================================================
-- 9. match_mvp_votes
-- ============================================================
create table if not exists match_mvp_votes (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid not null references matches(id) on delete cascade,
  voter_id uuid not null references users(id) on delete cascade,
  candidate_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(match_id, voter_id)
);

-- ============================================================
-- 10. dues_settings
-- ============================================================
create table if not exists dues_settings (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references teams(id) on delete cascade,
  member_type text not null,
  monthly_amount int not null,
  description text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 11. dues_records
-- ============================================================
create table if not exists dues_records (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  type text not null check (type in ('INCOME','EXPENSE')),
  amount int not null,
  description text,
  screenshot_url text,
  recorded_by uuid references users(id),
  recorded_at timestamptz not null default now()
);

-- ============================================================
-- 12. rules
-- ============================================================
create table if not exists rules (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references teams(id) on delete cascade,
  title text not null,
  content text not null,
  category text not null default '일반',
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 13. posts
-- ============================================================
create table if not exists posts (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references teams(id) on delete cascade,
  author_id uuid not null references users(id) on delete cascade,
  title text not null,
  content text not null,
  category text not null default 'FREE' check (category in ('FREE','GALLERY')),
  image_urls text[] default '{}',
  created_at timestamptz not null default now()
);

-- ============================================================
-- 14. post_comments
-- ============================================================
create table if not exists post_comments (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references posts(id) on delete cascade,
  author_id uuid not null references users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 15. post_likes
-- ============================================================
create table if not exists post_likes (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(post_id, user_id)
);

-- ============================================================
-- 16. notifications
-- ============================================================
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  team_id uuid references teams(id) on delete cascade,
  type text not null,
  title text not null,
  message text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 17. push_subscriptions (for web push)
-- ============================================================
create table if not exists push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  endpoint text not null,
  keys jsonb not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Indexes
-- ============================================================
create index if not exists idx_team_members_team on team_members(team_id);
create index if not exists idx_team_members_user on team_members(user_id);
create index if not exists idx_matches_team on matches(team_id);
create index if not exists idx_matches_season on matches(season_id);
create index if not exists idx_match_attendance_match on match_attendance(match_id);
create index if not exists idx_match_goals_match on match_goals(match_id);
create index if not exists idx_match_mvp_votes_match on match_mvp_votes(match_id);
create index if not exists idx_dues_records_team on dues_records(team_id);
create index if not exists idx_rules_team on rules(team_id);
create index if not exists idx_posts_team on posts(team_id);
create index if not exists idx_post_comments_post on post_comments(post_id);
create index if not exists idx_notifications_user on notifications(user_id);
create index if not exists idx_seasons_team on seasons(team_id);
create index if not exists idx_teams_invite_code on teams(invite_code);

-- ============================================================
-- Storage bucket for uploads (screenshots, photos, logos)
-- Run in Supabase dashboard or via API:
-- insert into storage.buckets (id, name, public) values ('uploads', 'uploads', true);
-- ============================================================
