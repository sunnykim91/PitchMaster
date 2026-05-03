-- 00058_prepayment_link.sql
-- 선납(PREPAID)과 입금 거래(dues_records)를 연결하는 외래키 추가.
--
-- 배경 (41차):
--   선납 등록 시 운영진이 회비 기록 탭에서 입금 거래를 별도 등록 → 시스템은 둘을 모름.
--   "이 입금이 그 선납이었지" 라는 매칭이 운영진 머릿속에만 존재.
--
-- 정책:
--   - PREPAID 등록 시 자동 매칭 시도 (user_id + amount + recorded_at ±2개월)
--   - 후보 정확히 1건일 때만 자동 매칭. 0건/다건이면 수동 매칭 UI 위임
--   - linked_dues_record_id 가 NULL = 미연결 → 활성 카드에서 "입금 연결" 버튼 노출
--
-- ON DELETE SET NULL: 입금 거래 삭제 시 선납 row는 보존 + 연결만 끊음 (감사 추적)

ALTER TABLE public.member_dues_exemptions
  ADD COLUMN IF NOT EXISTS linked_dues_record_id UUID
  REFERENCES public.dues_records(id) ON DELETE SET NULL;

-- 미연결 선납 조회 인덱스 (활성 카드에서 "연결 필요" 표시용)
CREATE INDEX IF NOT EXISTS member_dues_exemptions_unlinked_prepaid_idx
  ON public.member_dues_exemptions (team_id, exemption_type)
  WHERE exemption_type = 'PREPAID' AND linked_dues_record_id IS NULL AND is_active = true;

-- 역방향 조회 인덱스 (입금 거래 → 연결된 선납 찾기)
CREATE INDEX IF NOT EXISTS member_dues_exemptions_linked_record_idx
  ON public.member_dues_exemptions (linked_dues_record_id)
  WHERE linked_dues_record_id IS NOT NULL;

COMMENT ON COLUMN public.member_dues_exemptions.linked_dues_record_id IS '연결된 입금 거래 (PREPAID 만 사용). NULL=미연결, 등록 시 자동 매칭 시도 + 실패 시 수동 매칭 UI 노출';
