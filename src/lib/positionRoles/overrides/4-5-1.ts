/**
 * 4-5-1 포메이션 오버라이드
 *
 * 슬롯: GK · LB · LCB · RCB · RB · LM · LCM · CM · RCM · RM · ST (11명)
 *
 * 특징:
 * - 5인 미드 라인 + 원톱 = 가장 수비적
 * - 중원 숫자 우세로 경기 지배 또는 수비 웅크리기 둘 다 가능
 * - 원톱이 극도로 고립 — 후방 롱패스·측면 크로스로만 연결
 * - 5인 미드 중 LM·RM은 측면 보강 + CM은 수비형 중앙
 */

import type { FormationOverrideMap } from "../types";

export const OVERRIDE_451: FormationOverrideMap = {
  GK: {
    whyItMatters:
      "4-5-1은 **가장 수비적 포메이션**. 5인 미드가 앞에서 막아줘서 GK 압박 극히 적음. 대신 1:1 상황은 드물어도 세트피스 실점 비중 상대적으로 커짐.",
    extraDefense: [
      "전방 압박이 튼튼해 수비 개입 드물지만, 집중력 유지·세트피스 조직 비중 상승.",
    ],
    linkage: [
      { position: "LCB·RCB", note: "백패스 기본 루트." },
      { position: "CM", note: "빌드업 경유지. 중원 허브." },
      { position: "ST", note: "원톱 롱킥 타겟." },
    ],
  },

  LB: {
    whyItMatters:
      "4-5-1 LB는 **LM이 측면 보강해줘서 수비 부담 덜함**. 오버래핑 여유 있지만 포메이션 전체가 수비적이라 전진 빈도 자체는 낮음.",
    linkage: [
      { position: "LCB", note: "수비 파트너." },
      { position: "LM", note: "측면 2인 수비." },
      { position: "LCM", note: "뒷공간 커버." },
    ],
  },

  LCB: {
    whyItMatters:
      "4-5-1 LCB는 **수비 숫자 + 미드 5명 앞 보호**로 매우 안정적. 대신 빌드업 시 길게 뿌릴 곳이 ST 하나라 패스 타이밍·정확도가 핵심.",
    extraAttack: [
      "**원톱 ST 고립 상태 많음** — 롱볼 배급 시 측면 LM·RM에게 먼저 뿌리고 크로스 전개가 안전.",
    ],
    linkage: [
      { position: "RCB", note: "수비 파트너." },
      { position: "CM", note: "빌드업 중앙 경유지." },
      { position: "LCM", note: "빌드업 좌측 경유지." },
      { position: "LB", note: "측면 커버." },
    ],
  },

  RCB: {
    whyItMatters:
      "LCB의 미러. **안정적이지만 빌드업 답답함 있음**. 중원 5명에게 신중하게 연결 필요.",
    linkage: [
      { position: "LCB", note: "수비 파트너." },
      { position: "CM", note: "중앙 경유." },
      { position: "RCM", note: "우측 경유." },
      { position: "RB", note: "측면 커버." },
    ],
  },

  RB: {
    whyItMatters:
      "LB의 미러. **RM 덕에 수비 부담 덜함**. 포메이션 특성상 전진 빈도 낮지만 기회 되면 측면 돌파.",
    linkage: [
      { position: "RCB", note: "수비 파트너." },
      { position: "RM", note: "측면 2인." },
      { position: "RCM", note: "뒷공간 커버." },
    ],
  },

  LM: {
    whyItMatters:
      "4-5-1의 LM은 **측면 미드 + 수비 보강 혼합형**. LB와 측면 2인 유닛 + LCM과 중앙 커버 가담. **원톱이 고립이라 측면 미드도 득점 가담 필수**.",
    extraAttack: [
      "크로스·박스 침투 적극. 원톱만으로 득점 부족.",
    ],
    linkage: [
      { position: "LB", note: "측면 수비 2인." },
      { position: "LCM", note: "중앙 연결." },
      { position: "ST", note: "측면 크로스 공급." },
    ],
  },

  LCM: {
    whyItMatters:
      "4-5-1 5인 중원 좌측 안쪽. **중원 숫자 우세를 활용해 경기 지배**. 빌드업·공격 전환·수비 가담 모두.",
    extraAttack: [
      "박스 침투 가담 — 5인 미드 중에서 공격 가담 여유 있는 자리.",
    ],
    linkage: [
      { position: "CM", note: "중원 파트너. 3각 중 중앙." },
      { position: "RCM", note: "반대 축." },
      { position: "LCB", note: "빌드업 연결." },
      { position: "LM", note: "좌측 연결." },
    ],
  },

  CM: {
    whyItMatters:
      "4-5-1 중원 중앙. **5인 중원 중 가장 수비적**. 포백 앞 보호 + 빌드업 허브. 4-1-4-1 CDM과 비슷한 역할이지만 좌우에 LCM·RCM이 있어 부담 덜함.",
    extraDefense: [
      "상대 CAM·공격수 차단이 주 업무. LCM·RCM이 공격 가담 시 내가 잔류.",
    ],
    linkage: [
      { position: "LCM·RCM", note: "3각 중원 파트너." },
      { position: "LCB·RCB", note: "수비 2선 파트너." },
      { position: "ST", note: "롱볼 1차 수신 후 연계." },
    ],
  },

  RCM: {
    whyItMatters:
      "LCM의 미러. **중원 우측 안쪽**. 오른발 대각선 전환 패스 분배.",
    extraAttack: [
      "박스 침투 가담.",
    ],
    linkage: [
      { position: "CM", note: "중원 파트너." },
      { position: "LCM", note: "반대 축." },
      { position: "RCB", note: "빌드업 연결." },
      { position: "RM", note: "우측 연결." },
    ],
  },

  RM: {
    whyItMatters:
      "LM의 미러. **우측 측면 미드 + 수비 보강**. RB와 2인 측면 + RCM과 중앙 가담. 원톱 고립 보완 위해 득점 가담 필수.",
    extraAttack: [
      "크로스·박스 침투.",
    ],
    linkage: [
      { position: "RB", note: "측면 수비 2인." },
      { position: "RCM", note: "중앙 연결." },
      { position: "ST", note: "크로스 공급." },
    ],
  },

  ST: {
    whyItMatters:
      "4-5-1의 원톱. **팀에서 가장 고립된 자리**. 2선 동료가 늦게 올라오고 수비적 포메이션이라 **혼자 버티고 연계하는 능력 필수**. 포스트 플레이·드리블·결정력 모두 필요.",
    extraAttack: [
      "**포스트 플레이 핵심** — 등진 상태에서 CB 버티면서 2선 올라올 시간 벌기.",
      "**결정적 기회 놓치면 득점 안 남** — 공급 자체가 적으니 마무리 정확도가 전부.",
    ],
    linkage: [
      { position: "LCM·RCM", note: "2선 득점 가담 파트너. 내가 버티면 그들이 올라와 득점." },
      { position: "LM·RM", note: "측면 크로스 공급원." },
      { position: "CM", note: "롱볼 1차 수신 후 내려찍기." },
    ],
  },
};
