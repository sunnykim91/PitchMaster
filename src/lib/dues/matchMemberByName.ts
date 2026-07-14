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

/**
 * 회비 입금 레코드를 회원 한 명에게 귀속.
 *
 * 연동된 레코드(memberName = user_id 조인으로 채워진 실제 이름)면 그 회원을 우선하고,
 * 아니면 description 을 matchMemberByName 으로 최장매칭한다.
 *
 * 과거 화면 코드는 회원마다 `r.memberName === m.name || r.description?.includes(m.name)` 를
 * 돌려, 입금 "이준호 회비"가 '이준'·'이준호' **양쪽에 중복 귀속**되고(이중 계상),
 * 연동 정보(memberName)까지 substring 으로 뚫렸다(FC발로만 감사, 2026-07).
 * 이 헬퍼는 **레코드당 정확히 한 회원**만 반환한다.
 */
export function attributeDuesIncome<M extends { name?: string | null }>(
  record: { memberName?: string | null; description?: string | null },
  members: M[],
): M | null {
  const linked = record.memberName?.trim();
  if (linked) {
    const exact = members.filter((m) => m.name?.trim() === linked);
    if (exact.length === 1) return exact[0];
    // 동명이인으로 모호(2+)하거나 현재 명단에 없으면(0) description 매칭으로 폴백
  }
  return matchMemberByName(record.description, members);
}

/**
 * OCR 보조 매칭 (역방향): OCR 이 이름 일부만 읽어 description 전체 매칭이 실패했을 때,
 * **회원 이름이 읽힌 토큰을 포함**하는 경우로 좁혀 보정한다. 예) OCR "이준" → 회원 "이준호".
 *
 * 단 토큰을 포함하는 회원이 둘 이상이면(예 "김" → 김철수·김영희) 모호하므로 null.
 * (과거 `.find(m => m.name.includes(token))` 는 배열 첫 후보를 임의 반환했다.)
 */
export function matchMemberByPartialName<M extends { name?: string | null }>(
  token: string | null | undefined,
  members: M[],
): M | null {
  const t = (token ?? "").trim();
  if (!t) return null;
  const hits = members.filter((m) => {
    const n = m.name?.trim();
    return !!n && n.includes(t);
  });
  return hits.length === 1 ? hits[0] : null;
}
