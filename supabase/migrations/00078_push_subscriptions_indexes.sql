-- 00078: push_subscriptions 인덱스 추가 (성능)
--
-- 배경: 모든 웹푸시 발송이 push_subscriptions 를 `.in("user_id", [...])` 로 조회하고
--       (src/lib/server/sendPush.ts), 만료 구독 정리는 `.eq("endpoint")` 로 삭제한다.
--       그런데 두 컬럼 모두 인덱스가 없어(00001 은 테이블·RLS 만 생성) 매 발송마다
--       seq scan 이 발생 — 구독자 수가 늘수록 푸시 발송이 선형으로 느려진다.
--
-- 효과: user_id IN / endpoint 단건 조회를 인덱스 스캔으로 전환. 가산적(데이터·동작 불변).
-- 안전: CREATE INDEX IF NOT EXISTS — 재실행/이미 존재해도 무해.

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
  ON public.push_subscriptions (user_id);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint
  ON public.push_subscriptions (endpoint);
