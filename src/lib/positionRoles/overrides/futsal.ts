import type { FormationOverrideMap } from "../types";

/**
 * 풋살 5·6인제 포메이션별 포지션 오버라이드.
 *
 * 5인제 (GK + 4 필드, 가장 표준):
 *   - futsal-1-2-1 (Diamond)
 *   - futsal-2-1-1 (Pyramid 변형)
 *   - futsal-1-1-2 (피벗 2명)
 *   - futsal-5-2-2 (Square)
 *   - futsal-5-3-1 (3 FIXO + 1 PIVO 보수형)
 *   - futsal-5-4-0 (No Pivot 회전형)
 *
 * 6인제 (GK + 5 필드, 한국 풋살리그 변형 / 24팀 사용):
 *   - futsal-6-2-2-1
 *   - futsal-6-1-3-1
 *   - futsal-6-2-1-2
 *
 * GK 베이스는 축구와 공유. 포메이션별 override는 풋살 맥락만 추가.
 */

// ── 5인제 (GK + 4 필드) ──

export const FUTSAL_1_2_1_OVERRIDES: FormationOverrideMap = {
  GK: {
    whyItMatters: "1-2-1 다이아몬드는 FIXO 한 명에 수비 의존. GK가 빌드업 1선 — 짧고 정확한 분배 필수.",
    extraAttack: ["FIXO 못 받으면 ALA에게 직접 — 옵션 두 개 의식"],
    linkage: [{ position: "FIXO", note: "다이아 후방 받음. 압박당하면 ALA로 우회" }],
  },
  FIXO: {
    whyItMatters: "다이아몬드의 후방 단독. 한 명이 빌드업·수비 모두 책임 — 포지셔닝 가장 중요.",
    extraAttack: ["ALA 두 명에게 양쪽 분배 — 다이아 회전의 출발점", "PIVO에게 직선 패스 후 벽 패스 시도"],
    extraDefense: ["상대 PIVO 1대1 마크 — 도움 없음, 거리 절대 안 줌"],
    linkage: [
      { position: "ALA (좌·우)", note: "다이아 회전 출발 — 양쪽 ALA에게 골고루 분배" },
      { position: "PIVO", note: "직선 패스 후 PIVO 등 지고 받음, 이어 ALA 침투" },
    ],
  },
  ALA: {
    whyItMatters: "다이아몬드의 양 측면. 회전형 풋살의 핵심 — 공수 전환 가장 빨라야 함.",
    extraAttack: ["FIXO에서 받아 1대1 또는 PIVO와 2대1", "반대편 ALA와 회전 — PIVO 자리도 들어가기"],
    extraDefense: ["공 잃으면 5초 안에 측면 압박 — FIXO 도움 X 단독 책임"],
    linkage: [
      { position: "FIXO", note: "후방 빌드업 받음 — 측면 또는 컷인 결정" },
      { position: "PIVO", note: "벽 패스 후 박스 침투 — 2대1 마무리" },
      { position: "ALA (반대편)", note: "회전 흐름 — 한 명이 PIVO 자리 들어가면 다른 쪽 폭 잡기" },
    ],
  },
  PIVO: {
    whyItMatters: "다이아몬드 최전방. 박스 안 마무리 + 등 지고 ALA에게 벽 패스 둘 다 가능해야.",
    extraAttack: ["FIXO·ALA 패스 받아 턴·슈팅 또는 벽 패스 후 침투"],
    extraCaution: [{ title: "고립 위험", detail: "ALA 거리 멀면 패스 옵션 없음. 한 발짝 내려와 ALA 가까이" }],
    linkage: [
      { position: "ALA (좌·우)", note: "벽 패스 후 침투 — 또는 ALA가 PIVO 자리로 회전" },
      { position: "FIXO", note: "직선 패스 받음 — 등 지고 ALA 찾아주기" },
    ],
  },
};

