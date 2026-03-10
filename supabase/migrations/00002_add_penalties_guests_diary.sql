-- PitchMaster: Additional schema for penalties, guests, diaries, uniforms
-- Run this AFTER 00001_initial_schema.sql

-- ============================================================
-- 1. teams: Add uniform columns
-- ============================================================
alter table teams
  add column if not exists uniform_primary text,
  add column if not exists uniform_secondary text,
  add column if not exists uniform_pattern text default 'SOLID'
    check (uniform_pattern in ('SOLID','STRIPES_VERTICAL','STRIPES_HORIZONTAL','STRIPES_DIAGONAL'));

-- ============================================================
-- 2. penalty_rules
-- ============================================================
create table if not exists penalty_rules (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references teams(id) on delete cascade,
  name text not null,
  amount int not null,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists idx_penalty_rules_team on penalty_rules(team_id);

-- ============================================================
-- 3. penalty_records
-- ============================================================
create table if not exists penalty_records (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references teams(id) on delete cascade,
  rule_id uuid references penalty_rules(id) on delete set null,
  member_id uuid not null references users(id) on delete cascade,
  amount int not null,
  date date not null,
  is_paid boolean not null default false,
  note text,
  recorded_by uuid references users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_penalty_records_team on penalty_records(team_id);
create index if not exists idx_penalty_records_member on penalty_records(member_id);

-- ============================================================
-- 4. match_guests (mercenaries / guest players)
-- ============================================================
create table if not exists match_guests (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid not null references matches(id) on delete cascade,
  name text not null,
  position text,
  phone text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_match_guests_match on match_guests(match_id);

-- ============================================================
-- 5. match_diaries
-- ============================================================
create table if not exists match_diaries (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid not null references matches(id) on delete cascade,
  weather text,
  condition text,
  memo text,
  photos text[] default '{}',
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(match_id)
);

create index if not exists idx_match_diaries_match on match_diaries(match_id);

-- ============================================================
-- 6. notification_settings (per-user preferences)
-- ============================================================
create table if not exists notification_settings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  email boolean not null default true,
  push boolean not null default true,
  created_at timestamptz not null default now(),
  unique(user_id)
);
