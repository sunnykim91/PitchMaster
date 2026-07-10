/**
 * 회비 입금 설명(description)에서 팀 멤버를 이름으로 매칭.
 *
 * 단순 `description.includes(name)` + `.find()`는 배열 첫(대개 더 짧은 이름) 후보를 반환해
 * "이준"이 "이준호 회비"에 매칭되는 등 **엉뚱한 사람에게 납부·벌금이 귀속**됐다.
 * (FC발로만 회비 로직 감사, 2026-07)
 *
 * 규칙:
 *  - 설명에 이름이 포함된 후보 중 **가장 긴 이름**을 우선 (이준 vs 이준호 → 이준호).
 *  - 최장 이름이 둘 이상(동명이인 등)이면 **모호 → null** (자동 귀속 보류, 수동 확인 유도).
 *  - 매칭 후보가 없어도 null.
 *
 * 멤버 객체는 `name`만 있으면 되고, 반환값은 매칭된 멤버 객체 그대로라 호출부에서
 * 필요한 식별자(id / memberId / user_id)를 꺼내 쓰면 된다.
 */
export function matchMemberByName<T extends { name?: string | null }>(
  description: string | null | undefined,
  members: T[],
): T | null {
  const desc = (description ?? "").trim();
  if (!desc) return null;

  const hits = members.filter((m) => {
    const n = m.name?.trim();
    return !!n && desc.includes(n);
  });
  if (hits.length === 0) return null;
  if (hits.length === 1) return hits[0];

  const maxLen = Math.max(...hits.map((m) => m.name!.trim().length));
  const longest = hits.filter((m) => m.name!.trim().length === maxLen);
  return longest.length === 1 ? longest[0] : null;
}