export const FUTSAL_2_1_1_OVERRIDES: FormationOverrideMap = {
  GK: {
    whyItMatters: "2-1-1은 후방 2 FIXO 라인. GK 분배 옵션 두 명, 안전하게 빌드업 시작.",
    linkage: [{ position: "FIXO (좌·우)", note: "압박 덜 받는 FIXO에게 짧게" }],
  },
  FIXO: {
    whyItMatters: "후방 2명 라인. 한 명 압박당하면 다른 한 명이 즉시 받음 — 중앙 ALA 한 명을 거쳐 PIVO 연결.",
    extraAttack: ["반대편 FIXO와 가로 패스로 압박 회피", "중앙 ALA에게 빌드업 — ALA가 풋살 6인제 미드 같은 역할"],
    linkage: [
      { position: "FIXO (반대편)", note: "수평 패스로 압박 회피" },
      { position: "ALA", note: "중앙 ALA에게 — 빌드업 진행" },
      { position: "PIVO", note: "긴 패스로 박스 안 PIVO 직접 찾기 (2차 옵션)" },
    ],
  },
  ALA: {
    whyItMatters: "중앙 단독 ALA. 5인제에서 가장 활동량 큰 자리 — 회전 + 빌드업 + 박스 침투까지 1인 멀티 롤.",
    extraAttack: ["FIXO 패스 받아 PIVO 또는 측면으로 분배", "박스 안 침투해 PIVO와 2대1 만들기"],
    extraDefense: ["공 잃으면 즉시 첫 5초 압박 — 단독이라 빨리 복귀"],
    linkage: [
      { position: "FIXO (좌·우)", note: "후방에서 받아 빌드업 진행" },
      { position: "PIVO", note: "최전방 PIVO에게 마무리 패스" },
    ],
  },
  PIVO: {
    whyItMatters: "최전방 단독. ALA와의 거리 조절·등 지기 + 박스 안 마무리 모두 책임.",
    extraAttack: ["등 지고 받은 후 즉시 결정 — ALA 침투 시간 벌기"],
    extraCaution: [{ title: "고립 잦음", detail: "ALA 한 명 뿐이라 패스 옵션 적음. PIVO도 한 발짝 내려와 ALA 가까이" }],
    linkage: [
      { position: "ALA", note: "벽 패스 후 ALA 박스 침투 — 컷백 받기" },
      { position: "FIXO (좌·우)", note: "긴 패스 받기 — 등 지고 버티기" },
    ],
  },
};

export const FUTSAL_1_1_2_OVERRIDES: FormationOverrideMap = {
  GK: {
    whyItMatters: "1-1-2는 PIVO 두 명 공격 강조형. GK 분배 시 후방 단독 FIXO에게 정확히.",
    linkage: [{ position: "FIXO", note: "단독 후방에 짧게" }],
  },
  FIXO: {
    whyItMatters: "후방 단독. 1-2-1처럼 위험하나 ALA 한 명 + PIVO 두 명 구조라 빌드업 옵션 다양.",
    extraAttack: ["중앙 ALA 또는 양 PIVO에게 길게 — 두 PIVO 박스 위협"],
    extraDefense: ["상대 PIVO 1대1 마크 — 도움 없음, 거리 절대 안 줌"],
    linkage: [
      { position: "ALA", note: "중앙 ALA에게 — 빌드업 중앙 진행" },
      { position: "PIVO (좌·우)", note: "박스 안 두 명 중 가까운 쪽으로 길게" },
    ],
  },
  ALA: {
    whyItMatters: "단독 중앙 ALA. 박스 위 한 단계 위치 — 두 PIVO에게 분배 또는 직접 박스 침투.",
    extraAttack: ["좌·우 PIVO에게 분배 — 박스 안 2명 위협 만들기", "직접 침투해 3명 박스 형성"],
    linkage: [
      { position: "FIXO", note: "후방 받음" },
      { position: "PIVO (좌·우)", note: "박스 안 두 명에게 분배 — 컷백·크로스 옵션" },
    ],
  },
  PIVO: {
    whyItMatters: "박스 안 두 명. 한 명이 결정·다른 한 명이 리바운드/세컨볼. 마무리 강력형.",
    extraAttack: ["반대편 PIVO와 박스 앞 크로스·컷백", "ALA의 패스 받아 박스 안에서 즉시 슈팅"],
    extraCaution: [{ title: "두 PIVO 같은 자리", detail: "둘 다 박스 한가운데 모이면 패스 옵션 X. 좌우 폭 분리 필수" }],
    linkage: [
      { position: "PIVO (반대편)", note: "박스 앞 크로스·컷백 받음" },
      { position: "ALA", note: "중앙 ALA의 패스 — 즉시 결정" },
    ],
  },
};

