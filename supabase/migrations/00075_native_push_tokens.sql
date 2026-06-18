-- ============================================================
-- 00075: native_push_tokens (네이티브 FCM 푸시 토큰)
-- ============================================================
--
-- 배경:
--   TWA(Play 앱) 웹푸시는 백엔드 브라우저(크롬/삼성인터넷)에 종속.
--   삼성 인터넷이 TWA를 잡으면 웹푸시 구독이 몇 분 만에 죽고 알림도
--   표시 안 됨 (2026-06-18 확정). 해결: 안드로이드 앱에 네이티브 FCM 을
--   직접 붙여 브라우저를 거치지 않고 알림을 띄운다.
--
--   이 테이블은 네이티브 FCM 토큰(기기 주소)을 사용자별로 저장한다.
--   기존 web push 의 push_subscriptions 와는 별개 (발송 경로 분리):
--     - 앱(네이티브 FCM)  → native_push_tokens
--     - 데스크톱/PWA(웹푸시) → push_subscriptions
--
-- 컨벤션:
--   카카오 OAuth + 자체 세션쿠키. 실접근은 전부 SERVICE_ROLE 로 RLS 우회.
--   아래 RLS 정책은 "anon 키로 찔려도 못 읽게" 의 방어층 (00039 패턴).
-- ============================================================

create table if not exists native_push_tokens (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  token text not null unique,
  platform text not null default 'android',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 발송 시 사용자별 토큰 조회용
create index if not exists idx_native_push_tokens_user_id on native_push_tokens(user_id);

alter table native_push_tokens enable row level security;

-- 방어층 RLS (실접근은 SERVICE_ROLE). auth.uid() 는 (SELECT ...) 로 InitPlan 승격.
create policy "native_push_tokens_select_own"
  on native_push_tokens
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "native_push_tokens_modify_own"
  on native_push_tokens
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
