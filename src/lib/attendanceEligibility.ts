import { getKstToday } from "@/lib/kstDate";

/**
 * 출석률 분모 산정 — 가입(joined_at) 이전 경기는 표본에서 제외.
 *
 * 배경: 출석률을 `출석 / 시즌 전체 경기수` 로 계산하면 가입 전 경기가 전부
 *   "결석"으로 잡혀 신규 회원 출석률이 비정상적으로 낮게 나온다. 분모를
 *   가입 이후 경기로 좁혀야 한다(분자 attended 는 가입 전 출석기록이 없어
 *   영향 없음 — 분모만 바로잡으면 됨).
 *
 * 기준 구현: src/app/api/attendance/recent/route.ts ("pre" 제외 + eligible 분모).
 */

/** timestamptz(UTC) → KST "YYYY-MM-DD". null/미파싱은 null. */
export function kstDateString(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return getKstToday(t);
}

/** 해당 경기가 회원의 출석률 표본 대상인지 (가입일 이후). joinKst null이면 전체 대상. */
export function isEligibleMatch(matchDate: string, joinKst: string | null): boolean {
  return !joinKst || matchDate >= joinKst;
}

/**
 * 출석률 분모 = 가입 이후 완료 경기 수.
 * @param matchDates 대상 경기들의 match_date (YYYY-MM-DD) 목록
 * @param joinedAt   team_members.joined_at (timestamptz). null이면 전체 포함.
 */
export function countEligibleMatches(
  matchDates: string[],
  joinedAt: string | null | undefined,
): number {
  const joinKst = kstDateString(joinedAt);
  if (!joinKst) return matchDates.length;
  let n = 0;
  for (const d of matchDates) if (d >= joinKst) n++;
  return n;
}

/**
 * 출석률 = 출석 / 가입이후 경기수. 분모 0이면 0.
 * @param attended   실제 출석한 경기 수(가입 전 기록은 애초에 없음)
 * @param matchDates 대상 경기 match_date 목록
 * @param joinedAt   team_members.joined_at
 */
export function computeAttendanceRate(
  attended: number,
  matchDates: string[],
  joinedAt: string | null | undefined,
): number {
  const eligible = countEligibleMatches(matchDates, joinedAt);
  return eligible > 0 ? attended / eligible : 0;
}
