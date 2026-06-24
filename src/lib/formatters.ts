/**
 * 날짜·시간·금액 포맷 통일 유틸
 *
 * 주의:
 *  - 이 파일의 포맷터는 "UI 표시용" 통일 포맷을 제공한다.
 *  - API 요청/DB 저장용 날짜는 여전히 ISO(YYYY-MM-DD) 포맷을 유지해야 한다.
 *  - `src/lib/utils.ts`에 역사적 포맷터(formatTime, formatDateKo, formatMatchDate,
 *    formatDateDot, formatDue 등)가 이미 있으며, 이름이 겹치는 것이 있다.
 *    기존 호출부의 동작을 유지하기 위해 utils.ts의 함수는 그대로 두고,
 *    신규 코드는 본 파일의 포맷터를 쓰는 방향으로 점진 통일한다.
 */

/** "YYYY-MM-DD" 순수 날짜 문자열은 타임존 불변으로 파싱 */
function toLocalDate(input: string | Date): Date {
  if (input instanceof Date) return input;
  // "YYYY-MM-DD" 형태면 로컬 자정으로 고정 (UTC 파싱으로 하루 어긋남 방지)
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.exec(input);
  if (dateOnly) {
    const [y, m, d] = input.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(input);
}

/** "2026.04.14" 형식 (기본) */
export function formatDate(input: string | Date): string {
  const d = toLocalDate(input);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

/** "4월 14일 (월)" 형식 — 한국어 표기 */
export function formatDateKo(input: string | Date): string {
  const d = toLocalDate(input);
  if (isNaN(d.getTime())) return "";
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return `${m}월 ${day}일 (${weekday})`;
}

/** "17:00" 24시간 형식 */
export function formatTime(input: string): string {
  if (!input) return "";
  // "HH:MM" 또는 "HH:MM:SS" 둘 다 수용
  return input.slice(0, 5);
}

/** "오후 5:00" 한국어 시간 */
export function formatTimeKo(input: string): string {
  if (!input) return "";
  const [hStr, m] = input.split(":");
  const h = Number(hStr);
  if (isNaN(h)) return input;
  const period = h < 12 ? "오전" : "오후";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${period} ${hour12}:${m}`;
}

/**
 * timestamptz(ISO) → 한국어 날짜·시각 (KST 고정·결정론적).
 *
 * ⚠️ `toLocale*({hour})` 금지: 서버 Node ICU 는 dayPeriod 를 영문("PM")으로, 브라우저는 "오후"로
 * 렌더해 **하이드레이션 불일치**를 유발한다(+ 런타임 타임존 의존). UTC 에 +9h 한 뒤 컴포넌트를
 * 직접 조립해 서버·클라가 항상 동일 문자열을 내도록 한다. (참고: feedback_timestamptz_display_kst)
 *
 * 기본: "4월 2일 오후 02:00" / withYear: "2026년 4월 2일 오후 02:00"
 */
export function formatKstDateTime(input: string | Date, opts?: { withYear?: boolean }): string {
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return "";
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const year = kst.getUTCFullYear();
  const month = kst.getUTCMonth() + 1;
  const day = kst.getUTCDate();
  const h24 = kst.getUTCHours();
  const minute = String(kst.getUTCMinutes()).padStart(2, "0");
  const period = h24 < 12 ? "오전" : "오후";
  const h12 = String(h24 % 12 === 0 ? 12 : h24 % 12).padStart(2, "0");
  const datePart = opts?.withYear ? `${year}년 ${month}월 ${day}일` : `${month}월 ${day}일`;
  return `${datePart} ${period} ${h12}:${minute}`;
}

/**
 * timestamptz(ISO) → "26년 4월 2일" (KST 고정·결정론적, 날짜만).
 *
 * formatKstDateTime 과 동일 이유로 toLocaleDateString 금지 — 날짜만이어도 자정 근처
 * timestamp 는 서버(UTC)·클라(KST)에서 다른 날짜로 갈려 하이드레이션 불일치가 난다.
 */
export function formatKstDate(input: string | Date): string {
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return "";
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const yy = String(kst.getUTCFullYear()).slice(2);
  const month = kst.getUTCMonth() + 1;
  const day = kst.getUTCDate();
  return `${yy}년 ${month}월 ${day}일`;
}

/** "3,000원" 금액 */
export function formatAmount(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "0원";
  return `${Math.floor(n).toLocaleString("ko-KR")}원`;
}
