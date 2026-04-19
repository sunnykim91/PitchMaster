/**
 * 4-3-2-1 "크리스마스 트리" 포메이션 오버라이드
 *
 * 슬롯: GK · LB · LCB · RCB · RB · CDM · LCM · RCM · LAM · RAM · ST (11명)
 *
 * 특징:
 * - 포백 + CDM + 2CM + 2섀도(LAM·RAM) + 원톱
 * - 중앙 밀집형. 측면 공격은 풀백(LB·RB) 오버래핑에 전적으로 의존
 * - 섀도 2명이 ST 뒤에서 창의적 플레이 — 중앙 공격 루트 다양
 * - CDM이 싱글 피벗 — 포백 앞 단독 보호
 */

import type { FormationOverrideMap } from "../types";

export const OVERRIDE_4321: FormationOverrideMap = {
  GK: {
    whyItMatters:
      "4-3-2-1은 **중앙 밀집형**. CDM이 포백 앞 지키고 섀도 2명이 중앙 창조. 측면 공격이 풀백 의존이라 빌드업 시 GK 롱킥 배급이 측면 전환 주 루트.",
    linkage: [
      { position: "LCB·RCB", note: "백패스 파트너." },
      { position: "CDM", note: "빌드업 경유지." },
      { position: "LB·RB", note: "측면 롱킥 배급 타겟 — 풀백 중심 공격 구조." },
    ],
  },

  LB: {
    whyItMatters:
      "4-3-2-1 LB는 **좌측 측면 공격의 거의 전부**. 섀도(LAM)가 안쪽 성향이라 측면 너비는 내가 책임. 오버래핑 필수.",
    extraAttack: [
      "**측면 공격 주도** — LAM이 안쪽에 들어가면 내가 터치라인 근처에서 크로스·컷백.",
    ],
    linkage: [
      { position: "LCB", note: "수비 복귀 파트너." },
      { position: "LAM", note: "좌측 공격 2:1 파트너." },
      { position: "LCM", note: "뒷공간 보조." },
      { position: "CDM", note: "중앙 커버 보강." },
    ],
  },

  LCB: {
    whyItMatters:
      "4-3-2-1 LCB는 **CDM 덕에 안정적**. 측면 공격은 LB 주도라 LB 올라간 자리 커버가 주 업무.",
    linkage: [
      { position: "RCB", note: "수비 파트너." },
      { position: "CDM", note: "2선 수비 파트너." },
      { position: "LB", note: "측면 커버." },
      { position: "GK", note: "백패스 루트." },
    ],
  },

  RCB: {
    whyItMatters:
      "LCB의 미러. **CDM 덕에 안정적**.",
    linkage: [
      { position: "LCB", note: "수비 파트너." },
      { position: "CDM", note: "2선 파트너." },
      { position: "RB", note: "측면 커버." },
      { position: "GK", note: "백패스 루트." },
    ],
  },

  RB: {
    whyItMatters:
      "LB의 미러. **우측 측면 공격 전담**. 오버래핑 필수. 오른발 크로스 품질이 섀도·ST 득점 직결.",
    extraAttack: [
      "RAM 안쪽 성향이라 측면 너비 혼자 담당.",
    ],
    linkage: [
      { position: "RCB", note: "수비 복귀 파트너." },
      { position: "RAM", note: "우측 공격 2:1 파트너." },
      { position: "RCM", note: "뒷공간 보조." },
      { position: "CDM", note: "중앙 보강." },
    ],
  },

  CDM: {
    whyItMatters:
      "4-3-2-1의 **포백 앞 단독 수비수**. 싱글 피벗으로 LCM·RCM이 전진 가담 자유. **이 자리가 흔들리면 포메이션 전체 붕괴**.",
    extraDefense: [
      "포백 앞 혼자 보호 + 좌우 풀백 뒷공간까지 커버 책임.",
    ],
    extraCommunication: [
      "포백 4명 지휘 + LCM·RCM 전진 타이밍 조율.",
    ],
    linkage: [
      { position: "LCB·RCB", note: "3인 수비 유닛 구성." },
      { position: "LCM·RCM", note: "중원 3각 중 아래. 그들 전진 때 내가 잔류." },
    ],
  },

  LCM: {
    whyItMatters:
      "4-3-2-1 3인 중원 좌측. **CDM 덕에 공격 가담 자유**. 섀도·ST 지원 + 박스 침투 가담.",
    extraAttack: [
      "박스 침투 + 섀도(LAM) 지원 + 원톱 뒤 득점 가담.",
    ],
    linkage: [
      { position: "RCM", note: "중원 파트너." },
      { position: "CDM", note: "뒷공간 보장." },
      { position: "LAM", note: "섀도 지원." },
      { position: "LB", note: "좌측 연결." },
    ],
  },

  RCM: {
    whyItMatters:
      "LCM의 미러. **중원 우측 공격 가담형**.",
    extraAttack: [
      "박스 침투 + 섀도(RAM) 지원.",
    ],
    linkage: [
      { position: "LCM", note: "중원 파트너." },
      { position: "CDM", note: "뒷공간 보장." },
      { position: "RAM", note: "섀도 지원." },
      { position: "RB", note: "우측 연결." },
    ],
  },

  LAM: {
    whyItMatters:
      "4-3-2-1의 LAM은 **전형적 섀도 스트라이커**. ST 뒤에서 득점·창조 모두. 4-2-3-1 LAM보다 **더 중앙 지향적** — 측면은 LB 몫.",
    extraAttack: [
      "**ST 뒤 박스 침투 빈번**. CB 분산시키고 득점.",
      "측면 너비는 LB가 담당 — 나는 하프 스페이스·중앙 집중.",
    ],
    linkage: [
      { position: "ST", note: "가장 밀접 파트너. 섀도 조합." },
      { position: "RAM", note: "반대쪽 섀도. 교차·원투." },
      { position: "LB", note: "측면 공격 파트너. 내가 안쪽, LB가 측면." },
      { position: "LCM", note: "중원 백패스 상대." },
    ],
  },

  RAM: {
    whyItMatters:
      "LAM의 미러. **우측 섀도**. 중앙 지향, 득점 가담.",
    extraAttack: [
      "박스 침투 + 측면은 RB 몫.",
    ],
    linkage: [
      { position: "ST", note: "밀접 파트너." },
      { position: "LAM", note: "반대쪽 섀도." },
      { position: "RB", note: "측면 파트너." },
      { position: "RCM", note: "중원 백패스." },
    ],
  },

  ST: {
    whyItMatters:
      "4-3-2-1의 원톱. **섀도 2명이 뒤에서 받쳐주는 구조**라 3-4-2-1 ST와 유사. CB 끌어내기 + 섀도 득점 공간 창출이 본업.",
    extraAttack: [
      "CB 끌어내기가 본업 — 섀도 2명이 득점.",
      "포스트 플레이로 섀도 올라올 시간 벌기.",
    ],
    linkage: [
      { position: "LAM·RAM", note: "섀도 파트너. 득점 연결 핵심." },
      { position: "LCM·RCM", note: "2선 침투 지원자." },
    ],
  },
};
