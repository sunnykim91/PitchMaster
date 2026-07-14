// 지난 경기 요일 기준 "다음 주 같은 요일" 날짜 — 1→2 경기 유도(활성화) 프리필용.
// recentDate 없으면 오늘+7일. 반환 date 는 오늘 이후 첫 해당 요일(YYYY-MM-DD, KST).
// 대시보드 "다음 경기 잡기" 카드 + 경기 상세 정보 탭 완료-직후 CTA 공용.
export function suggestNextMatchDate(
  recentDateStr: string | null,
  todayStr: string
): { date: string; dayName: string } {
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const toUtc = (s: string) => new Date(s + "T00:00:00Z");
  const today = toUtc(todayStr);
  const target = recentDateStr ? toUtc(recentDateStr) : new Date(today.getTime() + 7 * 86400000);
  // 오늘 이후 첫 (base 요일)로 이동 — 지난 경기가 아무리 오래됐어도 미래 날짜 보장
  while (target.getTime() <= today.getTime()) {
    target.setUTCDate(target.getUTCDate() + 7);
  }
  return { date: target.toISOString().slice(0, 10), dayName: dayNames[target.getUTCDay()] };
}