export const FUTSAL_5_2_2_OVERRIDES: FormationOverrideMap = {
  GK: {
    whyItMatters: "2-2 박스. 후방 2명·전방 2명 좌우 대칭 — GK는 좌우 어느쪽이든 가까운 쪽으로 안전 분배.",
    linkage: [{ position: "FIXO (좌·우)", note: "양쪽 모두 옵션 — 압박 덜 받는 쪽" }],
  },
  FIXO: {
    whyItMatters: "2-2는 좌우 FIXO 두 명이 후방 라인. 한 명 압박당하면 다른 한 명이 즉시 받쳐야 빌드업 끊기지 않음.",
    extraAttack: ["반대편 FIXO와 가로 패스 — 상대 압박 흐름 흔들기", "PIVO 한 명에게 대각선 길게 — 측면 끌어내기"],
    extraDefense: ["상대 PIVO 등 뒤 공간 막기 — 두 FIXO가 한 명씩 마크"],
    linkage: [
      { position: "FIXO (반대편)", note: "수평 패스로 압박 회피" },
      { position: "PIVO (같은 쪽)", note: "측면 라인 PIVO에게 대각선 — 2대1 시도" },
    ],
  },
  PIVO: {
    whyItMatters: "2-2는 PIVO 두 명이 측면 전방. ALA 부재라 측면 폭과 박스 마무리 모두 PIVO가 책임.",
    extraAttack: ["FIXO에서 받아 라인 끝까지 침투 또는 컷인 슈팅", "반대편 PIVO와 박스 앞 크로스·컷백"],
    extraCaution: [{ title: "두 PIVO가 같은 자리", detail: "둘 다 박스 안 모이면 패스 옵션 없음. 한 명은 라인 폭 잡기" }],
    linkage: [
      { position: "FIXO (같은 쪽)", note: "후방 빌드업 받아 침투" },
      { position: "PIVO (반대편)", note: "박스 앞 크로스·컷백 받음" },
    ],
  },
};

