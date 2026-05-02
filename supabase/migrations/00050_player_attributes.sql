-- ============================================================
-- 00050_player_attributes.sql
-- 선수 능력치 평가 시스템 — Phase 1 (백엔드)
-- ============================================================
-- 22개 능력치 × 5단계 자연 한국어 라벨 (110개)
-- users 레벨 글로벌 보관 (팀 이동·재가입 무관)
-- 가중치: 영향력(authority) × 신선도(recency) × 정식성(formality)
-- ============================================================

-- ============================================================
-- 1. player_attribute_codes — 능력치 마스터 (22개)
-- ============================================================
create table if not exists player_attribute_codes (
  code text primary key,
  name_ko text not null,
  category text not null check (category in (
    'PACE','SHOOTING','PASSING','DRIBBLING',
    'DEFENDING','PHYSICAL','HEADING','GOALKEEPING'
  )),
  display_order int not null,
  gk_only boolean not null default false,
  description text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 2. player_attribute_labels — 라벨 마스터 (110개)
-- ============================================================
create table if not exists player_attribute_labels (
  attribute_code text not null references player_attribute_codes(code) on delete cascade,
  level int not null check (level between 1 and 5),
  label_ko text not null,
  primary key (attribute_code, level)
);

-- ============================================================
-- 3. player_evaluations — raw 평가 데이터
-- ============================================================
create table if not exists player_evaluations (
  id uuid primary key default uuid_generate_v4(),
  target_user_id uuid not null references users(id) on delete cascade,
  evaluator_user_id uuid not null references users(id) on delete cascade,
  team_id uuid references teams(id) on delete set null,
  attribute_code text not null references player_attribute_codes(code),
  score int not null check (score between 1 and 5),
  source text not null check (source in ('SELF','STAFF','PEER')),
  context text not null default 'FREE' check (context in ('ROUND','FREE','POST_MATCH')),
  match_id uuid references matches(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (target_user_id, evaluator_user_id, attribute_code)
);

create index if not exists idx_player_evaluations_target
  on player_evaluations(target_user_id, attribute_code);
create index if not exists idx_player_evaluations_team
  on player_evaluations(team_id, created_at desc);

-- ============================================================
-- 4. player_attribute_scores — 집계 캐시 (24h TTL)
-- ============================================================
create table if not exists player_attribute_scores (
  user_id uuid not null references users(id) on delete cascade,
  attribute_code text not null references player_attribute_codes(code),
  weighted_avg numeric(3,2) not null,
  sample_count int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, attribute_code)
);

create index if not exists idx_player_attribute_scores_user
  on player_attribute_scores(user_id);

-- ============================================================
-- 5. RLS 정책
-- ============================================================
alter table player_attribute_codes enable row level security;
alter table player_attribute_labels enable row level security;
alter table player_evaluations enable row level security;
alter table player_attribute_scores enable row level security;

-- 마스터 데이터: 누구나 SELECT (능력치 정의·라벨)
drop policy if exists "codes_select_all" on player_attribute_codes;
create policy "codes_select_all" on player_attribute_codes
  for select using (true);

drop policy if exists "labels_select_all" on player_attribute_labels;
create policy "labels_select_all" on player_attribute_labels
  for select using (true);

-- 평가 raw: 인증 사용자라면 SELECT (글로벌 공개)
drop policy if exists "evaluations_select_authenticated" on player_evaluations;
create policy "evaluations_select_authenticated" on player_evaluations
  for select using (auth.uid() is not null);

-- 평가 INSERT/UPDATE: evaluator_user_id가 본인 또는 서버 (서비스 키로만 가능)
-- 서비스 키 우회 INSERT는 API에서 처리. RLS는 본인 평가만 허용.
drop policy if exists "evaluations_insert_self" on player_evaluations;
create policy "evaluations_insert_self" on player_evaluations
  for insert with check (
    evaluator_user_id in (select id from users where kakao_id = auth.jwt() ->> 'sub')
  );

drop policy if exists "evaluations_update_self" on player_evaluations;
create policy "evaluations_update_self" on player_evaluations
  for update using (
    evaluator_user_id in (select id from users where kakao_id = auth.jwt() ->> 'sub')
  );

drop policy if exists "evaluations_delete_self" on player_evaluations;
create policy "evaluations_delete_self" on player_evaluations
  for delete using (
    evaluator_user_id in (select id from users where kakao_id = auth.jwt() ->> 'sub')
  );

-- 집계 캐시: 인증 사용자 SELECT (글로벌 공개), 쓰기는 서비스 키만
drop policy if exists "scores_select_authenticated" on player_attribute_scores;
create policy "scores_select_authenticated" on player_attribute_scores
  for select using (auth.uid() is not null);

-- ============================================================
-- 6. 능력치 마스터 시드 (22개)
-- ============================================================
insert into player_attribute_codes (code, name_ko, category, display_order, gk_only) values
  ('SPEED',         '스피드',     'PACE',         10,  false),
  ('FINISHING',     '결정력',     'SHOOTING',     20,  false),
  ('SHOT_POWER',    '슛팅력',     'SHOOTING',     21,  false),
  ('SHORT_PASS',    '숏패스',     'PASSING',      30,  false),
  ('LONG_PASS',     '롱패스',     'PASSING',      31,  false),
  ('CROSS',         '크로스',     'PASSING',      32,  false),
  ('FREE_KICK',     '프리킥',     'PASSING',      33,  false),
  ('VISION',        '시야',       'PASSING',      34,  false),
  ('DRIBBLING',     '드리블',     'DRIBBLING',    40,  false),
  ('TRAPPING',      '트래핑',     'DRIBBLING',    41,  false),
  ('BREAK_PRESS',   '탈압박',     'DRIBBLING',    42,  false),
  ('TACKLING',      '태클',       'DEFENDING',    50,  false),
  ('POSITIONING',   '위치선정',   'DEFENDING',    51,  false),
  ('CLEARING',      '클리어',     'DEFENDING',    52,  false),
  ('INTERCEPT',     '인터셉트',   'DEFENDING',    53,  false),
  ('STAMINA',       '체력',       'PHYSICAL',     60,  false),
  ('STRENGTH',      '피지컬',     'PHYSICAL',     61,  false),
  ('HEADING',       '헤딩',       'HEADING',      70,  false),
  ('GK_REFLEX',     '반사신경',   'GOALKEEPING',  80,  true),
  ('GK_LONG_KICK',  '롱킥',       'GOALKEEPING',  81,  true),
  ('GK_FOOT',       '발기술',     'GOALKEEPING',  82,  true),
  ('GK_HANDLING',   '핸들링',     'GOALKEEPING',  83,  true)
on conflict (code) do nothing;

-- ============================================================
-- 7. 라벨 마스터 시드 (110개 = 22 × 5)
-- ============================================================
insert into player_attribute_labels (attribute_code, level, label_ko) values
  -- 속도
  ('SPEED', 1, '스피드는 좀 느린 편이에요'),
  ('SPEED', 2, '스피드 평범해요'),
  ('SPEED', 3, '스피드 괜찮아요'),
  ('SPEED', 4, '스피드 빠른 편이에요'),
  ('SPEED', 5, '스피드는 정말 빨라요'),
  -- 결정력
  ('FINISHING', 1, '찬스가 와도 골이 안 나와요'),
  ('FINISHING', 2, '기회는 보는데 결정짓진 못해요'),
  ('FINISHING', 3, '결정적 순간 침착해요'),
  ('FINISHING', 4, '결정적 순간 강해요'),
  ('FINISHING', 5, '찬스만 오면 거의 골이에요'),
  -- 슛팅력
  ('SHOT_POWER', 1, '슛이 약한 편이에요'),
  ('SHOT_POWER', 2, '슛은 가는데 위협적이지 않아요'),
  ('SHOT_POWER', 3, '슛 무난해요'),
  ('SHOT_POWER', 4, '슛이 강한 편이에요'),
  ('SHOT_POWER', 5, '슛이 정말 강해요'),
  -- 숏패스
  ('SHORT_PASS', 1, '짧은 패스도 자주 끊겨요'),
  ('SHORT_PASS', 2, '짧은 패스는 되는데 정확도가 약해요'),
  ('SHORT_PASS', 3, '짧은 패스 안정적이에요'),
  ('SHORT_PASS', 4, '짧은 패스 정확도 좋아요'),
  ('SHORT_PASS', 5, '짧은 패스는 거의 실수 없어요'),
  -- 롱패스
  ('LONG_PASS', 1, '롱패스 하는 걸 본 적이 없어요'),
  ('LONG_PASS', 2, '롱패스는 되는데 정확도가 약해요'),
  ('LONG_PASS', 3, '롱패스 안정적이에요'),
  ('LONG_PASS', 4, '롱패스 정확도 좋아요'),
  ('LONG_PASS', 5, '항상 롱패스 잘 차요'),
  -- 크로스
  ('CROSS', 1, '크로스 시도를 거의 안 해요'),
  ('CROSS', 2, '크로스 시도는 하는데 부정확해요'),
  ('CROSS', 3, '크로스 무난해요'),
  ('CROSS', 4, '크로스 정확도가 좋아요'),
  ('CROSS', 5, '크로스 마스터예요'),
  -- 프리킥
  ('FREE_KICK', 1, '프리킥은 잘 안 차요'),
  ('FREE_KICK', 2, '프리킥 시도는 하는데 위협적이진 않아요'),
  ('FREE_KICK', 3, '프리킥 무난해요'),
  ('FREE_KICK', 4, '프리킥 위협적이에요'),
  ('FREE_KICK', 5, '프리킥은 거의 무조건 위협이에요'),
  -- 시야
  ('VISION', 1, '시야가 좁은 편이에요'),
  ('VISION', 2, '주변은 보는데 결정적 패스가 부족해요'),
  ('VISION', 3, '시야 안정적이에요'),
  ('VISION', 4, '결정적 순간 좋은 패스 자주 보여줘요'),
  ('VISION', 5, '시야가 진짜 넓어요'),
  -- 드리블
  ('DRIBBLING', 1, '드리블이 자주 끊겨요'),
  ('DRIBBLING', 2, '드리블 가끔 보여요'),
  ('DRIBBLING', 3, '드리블 무난해요'),
  ('DRIBBLING', 4, '드리블 좋은 편이에요'),
  ('DRIBBLING', 5, '드리블이 진짜 좋아요'),
  -- 트래핑
  ('TRAPPING', 1, '볼 받는 게 자주 튕겨요'),
  ('TRAPPING', 2, '트래핑 가끔 흔들려요'),
  ('TRAPPING', 3, '트래핑 안정적이에요'),
  ('TRAPPING', 4, '트래핑 깔끔해요'),
  ('TRAPPING', 5, '트래핑은 진짜 잘해요'),
  -- 탈압박
  ('BREAK_PRESS', 1, '압박 받으면 잘 잃어요'),
  ('BREAK_PRESS', 2, '탈압박 가끔 보여요'),
  ('BREAK_PRESS', 3, '탈압박 무난해요'),
  ('BREAK_PRESS', 4, '탈압박 깔끔해요'),
  ('BREAK_PRESS', 5, '압박 와도 안 흔들려요'),
  -- 태클
  ('TACKLING', 1, '태클 시도가 거의 없어요'),
  ('TACKLING', 2, '태클 가끔 시도해요'),
  ('TACKLING', 3, '태클 무난해요'),
  ('TACKLING', 4, '태클 정확하고 깔끔해요'),
  ('TACKLING', 5, '태클은 거의 실수 없이 해요'),
  -- 위치선정
  ('POSITIONING', 1, '위치 잡는 게 어색해요'),
  ('POSITIONING', 2, '위치선정 가끔 흔들려요'),
  ('POSITIONING', 3, '위치선정 무난해요'),
  ('POSITIONING', 4, '위치선정 좋은 편이에요'),
  ('POSITIONING', 5, '위치선정이 진짜 좋아요'),
  -- 클리어
  ('CLEARING', 1, '클리어가 어색해요'),
  ('CLEARING', 2, '클리어 가끔 부정확해요'),
  ('CLEARING', 3, '클리어 무난해요'),
  ('CLEARING', 4, '클리어 깔끔하고 정확해요'),
  ('CLEARING', 5, '클리어는 거의 실수 없어요'),
  -- 인터셉트
  ('INTERCEPT', 1, '볼 빼앗는 게 잘 안 보여요'),
  ('INTERCEPT', 2, '인터셉트 가끔 보여요'),
  ('INTERCEPT', 3, '인터셉트 무난해요'),
  ('INTERCEPT', 4, '인터셉트 자주 해줘요'),
  ('INTERCEPT', 5, '볼 빼앗기는 진짜 잘해요'),
  -- 체력
  ('STAMINA', 1, '1쿼터부터 힘들어해요'),
  ('STAMINA', 2, '후반에 떨어져요'),
  ('STAMINA', 3, '풀타임 무난해요'),
  ('STAMINA', 4, '후반에도 강해요'),
  ('STAMINA', 5, '무적 체력이에요'),
  -- 피지컬
  ('STRENGTH', 1, '몸싸움에 약한 편이에요'),
  ('STRENGTH', 2, '피지컬 평범해요'),
  ('STRENGTH', 3, '피지컬 안정적이에요'),
  ('STRENGTH', 4, '피지컬 좋은 편이에요'),
  ('STRENGTH', 5, '몸이 진짜 딴딴해요'),
  -- 헤딩
  ('HEADING', 1, '헤딩 잘 안 해요'),
  ('HEADING', 2, '헤딩 가끔 시도해요'),
  ('HEADING', 3, '헤딩 무난해요'),
  ('HEADING', 4, '헤딩 정확해요'),
  ('HEADING', 5, '헤딩은 진짜 잘해요'),
  -- GK 반사신경
  ('GK_REFLEX', 1, '반사신경이 살짝 느려요'),
  ('GK_REFLEX', 2, '반사신경 가끔 좋아요'),
  ('GK_REFLEX', 3, '반사신경 무난해요'),
  ('GK_REFLEX', 4, '반사신경 빠른 편이에요'),
  ('GK_REFLEX', 5, '반사신경 정말 빨라요'),
  -- GK 롱킥
  ('GK_LONG_KICK', 1, '롱킥이 짧은 편이에요'),
  ('GK_LONG_KICK', 2, '롱킥 거리는 되는데 정확도가 약해요'),
  ('GK_LONG_KICK', 3, '롱킥 안정적이에요'),
  ('GK_LONG_KICK', 4, '롱킥 정확하고 멀리 차요'),
  ('GK_LONG_KICK', 5, '롱킥은 진짜 위협적이에요'),
  -- GK 발기술
  ('GK_FOOT', 1, '발기술이 어색해요'),
  ('GK_FOOT', 2, '발기술 가끔 흔들려요'),
  ('GK_FOOT', 3, '발기술 무난해요'),
  ('GK_FOOT', 4, '발기술 좋은 편이에요'),
  ('GK_FOOT', 5, '발기술은 필드 선수급이에요'),
  -- GK 핸들링
  ('GK_HANDLING', 1, '핸들링이 자주 흔들려요'),
  ('GK_HANDLING', 2, '핸들링 가끔 흔들려요'),
  ('GK_HANDLING', 3, '핸들링 안정적이에요'),
  ('GK_HANDLING', 4, '핸들링 깔끔해요'),
  ('GK_HANDLING', 5, '핸들링이 진짜 안정적이에요')
on conflict (attribute_code, level) do nothing;
