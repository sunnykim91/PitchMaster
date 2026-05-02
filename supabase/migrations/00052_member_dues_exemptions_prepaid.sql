-- 00052_member_dues_exemptions_prepaid.sql
-- 면제(EXEMPT)와 별개로 선납(PREPAID) 타입을 정식 지원.
--
-- 배경:
--   - 운영팀들이 이미 EXEMPT + reason="1년치 선납" 식으로 우회 운영 중
--   - DuesSettingsTab UI는 PREPAID 옵션을 노출하나 DB CHECK 제약이 거부 → 시한폭탄
--   - 별도 dues_prepayments 테이블 시스템은 제거(00053), 면제 시스템에 통합
--
-- 변경:
--   1) CHECK 제약에 'PREPAID' 추가
--   2) 선납 메타 컬럼 3개 추가 (PREPAID 외 타입은 NULL 유지)
--      - monthly_amount      : 등록 시점 월 회비 스냅샷
--      - period_months       : 선납 기간(3·6·12 등)
--      - actual_paid_amount  : 실제 받은 금액(우대/할인 반영 후)
--   * 우대 금액(차액)은 monthly_amount × period_months − actual_paid_amount 로 계산되며 별도 컬럼은 두지 않음

-- 1) CHECK 제약 갱신
ALTER TABLE public.member_dues_exemptions
  DROP CONSTRAINT IF EXISTS member_dues_exemptions_exemption_type_check;

ALTER TABLE public.member_dues_exemptions
  ADD CONSTRAINT member_dues_exemptions_exemption_type_check
  CHECK (exemption_type IN ('EXEMPT', 'PREPAID', 'LEAVE', 'INJURED'));

-- 2) 선납 메타 컬럼
ALTER TABLE public.member_dues_exemptions
  ADD COLUMN IF NOT EXISTS monthly_amount      INT,
  ADD COLUMN IF NOT EXISTS period_months       INT,
  ADD COLUMN IF NOT EXISTS actual_paid_amount  INT;

-- 컬럼 검증: PREPAID일 때 메타 3종 모두 양수여야 함
ALTER TABLE public.member_dues_exemptions
  DROP CONSTRAINT IF EXISTS member_dues_exemptions_prepaid_meta_check;

ALTER TABLE public.member_dues_exemptions
  ADD CONSTRAINT member_dues_exemptions_prepaid_meta_check
  CHECK (
    exemption_type <> 'PREPAID'
    OR (
      monthly_amount IS NOT NULL AND monthly_amount > 0
      AND period_months IS NOT NULL AND period_months > 0
      AND actual_paid_amount IS NOT NULL AND actual_paid_amount > 0
      AND end_date IS NOT NULL
    )
  );

COMMENT ON COLUMN public.member_dues_exemptions.monthly_amount IS '선납 등록 시점의 월 회비 스냅샷 (PREPAID 만 사용)';
COMMENT ON COLUMN public.member_dues_exemptions.period_months IS '선납 기간 개월수 (PREPAID 만 사용, 보통 3·6·12)';
COMMENT ON COLUMN public.member_dues_exemptions.actual_paid_amount IS '실제 받은 금액 (우대 적용 후, PREPAID 만 사용). 우대액 = monthly_amount × period_months − actual_paid_amount';
