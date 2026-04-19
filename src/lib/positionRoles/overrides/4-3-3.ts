/**
 * 4-3-3 포메이션 오버라이드
 *
 * 슬롯: GK · LB · LCB · RCB · RB · LCM · CM · RCM · LW · ST · RW (11명)
 *
 * 특징:
 * - 3인 중원 (역삼각 = CM이 뒤, 또는 정삼각 = CM이 앞)
 * - 양 윙어(LW·RW)가 순수 공격형 — 측면 너비 책임
 * - 풀백(LB·RB) 오버래핑 필수 — 윙어가 안쪽 치고 들어갈 때 측면 담당
 * - 원톱(ST) + 2윙어 = 3톱
 */

import type { FormationOverrideMap } from "../types";

export const OVERRIDE_433: FormationOverrideMap = {
  GK: {
    whyItMatters:
      "4-3-3은 **양 풀백이 적극 전진하고 윙어가 높이 서는 구조**라 뒷공간이 자주 열려요. GK의 스위퍼 역할이 다른 포메이션보다 중요. 빌드업 시엔 CB-CM(또는 CDM) 3인 출발점 구성에 참여.",
    extraDefense: [
      "**풀백 뒷공간 스루 패스 예측·선출 반복**. 4-3-3 특유의 리스크 커버.",
    ],
    linkage: [
      { position: "LCB·RCB", note: "빌드업 1순위 출발점." },
      { position: "CM (역삼각 CDM 역할)", note: "빌드업 중간 경유지. CM이 내려오면 3인 후방 구성." },
      { position: "LB·RB", note: "올라간 풀백을 향한 롱킥 배급." },
    ],
  },

  LB: {
    whyItMatters:
      "4-3-3 LB는 **LW가 안쪽 치고 들어가는 만큼 측면 너비를 혼자 담당**. 오버래핑 필수이며 체력 부담 팀 최상위. LW와 스위치·오버래핑 조합이 좌측 공격의 전부.",
    extraAttack: [
      "**LW가 안쪽 컷인하면 내가 측면 오버래핑**이 4-3-3 기본 패턴. 크로스·컷백 퀄리티가 직접 득점 연결.",
    ],
    extraStamina: [
      "4-3-3 풀백은 팀 최고 활동량. 70% 페이스·교체 고려 필수.",
    ],
    linkage: [
      { position: "LCB", note: "수비 복귀 파트너. 내가 올라가면 LCB가 측면까지 커버." },
      { position: "LCM", note: "뒷공간 보조 커버. 내 자리 비었을 때 LCM이 내려옴." },
      { position: "LW", note: "측면 공격 파트너. 교차·오버래핑 조합." },
    ],
  },

  LCB: {
    whyItMatters:
      "4-3-3의 LCB는 **풀백이 자주 올라가는 만큼 측면 커버 부담이 큼**. LB가 올라갈 때 측면으로 밀려 커버, CM(내려온 CDM)과 3각 수비 유닛 형성.",
    extraDefense: [
      "**LB 뒷공간 측면 커버 자주**. LB가 상대 역습 복귀 못 할 때 내가 측면까지 밀려서 막기.",
    ],
    linkage: [
      { position: "RCB", note: "수비 파트너. 간격·전진 교대." },
      { position: "LCM (또는 CDM 역할 CM)", note: "빌드업 경유지. 내려온 미드가 3인 후방 라인 만들어줌." },
      { position: "LB", note: "측면 파트너. LB 오버래핑 시 내가 커버." },
      { position: "GK", note: "백패스 안전 루트." },
    ],
  },

  RCB: {
    whyItMatters:
      "LCB의 미러. **RB 오버래핑 커버 빈번**. 오른발 크로스필드 패스로 반대쪽 LW 쪽 전환 장면이 4-3-3의 대표 득점 루트.",
    extraAttack: [
      "**반대쪽 LW한테 대각선 롱패스** — 상대 수비가 우측에 쏠렸을 때 단번에 상황 뒤집기.",
    ],
    linkage: [
      { position: "LCB", note: "수비 파트너." },
      { position: "RCM", note: "빌드업 우측 경유지." },
      { position: "RB", note: "측면 커버 파트너." },
      { position: "GK", note: "백패스 루트." },
    ],
  },

  RB: {
    whyItMatters:
      "LB의 미러. **RW가 안쪽 성향일 때 우측 측면 혼자 담당**. 오버래핑 필수, 체력 부담 팀 최상위. RW와의 조합이 우측 공격 전부.",
    extraAttack: [
      "RW 컷인 시 측면 오버래핑 → 크로스·컷백.",
    ],
    extraStamina: [
      "4-3-3 풀백 = 최고 활동량. 교체 고려 필수.",
    ],
    linkage: [
      { position: "RCB", note: "수비 복귀 파트너." },
      { position: "RCM", note: "뒷공간 보조 커버." },
      { position: "RW", note: "측면 공격 파트너." },
    ],
  },

  LCM: {
    whyItMatters:
      "4-3-3 3인 중원의 좌측. **역삼각 구조(CM이 뒤)면 나는 공격 가담이 본업**, 정삼각(CM이 앞)이면 LDM 성향. 포메이션 운영 방식 확인 필수.",
    extraAttack: [
      "**박스 침투 빈번**. 4-3-3의 중앙 미드는 득점 가담이 공격 루트 중 하나.",
    ],
    linkage: [
      { position: "CM", note: "중원 파트너. 역할 분담(수비·공격) 사전 합의." },
      { position: "RCM", note: "중원 3인 중 나머지 한 명. 3각 연결." },
      { position: "LCB·LB", note: "좌측 수비 라인 연결." },
      { position: "LW", note: "좌측 공격 연계 파트너." },
    ],
  },

  CM: {
    whyItMatters:
      "4-3-3 중앙 미드. **역삼각 구조에서 CDM 역할(수비형)** 또는 **정삼각에서 10번 역할(공격형)**. 팀 전술에 따라 완전히 다른 자리니 경기 전 확인.",
    extraAttack: [
      "역삼각(수비형 CM)이면 빌드업 허브. 드리블 자제·안전 패스 우선.",
      "정삼각(공격형 CM)이면 스루 패스·박스 침투 적극.",
    ],
    extraDefense: [
      "역삼각이면 포백 앞 단독 보호(싱글 피벗). 중앙 구역 절대 이탈 금지.",
    ],
    linkage: [
      { position: "LCM·RCM", note: "중원 3각 파트너." },
      { position: "LCB·RCB", note: "수비 연결(역삼각 시 특히 중요)." },
      { position: "ST", note: "득점 연결 핵심. 결정적 키 패스 공급." },
    ],
  },

  RCM: {
    whyItMatters:
      "LCM의 미러. **4-3-3 중원 우측**. 역할은 LCM과 대칭 — 포메이션 변형에 따라 수비·공격 본업 결정.",
    extraAttack: [
      "박스 침투 가담 + 오른발 대각선 전환 패스.",
    ],
    linkage: [
      { position: "CM", note: "중원 파트너." },
      { position: "LCM", note: "3각 연결 상대방." },
      { position: "RCB·RB", note: "우측 수비 라인 연결." },
      { position: "RW", note: "우측 공격 연계." },
    ],
  },

  LW: {
    whyItMatters:
      "4-3-3의 **순수 윙어**. 측면 너비·돌파·크로스·득점 모두 본업. LB가 측면 받쳐주니 안쪽 컷인 자유도 높음. 원톱 ST 혼자 득점 부담 안지게 **윙어도 박스 침투·득점 필수**.",
    extraAttack: [
      "**LB와 2:1 조합이 공격의 생명**. 오버래핑·언더래핑 교대로 상대 풀백 혼선.",
      "**박스 침투 적극**. 반대쪽 RW 크로스 시 파포스트로 달려가기.",
    ],
    linkage: [
      { position: "LB", note: "2:1 파트너. 측면 공격의 전부." },
      { position: "ST", note: "원투·벽패스·컷백 주고받기." },
      { position: "LCM", note: "백패스·재전개 상대." },
    ],
  },

  ST: {
    whyItMatters:
      "4-3-3의 원톱이지만 **양 윙어(LW·RW)가 득점 가담도 많아 혼자는 아님**. 그래도 CB 2명을 상대하는 부담은 여전. 움직임으로 윙어한테 공간 만들어주는 역할이 크고, 원톱 중 가장 2선 동료 활용도가 높음.",
    extraAttack: [
      "**LW·RW 침투 공간 만들기** — 내가 CB 끌고 나가면 윙어가 박스 안으로 들어와 득점.",
      "**3톱 조합의 정점**. 좌우 윙어와 원투 연계 빈번.",
    ],
    linkage: [
      { position: "LW·RW", note: "3톱 동료. 교차·원투로 상대 수비 흔들기." },
      { position: "CM (역삼각 공격형)", note: "스루 패스·키패스 공급자." },
      { position: "LCM·RCM", note: "2선 동료. 박스 근처 연계." },
    ],
  },

  RW: {
    whyItMatters:
      "LW의 미러. **우측 순수 윙어**. RB와 2:1 조합이 우측 공격 주축. 오른발잡이면 바깥 크로스, 왼발잡이면 안쪽 컷인 후 슛.",
    extraAttack: [
      "RB 오버래핑 조합. 반대쪽 LW 크로스 시 파포스트 침투.",
    ],
    linkage: [
      { position: "RB", note: "2:1 파트너." },
      { position: "ST", note: "원투·컷백 주고받기." },
      { position: "RCM", note: "재전개 상대." },
    ],
  },
};
