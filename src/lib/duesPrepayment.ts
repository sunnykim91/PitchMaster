/**
 * 회비 선납 (dues_prepayments) 헬퍼.
 *
 * 사용:
 *   - 등록 화면에서 createPrepayment(...) 호출 → dues_prepayments + dues_records(INCOME) 생성
 *   - 월별 납부 상태 조회 시 isMonthPrepaid(prepayments, member_id, month) 로 체크
 *   - 취소 시 cancelPrepayment(id) → status='cancelled' + linked_dues_record 무효화
 */

export type PrepaymentRow = {
  id: string;
  team_id: string;
  user_id: string | null;
  member_id: string | null;
  member_name: string | null;
  amount: number;
  period_months: number;
  start_month: string; // YYYY-MM-DD (보통 1일)
  end_month: string;   // YYYY-MM-DD (월말)
  status: "active" | "cancelled";
  cancelled_at: string | null;
  cancelled_by: string | null;
  linked_dues_record_id: string | null;
  notes: string | null;
  recorded_by: string | null;
  recorded_at: string;
};

/** start_month 로부터 period_months 만큼 떨어진 월말 일자 계산. */
export function computeEndMonth(startMonth: string, periodMonths: number): string {
  // startMonth 형식: YYYY-MM-DD (보통 매달 1일)
  const start = new Date(startMonth);
  // 끝 월: start 의 월 + periodMonths - 1 의 마지막 날
  const endYear = start.getUTCFullYear();
  const endMonthIdx = start.getUTCMonth() + periodMonths - 1;
  // Date 의 월 인덱스에 +12, /12 로 carry 처리
  const carryYear = endYear + Math.floor(endMonthIdx / 12);
  const carryMonth = ((endMonthIdx % 12) + 12) % 12;
  // carryMonth 의 마지막 날 = carryMonth+1 월의 0일
  const last = new Date(Date.UTC(carryYear, carryMonth + 1, 0));
  // YYYY-MM-DD
  const yyyy = last.getUTCFullYear();
  const mm = String(last.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(last.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * 특정 멤버의 특정 월(YYYY-MM)이 선납 기간에 포함되는지.
 */
export function isMonthPrepaid(
  prepayments: PrepaymentRow[],
  memberId: string,
  yearMonth: string // "YYYY-MM"
): { prepaid: boolean; prepayment?: PrepaymentRow } {
  const target = `${yearMonth}-01`;
  for (const p of prepayments) {
    if (p.status !== "active") continue;
    if (p.member_id !== memberId) continue;
    if (target >= p.start_month && target <= p.end_month) {
      return { prepaid: true, prepayment: p };
    }
  }
  return { prepaid: false };
}

/**
 * 팀의 활성 선납 기준 멤버별 잔여 개월 수 계산 (오늘 기준).
 */
export function remainingMonthsByMember(
  prepayments: PrepaymentRow[],
  todayYearMonth?: string
): Record<string, number> {
  const today = todayYearMonth ?? new Date().toISOString().slice(0, 7);
  const result: Record<string, number> = {};
  for (const p of prepayments) {
    if (p.status !== "active") continue;
    if (!p.member_id) continue;
    const start = p.start_month.slice(0, 7); // YYYY-MM
    const end = p.end_month.slice(0, 7);
    if (today < start) {
      // 아직 시작 전 → 전체 기간 잔여
      result[p.member_id] = (result[p.member_id] ?? 0) + p.period_months;
    } else if (today <= end) {
      // 진행 중 → end - today + 1 개월
      const [ty, tm] = today.split("-").map((s) => parseInt(s, 10));
      const [ey, em] = end.split("-").map((s) => parseInt(s, 10));
      const remaining = (ey - ty) * 12 + (em - tm) + 1;
      result[p.member_id] = (result[p.member_id] ?? 0) + Math.max(0, remaining);
    }
    // 만료 → 잔여 0, 누적 안 함
  }
  return result;
}

/**
 * 선납 표시용 라벨 ("6개월 선납 중 · 3개월 남음" 등).
 */
export function formatPrepaymentLabel(
  prepayment: PrepaymentRow,
  todayYearMonth?: string
): string {
  const today = todayYearMonth ?? new Date().toISOString().slice(0, 7);
  const start = prepayment.start_month.slice(0, 7);
  const end = prepayment.end_month.slice(0, 7);
  if (today < start) {
    return `${prepayment.period_months}개월 선납 (시작 전)`;
  }
  if (today > end) {
    return `${prepayment.period_months}개월 선납 (만료)`;
  }
  const [ty, tm] = today.split("-").map((s) => parseInt(s, 10));
  const [ey, em] = end.split("-").map((s) => parseInt(s, 10));
  const remaining = (ey - ty) * 12 + (em - tm) + 1;
  return `${prepayment.period_months}개월 선납 · ${remaining}개월 남음`;
}
