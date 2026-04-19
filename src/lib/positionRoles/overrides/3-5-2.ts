/**
 * 3-5-2 포메이션 오버라이드
 *
 * 슬롯: GK · LCB · CB · RCB · LWB · LCM · CM · RCM · RWB · LS · RS (11명)
 *
 * 특징:
 * - 스리백 + 투톱. 중원 5명 밀집
 * - 양 윙백(LWB·RWB)이 측면 공수 전부 담당 — 체력 최대 부담
 * - 중앙 CB가 수비 사령탑 + 빌드업 허브
 * - 3인 중원이 중앙 숫자 우세로 경기 지배
 */

import type { FormationOverrideMap } from "../types";

export const OVERRIDE_352: FormationOverrideMap = {
  GK: {
    whyItMatters:
      "3-5-2는 **스리백이라 수비 숫자가 적은 대신 중앙 CB가 라인 지휘**. GK는 CB 3명과 긴밀히 소통하며 라인 조율. 윙백이 올라간 상태에서 측면 뒷공간 위기 자주 생기니 GK 스위퍼 역할 필수.",
    extraDefense: [
      "**윙백 뒷공간 스루 패스 대비**. 양 윙백이 동시 올라가면 스리백은 수적 열세. GK가 박스 밖까지 나와 선출.",
    ],
    linkage: [
      { position: "CB", note: "수비 사령탑 파트너. 가장 긴밀한 소통." },
      { position: "LCB·RCB", note: "백패스 대상. 스리백 좌우 축." },
      { position: "LS·RS", note: "롱킥 배급 타겟 2명." },
    ],
  },

  LCB: {
    whyItMatters:
      "3-5-2 LCB는 **스리백의 좌측 축**. LWB가 올라간 뒷공간 커버가 주 업무. CB·RCB와 3각 수비 + LCM과 연계해 좌측 전체 수비.",
    extraDefense: [
      "**LWB 뒷공간 커버 빈번**. LWB 올라가면 내가 측면까지 밀려 포백 모양 일시 형성.",
    ],
    linkage: [
      { position: "CB", note: "스리백 중앙 축. 사령탑." },
      { position: "RCB", note: "스리백 반대쪽. 좌우 균형 유지." },
      { position: "LWB", note: "좌측 커버 파트너. LWB 올라가면 내가 측면 이동." },
      { position: "LCM", note: "빌드업 경유지 + 좌측 수비 2선 보조." },
    ],
  },

  CB: {
    whyItMatters:
      "3-5-2의 **수비 사령탑**. 스리백 중앙으로 LCB·RCB 둘 다 지휘. 주장 자주 맡는 자리. 빌드업 허브 역할도 커요 — CB가 공 가장 많이 잡는 포메이션.",
    extraCommunication: [
      "**LCB·RCB 동시에 지휘**. 양쪽 윙백 위치 체크 + 라인 높이 조절.",
    ],
    linkage: [
      { position: "LCB·RCB", note: "수비 3인 유닛. 내가 가운데서 둘을 조율." },
      { position: "CM", note: "빌드업 경유지. 중원 사령탑과 페어." },
      { position: "GK", note: "빌드업 출발 협력." },
    ],
  },

  RCB: {
    whyItMatters:
      "LCB의 미러. **스리백 우측 축**. RWB 뒷공간 커버 + 중앙 CB 보조. 오른발잡이가 많아 크로스필드 패스로 반대쪽 LWB 전환 자주.",
    extraDefense: [
      "RWB 뒷공간 커버 빈번. RWB 올라가면 내가 측면 이동.",
    ],
    extraAttack: [
      "반대쪽 LWB·LS 대상 오른발 크로스필드 전환 패스.",
    ],
    linkage: [
      { position: "CB", note: "사령탑 파트너." },
      { position: "LCB", note: "스리백 반대 축." },
      { position: "RWB", note: "우측 커버 파트너." },
      { position: "RCM", note: "빌드업 경유 + 우측 2선 보조." },
    ],
  },

  LWB: {
    whyItMatters:
      "3-5-2의 **좌측 공수 전담**. 측면 윙어 + 풀백 합본이라 **팀 최고 활동량**. 이 자리 체력 관리가 3-5-2 전술 작동 여부를 결정.",
    extraAttack: [
      "**좌측 측면 너비 전담** — 위치가 매우 높아지면 사실상 윙어. 크로스·컷인 모두 활용.",
    ],
    extraStamina: [
      "3-5-2 윙백 = 팀 최고 활동량. 60~70% 페이스 + 60분 시점 교체 고려.",
    ],
    linkage: [
      { position: "LCB", note: "수비 복귀 파트너. 내 자리 커버." },
      { position: "LCM", note: "내 뒷공간 보조 커버." },
      { position: "LS", note: "측면 크로스 수신자. 투톱 좌측 담당." },
    ],
  },

  LCM: {
    whyItMatters:
      "3-5-2 3인 중원의 좌측. **중원 숫자 우세를 활용해 지배력 확보**. 공격 가담 + 수비 보조 + 좌측 LWB 뒷공간 커버까지 멀티.",
    extraDefense: [
      "**LWB 뒷공간 보조 커버**. LWB 혼자 복귀 불가할 때 내가 측면까지 내려옴.",
    ],
    linkage: [
      { position: "CM", note: "중원 파트너. 역할 분담." },
      { position: "RCM", note: "3각 중 반대쪽." },
      { position: "LCB·LWB", note: "좌측 수비 라인 연결." },
      { position: "LS", note: "투톱 공급자." },
    ],
  },

  CM: {
    whyItMatters:
      "3-5-2 중원 중앙. **3인 중원의 허리**로 공수 전환 허브. 보통 가장 판단력 좋은 선수가 이 자리. 상대 CAM·공격형 미드 마크 + 중거리 패스 분배가 핵심.",
    extraAttack: [
      "**박스 바로 앞 키패스 공급자**. 투톱 뒤에서 정확한 스루 패스가 주 득점 루트.",
    ],
    linkage: [
      { position: "LCM·RCM", note: "3각 중원 파트너." },
      { position: "CB", note: "수비·빌드업 페어." },
      { position: "LS·RS", note: "투톱 공급자." },
    ],
  },

  RCM: {
    whyItMatters:
      "LCM의 미러. **우측 3인 중원의 축**. RWB 뒷공간 커버 + 오른발 대각선 패스 분배. 공수 겸비 필수.",
    extraDefense: [
      "RWB 뒷공간 보조 커버.",
    ],
    linkage: [
      { position: "CM", note: "중원 파트너." },
      { position: "LCM", note: "3각 반대쪽." },
      { position: "RCB·RWB", note: "우측 수비 연결." },
      { position: "RS", note: "투톱 공급자." },
    ],
  },

  RWB: {
    whyItMatters:
      "LWB의 미러. **우측 공수 전담**. 팀 최고 활동량 파트너. 오른발 크로스 퀄리티가 투톱 득점 직결.",
    extraAttack: [
      "우측 측면 너비 전담. 크로스·컷인 모두.",
    ],
    extraStamina: [
      "최고 활동량 자리. 교체 고려.",
    ],
    linkage: [
      { position: "RCB", note: "수비 복귀 파트너." },
      { position: "RCM", note: "뒷공간 보조." },
      { position: "RS", note: "측면 크로스 수신자." },
    ],
  },

  LS: {
    whyItMatters:
      "3-5-2의 **투톱 좌측**. 3인 중원이 키패스·스루 패스 공급해주니 **박스 안 마무리 빈도가 4-4-2 투톱보다 높음**. RS와 CB 2명 분산은 기본.",
    extraAttack: [
      "**중원 3명이 다양한 각도에서 패스 공급** — 4-4-2보다 공급원 많으니 박스 안 위치 선점이 더 중요.",
    ],
    linkage: [
      { position: "RS", note: "투톱 파트너. 교차·간격." },
      { position: "LCM·CM", note: "키패스 공급자." },
      { position: "LWB", note: "측면 크로스 공급자." },
    ],
  },

  RS: {
    whyItMatters:
      "LS의 미러. **투톱 우측**에서 상대 LCB 분산 + 득점·어시스트. 중원 3인 공급이 풍부해 득점 기회 다양.",
    extraAttack: [
      "RCM·CM·RWB 3 공급원 활용. 박스 안 위치 선점 관건.",
    ],
    linkage: [
      { position: "LS", note: "투톱 파트너." },
      { position: "RCM·CM", note: "키패스 공급자." },
      { position: "RWB", note: "측면 크로스 공급자." },
    ],
  },
};
