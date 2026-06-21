/**
 * KST(UTC+9) 기준 날짜·시각 헬퍼 — 서버(UTC 런타임)·클라이언트 공용 단일 source.
 *
 * ⚠️ `new Date().toISOString().slice(0, 10)` 는 **UTC 날짜**라 KST 00:00~09:00 사이엔
 *    "어제" 를 돌려준다. "오늘"/"지금" 을 KST 로 다뤄야 하는 모든 곳은 이 헬퍼를 쓸 것.
 *    (서버는 Vercel=UTC 라 매일 그 시간대에, 클라는 해외 기기에서 어긋남)
 */

/** 내부 필드가 KST 벽시계 시각을 나타내는 Date (toISOString·getUTC* 로 KST 값 추출) */
export function getKstNow(nowMs: number = Date.now()): Date {
  return new Date(nowMs + 9 * 60 * 60 * 1000);
}

/** 'YYYY-MM-DD' 형식의 KST 오늘 날짜 */
export function getKstToday(nowMs: number = Date.now()): string {
  return getKstNow(nowMs).toISOString().slice(0, 10);
}

/** 'HH:MM:SS' 형식의 KST 현재 시각 */
export function getKstTimeOfDay(nowMs: number = Date.now()): string {
  return getKstNow(nowMs).toISOString().split("T")[1].slice(0, 8);
}
