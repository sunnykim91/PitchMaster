import type { FormationOverrideMap } from "../types";

/**
 * 풋살 5인제 4종 포메이션별 포지션 오버라이드.
 * - futsal-5-2-2 (Square)
 * - futsal-5-1-2-1 (Diamond)
 * - futsal-5-3-1 (Pyramid)
 * - futsal-5-4-0 (No Pivot)
 *
 * GK 베이스는 축구와 공유. 포메이션별 override는 풋살 맥락만 추가.
 */

export const FUTSAL_5_2_2_OVERRIDES: FormationOverrideMap = {
  GK: {
    whyItMatters: "풋살 GK는 골든 클리어런스(손) + 수비 라인 빌드업 시작점. 좁은 골에 슈팅 거리 짧아 반응 속도가 결과 좌우.",
    extraAttack: [
      "공격 시작 시 가까운 FIXO에게 짧은 손던지기 — 5초 룰 안에 시작",
    ],
    linkage: [
      { position: "FIXO (좌·우)", note: "받기 좋은 자리 잡기 콜 — 양쪽 FIXO 중 압박 덜 받는 쪽으로 빠른 분배" },
    ],
  },
  FIXO: {
    whyItMatters: "2-2는 좌우 FIXO 두 명이 후방 라인. 한 명이 압박당하면 다른 한 명이 즉시 받쳐야 빌드업 끊기지 않음.",
    extraAttack: [
      "반대편 FIXO와 가로 패스 — 상대 압박 흐름 흔들기",
      "PIVO 한 명에게 대각선 길게 — 측면 끌어내기",
    ],
    extraDefense: [
      "상대 PIVO 등 뒤 공간 막기 — 두 FIXO가 한 명씩 마크",
    ],
    linkage: [
      { position: "FIXO (반대편)", note: "수평 패스로 압박 회피, 한 명 끌리면 다른 한 명이 빌드업" },
      { position: "PIVO (같은 쪽)", note: "측면 라인 PIVO에게 대각선 패스 — 2대1 시도" },
    ],
  },
  PIVO: {
    whyItMatters: "2-2는 PIVO 두 명이 측면 전방. ALA 부재라 측면 폭과 박스 마무리 모두 PIVO가 책임.",
    extraAttack: [
      "FIXO에서 받은 후 라인 끝까지 침투 또는 컷인 슈팅",
      "반대편 PIVO와 박스 앞 크로스·컷백 시도",
    ],
    extraCaution: [
      { title: "두 PIVO가 같은 자리", detail: "둘 다 박스 안 모이면 패스 옵션 없음. 한 명은 라인 폭 잡기" },
    ],
    linkage: [
      { position: "FIXO (같은 쪽)", note: "후방 빌드업 받아 침투 — 받은 즉시 결정" },
      { position: "PIVO (반대편)", note: "박스 앞 크로스·컷백 받음. 마무리 위치 잡기" },
    ],
  },
};

export const FUTSAL_5_1_2_1_OVERRIDES: FormationOverrideMap = {
  GK: {
    whyItMatters: "1-2-1 다이아몬드는 FIXO 한 명에 수비 의존. GK가 빌드업 1선 — 짧고 정확한 분배 필수.",
    extraAttack: [
      "FIXO 못 받으면 ALA에게 직접 — 옵션 두 개 있음을 의식",
    ],
    linkage: [
      { position: "FIXO", note: "다이아 후방 받음. FIXO 압박당하면 ALA로 우회" },
    ],
  },
  FIXO: {
    whyItMatters: "다이아몬드의 후방 단독. 한 명이 빌드업·수비 모두 책임 — 포지셔닝 가장 중요.",
    extraAttack: [
      "ALA 두 명에게 양쪽 분배 — 다이아 회전의 출발점",
      "PIVO에게 직선 패스 — 등 지고 받은 PIVO와 벽 패스 시도",
    ],
    extraDefense: [
      "상대 PIVO 1대1 마크 — 도와줄 동료 없음, 거리 절대 안 줌",
    ],
    linkage: [
      { position: "ALA (좌·우)", note: "다이아 회전 출발 — 양쪽 ALA에게 골고루 분배" },
      { position: "PIVO", note: "직선 패스 후 PIVO가 등 지고 받음, 이어 ALA 침투" },
    ],
  },
  ALA: {
    whyItMatters: "다이아몬드의 양 측면. 회전형 풋살의 핵심 — 공수 전환 가장 빨라야 함.",
    extraAttack: [
      "FIXO에서 받아 측면 1대1 또는 PIVO와 2대1 패스",
      "반대편 ALA와 회전 — 한 명이 PIVO 자리 들어가면 다른 한 명이 측면 폭",
    ],
    extraDefense: [
      "공 잃으면 5초 안에 측면 압박 — FIXO 도움 X 단독 책임",
    ],
    linkage: [
      { position: "FIXO", note: "후방 빌드업 받음 — 측면 또는 컷인 결정" },
      { position: "PIVO", note: "벽 패스 후 박스 침투 — 2대1 마무리" },
      { position: "ALA (반대편)", note: "회전 흐름 — 한 명이 PIVO 자리 들어가면 다른 쪽 폭 잡기" },
    ],
  },
  PIVO: {
    whyItMatters: "다이아몬드 최전방. 박스 안 마무리 + 등 지고 ALA에게 벽 패스 둘 다 가능해야.",
    extraAttack: [
      "FIXO·ALA 패스 받아 턴·슈팅 또는 벽 패스 후 침투",
    ],
    extraCaution: [
      { title: "고립 위험", detail: "박스 안 단독이라 ALA 거리 멀면 패스 옵션 없음. 한 발짝 내려와 ALA 가까이" },
    ],
    linkage: [
      { position: "ALA (좌·우)", note: "벽 패스 후 침투 — 또는 ALA가 PIVO 자리로 회전 들어옴" },
      { position: "FIXO", note: "직선 패스 받음 — 등 지고 ALA 찾아주기" },
    ],
  },
};

