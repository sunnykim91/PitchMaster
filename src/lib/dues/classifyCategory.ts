/**
 * 회비 거래 설명(description)에서 대분류 카테고리 추출 — 월별 결산 리포트용.
 *
 * 수입/지출을 각각 도메인 키워드로 분류한다.
 *
 * ⚠️ INCOME 확장 배경 (FC발로만 총무 피드백, 2026-07):
 * 과거 INCOME 분기는 선납/벌금/이자만 보고 나머지를 전부 "회비 수입"으로 뭉쳤다.
 * 그 결과 유니폼비 수납·구장비 수납·보증금 환불 등이 모두 회비 수입에 섞여
 * 월 회비가 실제보다 크게 부풀려졌다(예: 실제 145,000 → 표시 693,475).
 * 지출과 대칭으로 키워드를 확장해, "회비 수입"에는 실제 회비만 남긴다.
 *
 * 매칭은 부분 문자열(includes) 기준이라 순서가 곧 우선순위다.
 * 예) "마들 구장비 환불"은 구장 먼저 매칭 → 구장비 수입(구장비 지출을 상쇄하는 수입으로 취급).
 */

export type DuesRecordType = "INCOME" | "EXPENSE";

export function classifyCategory(type: string, description: string | null): string {
  const d = description ?? "";

  if (type === "EXPENSE") {
    if (!description) return "기타 지출";
    if (d.includes("용병")) return "용병비";
    if (d.includes("구장") || d.includes("운동장")) return "구장비";
    if (d.includes("유니폼") || d.includes("운동복")) return "유니폼";
    if (d.includes("회식") || d.includes("뒤풀이")) return "회식비";
    // "공" 단독 매칭은 공과금·공지 등을 장비로 오분류시켜 제거 — 축구공만 인정.
    if (d.includes("장비") || d.includes("축구공")) return "장비";
    if (d.includes("심판")) return "심판비";
    return "기타 지출";
  }

  // INCOME — 목적성 수납·환불을 분리하고 "회비 수입"에는 실제 회비만 남긴다.
  if (!description) return "회비 수입";
  if (d.includes("선납")) return "선납";
  if (d.includes("벌금") || d.includes("불참") || d.includes("지각") || d.includes("결석")) return "벌금 수입";
  if (d.includes("유니폼") || d.includes("운동복")) return "유니폼 수입";
  if (d.includes("구장") || d.includes("운동장")) return "구장비 수입";
  // 지출 분류와 대칭 — 용병비·심판비·장비 각출 수입도 "회비 수입"에서 분리 (월회비 뻥튀기 방지).
  if (d.includes("용병")) return "용병비 수입";
  if (d.includes("심판")) return "심판비 수입";
  if (d.includes("장비") || d.includes("축구공")) return "장비 수입";
  if (d.includes("환불") || d.includes("보증금")) return "환불";
  if (d.includes("이자")) return "이자";
  if (d.includes("회식") || d.includes("뒤풀이")) return "회식 수입";
  return "회비 수입";
}
