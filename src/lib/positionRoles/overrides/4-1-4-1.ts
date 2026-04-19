/**
 * 4-1-4-1 포메이션 오버라이드
 *
 * 슬롯: GK · LB · LCB · RCB · RB · CDM · LM · LCM · RCM · RM · ST (11명)
 *
 * 특징:
 * - 싱글 피벗(CDM) + 4인 미드 라인 + 원톱
 * - 수비 안정성 강함. 공격 시 4-3-3으로 변형 가능
 * - CDM이 포백 앞 단독 보호 — 이 자리가 핵심
 * - 4인 미드 라인(LM·LCM·RCM·RM)이 공격 가담 + 수비 라인 형성
 */

import type { FormationOverrideMap } from "../types";

export const OVERRIDE_4141: FormationOverrideMap = {
  GK: {
    whyItMatters:
      "4-1-4-1은 **수비 안정형 포메이션**이라 GK 업무 중 수비 지휘 비중이 큼. CDM이 앞에 있어서 CB로 오는 압박 적음 — 빌드업 여유.",
    extraDefense: [
      "CDM이 1차 보호해주니 GK 스위퍼 역할 빈도는 4-3-3보다 적음. 대신 집중력·선방이 더 중요.",
    ],
    linkage: [
      { position: "LCB·RCB", note: "백패스·빌드업 1순위." },
      { position: "CDM", note: "빌드업 2차 경유지. CDM이 받아서 전방 연결." },
      { position: "ST", note: "롱킥 전방 타겟." },
    ],
  },

  LB: {
    whyItMatters:
      "4-1-4-1 LB는 **LM이 측면 미드로 앞에 서 있어서 수비 부담이 덜한 편**. 오버래핑 자유도 높음. CDM이 뒤를 받쳐주니 올라가기 편함.",
    extraAttack: [
      "LM과 좌측 공격 2인. 오버래핑 적극 시도 가능.",
    ],
    linkage: [
      { position: "LCB", note: "수비 파트너." },
      { position: "LM", note: "측면 공격 연계." },
      { position: "CDM", note: "내 자리 비어도 CDM이 중앙 보강." },
    ],
  },

  LCB: {
    whyItMatters:
      "4-1-4-1 LCB는 **CDM 덕에 중앙 압박 부담이 덜함**. 빌드업 시 CDM·CB 3인 출발점 구성 자주. 원톱 상대로 2:1 수적 우세.",
    extraAttack: [
      "**CDM 내려오면 3인 후방 라인** — 빌드업 시 여유 확보.",
    ],
    linkage: [
      { position: "RCB", note: "수비 파트너." },
      { position: "CDM", note: "빌드업·수비 2선 파트너. 4-1-4-1의 핵심 연결고리." },
      { position: "LB", note: "측면 커버." },
      { position: "GK", note: "백패스 루트." },
    ],
  },

  RCB: {
    whyItMatters:
      "LCB의 미러. **CDM 덕에 안정적**. 오른발 크로스필드 패스로 반대쪽 LM 쪽 전환.",
    linkage: [
      { position: "LCB", note: "수비 파트너." },
      { position: "CDM", note: "핵심 연결고리." },
      { position: "RB", note: "측면 커버." },
      { position: "GK", note: "백패스 루트." },
    ],
  },

  RB: {
    whyItMatters:
      "LB의 미러. **RM 덕에 수비 부담 덜고 오버래핑 적극**. CDM이 뒤를 커버해주는 구조.",
    extraAttack: [
      "RM과 우측 공격 2인. 오버래핑 자주.",
    ],
    linkage: [
      { position: "RCB", note: "수비 파트너." },
      { position: "RM", note: "측면 공격 연계." },
      { position: "CDM", note: "중앙 커버 보강." },
    ],
  },

  CDM: {
    whyItMatters:
      "4-1-4-1의 **핵심 포지션**. 싱글 피벗으로 포백 앞 단독 보호 + 빌드업 허브. 이 자리가 흔들리면 포메이션 전체 붕괴. **판단력·위치 선정 최고 수준 필요**.",
    extraDefense: [
      "**혼자 포백 앞 전부 커버** — 좌우 LB/RB 뒷공간까지 모두 내 책임 구역.",
    ],
    extraCommunication: [
      "**포백 4명 전체 지휘**. 라인 조절·마크 배분 콜 빈번.",
    ],
    linkage: [
      { position: "LCB·RCB", note: "함께 3인 수비 유닛. 수비 위기 시 CB 사이로 내려와 임시 스리백." },
      { position: "LCM·RCM", note: "중원 4명 중 안쪽 2명. 공격 전환 경유지." },
    ],
  },

  LM: {
    whyItMatters:
      "4-1-4-1의 LM은 **순수 측면 미드**. 공수 겸비. 4-4-2 LM과 비슷하지만 **원톱이라 크로스보다 득점 가담 압력이 더 높음**.",
    extraAttack: [
      "**박스 침투 적극**. 원톱 ST만으로 득점 부족 — 측면 미드도 득점 가담.",
    ],
    linkage: [
      { position: "LB", note: "측면 2인 공격 파트너." },
      { position: "LCM", note: "중앙 연결." },
      { position: "ST", note: "크로스·스루 패스 공급." },
    ],
  },

  LCM: {
    whyItMatters:
      "4-1-4-1 중원 4인 중 좌측 중앙. **CDM이 뒤를 받쳐주니 공격 가담 자유도 높음**. 박스 침투·키패스 공급이 본업.",
    extraAttack: [
      "**박스 침투 적극 + 원톱 뒤 2선 득점 가담**. CDM이 뒤 지켜주니 안심.",
    ],
    linkage: [
      { position: "RCM", note: "중원 파트너. 4-4-2 LCM·RCM보다 공격 비중 더 높음." },
      { position: "CDM", note: "뒷공간 보장. 내가 올라가도 CDM이 커버." },
      { position: "LM", note: "좌측 연결." },
      { position: "ST", note: "스루 패스·키패스 공급." },
    ],
  },

  RCM: {
    whyItMatters:
      "LCM의 미러. **중원 우측 공격형**. CDM 덕에 전진 가담 자유. 오른발 대각선 패스 분배.",
    extraAttack: [
      "박스 침투 + 2선 득점.",
    ],
    linkage: [
      { position: "LCM", note: "중원 파트너." },
      { position: "CDM", note: "뒷공간 보장." },
      { position: "RM", note: "우측 연결." },
      { position: "ST", note: "키패스 공급." },
    ],
  },

  RM: {
    whyItMatters:
      "LM의 미러. **우측 측면 미드**. 공수 겸비 + 박스 침투 득점 가담 필수.",
    linkage: [
      { position: "RB", note: "측면 2인 공격 파트너." },
      { position: "RCM", note: "중앙 연결." },
      { position: "ST", note: "크로스·스루 패스 공급." },
    ],
  },

  ST: {
    whyItMatters:
      "4-1-4-1의 원톱. **혼자 CB 2명 상대**. 측면 미드(LM·RM)와 중앙 미드(LCM·RCM)가 2선에서 가담해주지만 **기본적으로 외로운 자리**. 포스트 플레이 + 공간 만들기가 핵심.",
    extraAttack: [
      "**측면 미드·중앙 미드가 2선 침투로 득점 도움** — 그들 움직임에 맞춰 CB 끌어내기.",
    ],
    linkage: [
      { position: "LCM·RCM", note: "2선 득점 파트너. 공간 만들어주면 그들이 박스로 들어옴." },
      { position: "LM·RM", note: "측면 크로스 공급자." },
      { position: "CDM", note: "롱볼·포스트 플레이 1차 수신 후 내려찍기 대상." },
    ],
  },
};