export const FUTSAL_5_3_1_OVERRIDES: FormationOverrideMap = {
  GK: {
    whyItMatters: "3-1은 보수적 수비 형태. GK는 안정적 분배 + 클린시트가 1순위.",
    extraAttack: [
      "후방 3 FIXO 중 가장 안전한 자리에 분배",
    ],
    linkage: [
      { position: "FIXO (3명)", note: "압박 안 받는 FIXO에게 짧게 — 무리한 길게 절대 X" },
    ],
  },
  FIXO: {
    whyItMatters: "3-1의 후방 3명. 좌·중·우 분담으로 수비는 두꺼우나 빌드업이 답답함 — 한 명이 전진해야 풀림.",
    extraAttack: [
      "중앙 FIXO가 전진해 사실상 미드 역할 — 측면 FIXO 두 명이 후방 유지",
      "PIVO에게 길게 차기 — 받기 힘들면 측면 FIXO 침투",
    ],
    extraDefense: [
      "수적 우위로 PIVO·ALA 마크 — 절대 빈 자리 두지 않기",
    ],
    linkage: [
      { position: "FIXO (옆)", note: "수평 패스로 풀어내기 — 중앙 FIXO가 빌드업 진행" },
      { position: "PIVO", note: "긴 패스로 박스 안 PIVO 찾기 — 받기 힘들면 측면 FIXO 침투" },
    ],
  },
  PIVO: {
    whyItMatters: "3-1의 단독 공격수. 공격은 모두 PIVO 한 명에 의존 — 등 지고 받기·턴·결정력이 전부.",
    extraAttack: [
      "FIXO 패스 받아 등 지고 버티기 — 동료 침투 시간 벌기",
      "측면 FIXO 침투 시 컷백·벽 패스 연결",
    ],
    extraCaution: [
      { title: "단독 고립 빈도 큼", detail: "3-1은 PIVO 지원이 적음. 짧은 시간 결정 못 하면 빼앗김" },
      { title: "수비 가담 늦으면 치명적", detail: "PIVO가 첫 5초 압박 안 하면 상대 빌드업 시작됨" },
    ],
    linkage: [
      { position: "FIXO (중앙)", note: "직선 패스 받음 — 등 지고 침투 동료 찾기" },
      { position: "FIXO (측면)", note: "측면 침투 받아주기 — 컷백 받을 자리로" },
    ],
  },
};

export const FUTSAL_5_4_0_OVERRIDES: FormationOverrideMap = {
  GK: {
    whyItMatters: "4-0은 회전형 — 자리 고정 X. GK도 4명 ALA 회전에 맞춰 분배 자리 계속 변함.",
    extraAttack: [
      "회전 흐름 보고 가까운 ALA에게 — 4명 모두 옵션",
    ],
    linkage: [
      { position: "ALA (4명)", note: "후방으로 내려온 ALA에게 분배 — 회전 패턴 따라가기" },
    ],
  },
  ALA: {
    whyItMatters: "4-0은 PIVO 없는 회전형 풋살. 4명 ALA가 끊임없이 회전하며 점유 + 공수 전환. 가장 어려운 풋살 전술.",
    extraAttack: [
      "다른 ALA와 회전 — 후방 ALA가 전진하면 전방 ALA가 후방으로 내려오기",
      "박스 안 침투는 4명 중 가장 가까운 사람이 — 자리 약속 미리 합의",
      "수적 우위 만들기 위해 2명이 측면, 2명이 중앙 흐름으로 갈라지기",
    ],
    extraDefense: [
      "PIVO 부재라 박스 마무리 적음 — 수비 가담은 모두 균등",
      "회전 중 공 잃으면 가장 가까운 ALA가 즉시 압박",
    ],
    extraCaution: [
      { title: "회전 패턴 안 맞으면 혼선", detail: "약속 없이 4-0은 그냥 4명 ALA 일자 — 의미 없음. 회전 신호 합의 필수" },
      { title: "박스 마무리 부재", detail: "결정력 떨어짐 인식 — 슈팅 기회 잡으면 절대 미루지 않기" },
    ],
    linkage: [
      { position: "ALA (다른 3명)", note: "4명 모두 동등 — 회전 흐름에 따라 자리 바꾸기" },
      { position: "GK", note: "후방 분배 받음 — 자리 고정 안 하고 흐름 따라" },
    ],
  },
};

export const FUTSAL_OVERRIDES: Record<string, FormationOverrideMap> = {
  "futsal-5-2-2": FUTSAL_5_2_2_OVERRIDES,
  "futsal-5-1-2-1": FUTSAL_5_1_2_1_OVERRIDES,
  "futsal-5-3-1": FUTSAL_5_3_1_OVERRIDES,
  "futsal-5-4-0": FUTSAL_5_4_0_OVERRIDES,
};
