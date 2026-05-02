-- 00053_drop_dues_prepayments.sql
-- 별도 선납 시스템(dues_prepayments) 제거 — member_dues_exemptions(PREPAID 타입)로 통합.
--
-- 안전성:
--   - 본 마이그레이션 수립 시점(2026-05-02) dues_prepayments 테이블 0행 확인
--   - 운영진들은 이미 EXEMPT + reason="1년치 선납" 형태로 운영 중
--   - 00049에서 추가된 인덱스·RLS 정책은 DROP TABLE 시 자동 제거됨

DROP TABLE IF EXISTS public.dues_prepayments;