export const FUTSAL_5_3_1_OVERRIDES: FormationOverrideMap = {
  GK: {
    whyItMatters: "3-1은 보수적 수비. 후방 3 FIXO 중 안전한 자리에 분배 — 무리한 길게 X.",
    linkage: [{ position: "FIXO (3명)", note: "압박 덜 받는 FIXO에게 짧게" }],
  },
  FIXO: {
    whyItMatters: "3-1의 후방 3명. 좌·중·우 분담으로 수비는 두꺼우나 빌드업이 답답함 — 중앙 FIXO가 전진해야 풀림.",
    extraAttack: ["중앙 FIXO가 전진해 미드 역할 — 측면 두 FIXO는 후방 유지", "PIVO에게 길게 또는 측면 FIXO 침투"],
    extraDefense: ["수적 우위로 PIVO·ALA 마크 — 절대 빈 자리 두지 않기"],
    linkage: [
      { position: "FIXO (옆)", note: "수평 패스로 풀어내기 — 중앙 FIXO 빌드업" },
      { position: "PIVO", note: "긴 패스로 박스 PIVO 찾기" },
    ],
  },
  PIVO: {
    whyItMatters: "3-1의 단독 공격수. 공격은 모두 PIVO 한 명에 의존 — 등 지기·턴·결정력 전부.",
    extraAttack: ["FIXO 패스 받아 등 지고 버티기 — 동료 침투 시간 벌기", "측면 FIXO 침투 시 컷백·벽 패스 연결"],
    extraCaution: [
      { title: "단독 고립 빈도 큼", detail: "PIVO 지원 적음. 짧은 시간 결정 못 하면 빼앗김" },
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
    linkage: [{ position: "ALA (4명)", note: "후방으로 내려온 ALA에게 분배 — 회전 패턴 따라가기" }],
  },
  ALA: {
    whyItMatters: "4-0은 PIVO 없는 회전형 풋살. 4명 ALA가 끊임없이 회전하며 점유 + 공수 전환. 가장 어려운 풋살 전술.",
    extraAttack: [
      "다른 ALA와 회전 — 후방 ALA가 전진하면 전방 ALA가 후방으로 내려오기",
      "박스 안 침투는 4명 중 가장 가까운 사람이 — 자리 약속 미리 합의",
      "수적 우위 만들기 위해 2명이 측면, 2명이 중앙 흐름으로 갈라지기",
    ],
    extraDefense: ["PIVO 부재라 박스 마무리 적음 — 수비 가담은 모두 균등", "회전 중 공 잃으면 가장 가까운 ALA가 즉시 압박"],
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

// ── 6인제 (GK + 5 필드, 한국 풋살리그 변형) ──

export const FUTSAL_6_2_2_1_OVERRIDES: FormationOverrideMap = {
  GK: {
    whyItMatters: "6인제 2-2-1. GK는 후방 2 FIXO에게 안전 분배 — 한 명에 PIVO 압박 들어와도 다른 한 명 자유.",
    linkage: [{ position: "FIXO (좌·우)", note: "양쪽 모두 옵션 — 압박 덜 받는 쪽" }],
  },
  FIXO: {
    whyItMatters: "6인제는 5인제보다 한 명 여유 — 2 FIXO + 2 ALA로 미드까지 두꺼움. FIXO 한 명 전진해 사실상 3-2 같은 흐름도 가능.",
    extraAttack: ["반대편 FIXO와 수평 패스 — 압박 회피", "ALA에게 측면 분배 — 측면 폭 활용"],
    extraDefense: ["상대 ALA·PIVO 동선 따라 마크 분담"],
    linkage: [
      { position: "FIXO (반대편)", note: "수평 패스로 압박 회피" },
      { position: "ALA (같은 쪽)", note: "측면 ALA에게 빌드업 — 2대1 또는 1대1" },
    ],
  },
  ALA: {
    whyItMatters: "6인제 2-2-1의 측면 ALA. FIXO 받쳐주고 PIVO와 박스 앞 연계 — 5인제보다 활동 부담 분담됨.",
    extraAttack: ["측면 1대1 또는 컷인 후 PIVO에게 컷백", "반대편 ALA와 회전 — 한 명이 PIVO 자리 들어가면 다른 한 명이 폭"],
    extraDefense: ["측면 ALA 1대1 마크 — 라인 끝까지 따라붙음"],
    linkage: [
      { position: "FIXO (같은 쪽)", note: "후방 빌드업 받음" },
      { position: "PIVO", note: "박스 앞 크로스·컷백" },
      { position: "ALA (반대편)", note: "회전 — 한쪽 들어가면 다른 쪽 폭 잡기" },
    ],
  },
  PIVO: {
    whyItMatters: "6인제 단독 PIVO. 박스 안 마무리 + ALA와 벽 패스 — 5인제 1-2-1보다 ALA 지원 두꺼움.",
    extraAttack: ["ALA 패스 받아 등 지고 결정 또는 벽 패스 후 침투"],
    linkage: [
      { position: "ALA (좌·우)", note: "벽 패스 후 박스 침투 — 컷백 받기" },
      { position: "FIXO", note: "긴 패스 받음 — 등 지고 버티기" },
    ],
  },
};

export const FUTSAL_6_1_3_1_OVERRIDES: FormationOverrideMap = {
  GK: {
    whyItMatters: "6인제 1-3-1 다이아 변형. 후방 단독 FIXO — GK가 첫 패스 정확해야 빌드업 살아남.",
    linkage: [{ position: "FIXO", note: "후방 단독에 짧게 — 무리한 길게 절대 X" }],
  },
  FIXO: {
    whyItMatters: "6인제 1-3-1은 후방 단독 FIXO + ALA 3명 + PIVO 1명. 5인제 1-2-1보다 ALA 한 명 더 — 빌드업 옵션 풍부.",
    extraAttack: ["좌·중·우 ALA 3명 중 가장 자유로운 사람에게 분배", "PIVO에게 직선 — 등 지고 받아 ALA 침투"],
    extraDefense: ["상대 PIVO 1대1 — 단독이라 거리 절대 X"],
    linkage: [
      { position: "ALA (3명)", note: "3명 중 자유로운 사람에게 분배" },
      { position: "PIVO", note: "직선 패스 후 벽 패스 시도" },
    ],
  },
  ALA: {
    whyItMatters: "6인제 1-3-1 ALA 3명. 좌·중·우 분담 — 좌우 ALA는 측면 폭, 중앙 ALA는 PIVO와 연계.",
    extraAttack: ["좌·우 ALA: 측면 1대1 + 크로스·컷백", "중앙 ALA: PIVO와 2대1 또는 직접 박스 침투"],
    extraDefense: ["상대 ALA 마크 — 3명이라 자기 영역 명확"],
    linkage: [
      { position: "FIXO", note: "후방 받음" },
      { position: "ALA (다른 2명)", note: "회전·연계 — 빈 자리 메우기" },
      { position: "PIVO", note: "박스 앞 크로스·컷백 또는 벽 패스" },
    ],
  },
  PIVO: {
    whyItMatters: "6인제 1-3-1 단독 PIVO. ALA 3명 지원이라 5인제보다 패스 옵션 많음.",
    extraAttack: ["ALA 3명 중 가까운 사람과 벽 패스", "박스 안 등 지고 받아 즉시 결정"],
    linkage: [
      { position: "ALA (좌·중·우)", note: "3명 중 가까운 사람과 벽 패스" },
      { position: "FIXO", note: "직선 긴 패스 받음" },
    ],
  },
};

export const FUTSAL_6_2_1_2_OVERRIDES: FormationOverrideMap = {
  GK: {
    whyItMatters: "6인제 2-1-2 변형. 후방 2 FIXO + 중앙 ALA 1 + 전방 PIVO 2 — 박스 안 두 명 마무리 강조형.",
    linkage: [{ position: "FIXO (좌·우)", note: "양쪽 모두 옵션" }],
  },
  FIXO: {
    whyItMatters: "후방 2명. 안정적 빌드업 + 중앙 ALA 한 명 거쳐 PIVO 두 명에게 연결.",
    extraAttack: ["중앙 ALA에게 빌드업 — 모든 공격이 중앙 ALA 거쳐", "PIVO에게 길게 — 박스 안 두 명 위협"],
    extraDefense: ["좌·우 분담 마크"],
    linkage: [
      { position: "ALA", note: "중앙 ALA에게 — 빌드업 중심" },
      { position: "PIVO (좌·우)", note: "긴 패스로 박스 안 PIVO" },
    ],
  },
  ALA: {
    whyItMatters: "6인제 2-1-2 단독 중앙 ALA. 빌드업 핵심 + 두 PIVO에게 분배 — 가장 활동량 큰 자리.",
    extraAttack: ["FIXO 패스 받아 좌·우 PIVO 분배", "직접 박스 침투해 3명 박스 형성"],
    extraDefense: ["공 잃으면 즉시 첫 5초 압박 — 단독이라 빨리 복귀"],
    linkage: [
      { position: "FIXO (좌·우)", note: "후방 받음" },
      { position: "PIVO (좌·우)", note: "박스 안 두 명에게 분배" },
    ],
  },
  PIVO: {
    whyItMatters: "박스 안 두 명. 한 명이 결정·다른 한 명이 리바운드/세컨볼. 마무리 강력형.",
    extraAttack: ["반대편 PIVO와 박스 앞 크로스·컷백", "ALA의 패스 받아 박스 안에서 즉시 슈팅"],
    extraCaution: [{ title: "두 PIVO 같은 자리", detail: "둘 다 박스 한가운데 모이면 패스 옵션 X. 좌우 폭 분리 필수" }],
    linkage: [
      { position: "PIVO (반대편)", note: "박스 앞 크로스·컷백 받음" },
      { position: "ALA", note: "중앙 ALA의 패스 — 즉시 결정" },
    ],
  },
};

export const FUTSAL_OVERRIDES: Record<string, FormationOverrideMap> = {
  // 5인제
  "futsal-1-2-1": FUTSAL_1_2_1_OVERRIDES,
  "futsal-2-1-1": FUTSAL_2_1_1_OVERRIDES,
  "futsal-1-1-2": FUTSAL_1_1_2_OVERRIDES,
  "futsal-5-2-2": FUTSAL_5_2_2_OVERRIDES,
  "futsal-5-3-1": FUTSAL_5_3_1_OVERRIDES,
  "futsal-5-4-0": FUTSAL_5_4_0_OVERRIDES,
  // 6인제
  "futsal-6-2-2-1": FUTSAL_6_2_2_1_OVERRIDES,
  "futsal-6-1-3-1": FUTSAL_6_1_3_1_OVERRIDES,
  "futsal-6-2-1-2": FUTSAL_6_2_1_2_OVERRIDES,
};
