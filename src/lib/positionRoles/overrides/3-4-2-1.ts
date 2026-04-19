/**
 * 3-4-2-1 포메이션 오버라이드
 *
 * 슬롯: GK · LCB · CB · RCB · LWB · LCM · RCM · RWB · LAM · RAM · ST (11명)
 *
 * 특징:
 * - 스리백 + 2인 중원 + 투 섀도(LAM·RAM) + 원톱
 * - LAM·RAM이 ST 뒤 "섀도 스트라이커" 역할 — 안쪽 성향
 * - 측면 너비는 윙백(LWB·RWB) 전담
 * - 2인 중원(LCM·RCM)이 중앙 수비 + 빌드업 핵심
 */

import type { FormationOverrideMap } from "../types";

export const OVERRIDE_3421: FormationOverrideMap = {
  GK: {
    whyItMatters:
      "3-4-2-1은 **스리백 + 공격적 섀도 2명**이라 수비·공격 양극. 양 윙백 올라갈 때 뒷공간 큼 — GK 스위퍼 역할 중요. 빌드업은 CB 3명·중원 2명과 5인 출발점.",
    linkage: [
      { position: "CB", note: "사령탑 파트너." },
      { position: "LCB·RCB", note: "빌드업 좌우 경유지." },
      { position: "ST", note: "전방 롱킥 타겟." },
    ],
  },

  LCB: {
    whyItMatters:
      "3-4-2-1 LCB는 **LWB 뒷공간 커버 + 2인 중원 보조**. 중원 2명뿐이라 중앙 위협도 LCM과 함께 대응 필요.",
    extraDefense: [
      "LWB 올라간 측면 커버 + 중앙 LAM 빠진 공간 주의.",
    ],
    linkage: [
      { position: "CB", note: "스리백 중앙." },
      { position: "RCB", note: "반대 축." },
      { position: "LWB", note: "측면 파트너." },
      { position: "LCM", note: "좌측 2선 보조." },
    ],
  },

  CB: {
    whyItMatters:
      "3-4-2-1의 **수비 사령탑**. 양 윙백 + 2인 중원 위치 체크. LAM·RAM이 안쪽 섀도로 서면 중앙 커버는 CM 2명뿐 — CB가 라인 조율 책임.",
    extraCommunication: [
      "LAM·RAM 위치 체크 — 그들이 내려와 수비 보조하는지 안쪽 박스 근처 있는지에 따라 수비 압박 강도 조절.",
    ],
    linkage: [
      { position: "LCB·RCB", note: "스리백 유닛." },
      { position: "LCM·RCM", note: "2인 중원 파트너." },
      { position: "GK", note: "후방 협력." },
    ],
  },

  RCB: {
    whyItMatters:
      "LCB의 미러. **RWB 커버 + 2인 중원 보조**.",
    extraDefense: [
      "RWB 뒷공간 커버 + RAM 이동 시 중앙 보강.",
    ],
    linkage: [
      { position: "CB", note: "사령탑 파트너." },
      { position: "LCB", note: "반대 축." },
      { position: "RWB", note: "측면 파트너." },
      { position: "RCM", note: "우측 2선 보조." },
    ],
  },

  LWB: {
    whyItMatters:
      "3-4-2-1 LWB는 **좌측 측면 너비 혼자 담당**. LAM이 안쪽 성향이라 터치라인 근처는 내 몫. **팀 최고 활동량**.",
    extraAttack: [
      "**LAM과 2:1 조합** — LAM이 안쪽 치고 들어가면 내가 측면 오버래핑. 반대도 가능.",
    ],
    extraStamina: [
      "최고 활동량. 교체 고려.",
    ],
    linkage: [
      { position: "LCB", note: "수비 복귀 파트너." },
      { position: "LCM", note: "뒷공간 보조." },
      { position: "LAM", note: "공격 2:1 파트너." },
    ],
  },

  LCM: {
    whyItMatters:
      "3-4-2-1 중원 2인 좌측. **RCM과 둘이 중앙 전체 감당**. 공수 양방향 + LAM 지원. 더블 피벗 원칙 엄수.",
    extraDefense: [
      "**RCM과 동시 전진 절대 금지**. 중원 2명뿐이라 더블 피벗보다 수비 부담 큼(LAM이 섀도라 중앙 잘 안 내려옴).",
    ],
    linkage: [
      { position: "RCM", note: "중원 파트너. 교대 원칙 엄수." },
      { position: "LCB", note: "수비 연결." },
      { position: "LWB", note: "측면 연결." },
      { position: "LAM", note: "섀도 지원 파트너." },
    ],
  },

  RCM: {
    whyItMatters:
      "LCM의 미러. **중원 2인 우측 축**.",
    extraDefense: [
      "LCM과 동시 전진 금지.",
    ],
    linkage: [
      { position: "LCM", note: "파트너. 교대 원칙." },
      { position: "RCB", note: "수비 연결." },
      { position: "RWB", note: "측면 연결." },
      { position: "RAM", note: "섀도 지원." },
    ],
  },

  RWB: {
    whyItMatters:
      "LWB의 미러. **우측 측면 너비 담당**. 팀 최고 활동량.",
    extraAttack: [
      "RAM과 2:1 조합. 오버래핑 적극.",
    ],
    extraStamina: [
      "최고 활동량. 교체 고려.",
    ],
    linkage: [
      { position: "RCB", note: "수비 복귀 파트너." },
      { position: "RCM", note: "뒷공간 보조." },
      { position: "RAM", note: "공격 2:1 파트너." },
    ],
  },

  LAM: {
    whyItMatters:
      "3-4-2-1의 LAM은 **섀도 스트라이커** — ST 뒤에서 득점·어시스트 모두. 안쪽 성향이라 측면은 LWB한테 맡기고 하프 스페이스 활용.",
    extraAttack: [
      "**ST 뒤 득점 가담 빈번** — 섀도 역할. CB 2명을 ST가 끌어내면 내가 침투해서 득점.",
      "**측면은 LWB 몫**. 나는 하프 스페이스·박스 안 움직임 집중.",
    ],
    linkage: [
      { position: "ST", note: "가장 밀접 파트너. 원투·스루 패스·섀도 조합." },
      { position: "RAM", note: "반대쪽 섀도. 교차·원투로 CB 분산." },
      { position: "LWB", note: "측면 커버 상대. 내가 안쪽, LWB가 측면." },
      { position: "LCM", note: "중원 백패스 상대." },
    ],
  },

  RAM: {
    whyItMatters:
      "LAM의 미러. **우측 섀도 스트라이커**. ST 뒤에서 득점·어시스트.",
    extraAttack: [
      "ST 뒤 득점 가담. 측면은 RWB 몫.",
    ],
    linkage: [
      { position: "ST", note: "밀접 파트너." },
      { position: "LAM", note: "반대쪽 섀도." },
      { position: "RWB", note: "측면 커버 상대." },
      { position: "RCM", note: "중원 백패스." },
    ],
  },

  ST: {
    whyItMatters:
      "3-4-2-1의 원톱. **LAM·RAM 두 섀도가 뒤를 받쳐줘서 원톱 중 가장 혜택 받는 포지션**. CB 2명 끌어내고 섀도들이 득점하게 하는 게 핵심 역할.",
    extraAttack: [
      "**CB 끌어내기가 본업** — 내가 측면·아래로 움직여서 CB 한 명을 빼내면 섀도 2명이 득점.",
      "**포스트 플레이**로 섀도들 올라올 시간 벌기.",
    ],
    linkage: [
      { position: "LAM·RAM", note: "섀도 파트너. 2인이 뒤에서 득점 가담." },
      { position: "LCM·RCM", note: "롱볼 1차 수신 후 연계." },
    ],
  },
};
