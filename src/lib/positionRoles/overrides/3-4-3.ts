/**
 * 3-4-3 포메이션 오버라이드
 *
 * 슬롯: GK · LCB · CB · RCB · LM · LCM · RCM · RM · LW · ST · RW (11명)
 *
 * 특징:
 * - 스리백 + 3톱 (가장 공격적인 포메이션 중 하나)
 * - 측면 미드(LM·RM)가 윙백 역할 겸임 — 수비 복귀 필수
 * - 2인 중앙 미드(LCM·RCM)가 중원 전부 담당 — 숫자 열세
 * - 3톱으로 상대 포백을 3명으로 압박 가능
 */

import type { FormationOverrideMap } from "../types";

export const OVERRIDE_343: FormationOverrideMap = {
  GK: {
    whyItMatters:
      "3-4-3은 **가장 공격적인 스리백**이라 **수비 뒷공간 노출 빈번**. GK 스위퍼 역할 최상급. 빌드업 시 CB 3명과 함께 후방 4인 구성 출발.",
    extraDefense: [
      "스리백 + 측면 미드 올라간 구조라 뒷공간 스루 패스 대응이 반복 업무.",
    ],
    linkage: [
      { position: "CB", note: "수비 사령탑과 협력." },
      { position: "LCB·RCB", note: "빌드업 좌우 경유지." },
      { position: "ST", note: "전방 롱킥 배급 타겟." },
    ],
  },

  LCB: {
    whyItMatters:
      "3-4-3의 LCB는 **LM이 올라간 좌측 뒷공간을 직접 커버**. 3-5-2 LCB보다 더 넓은 범위를 혼자 감당. CB·LM과 실시간 조율 필수.",
    extraDefense: [
      "LM이 올라간 상태에서 상대 윙 역습 대응은 나 혼자. 전력 복귀 속도가 경기 좌우.",
    ],
    linkage: [
      { position: "CB", note: "스리백 중앙 축." },
      { position: "RCB", note: "반대 축." },
      { position: "LM", note: "측면 커버 파트너. LM 복귀 지연 시 내가 측면 이동." },
      { position: "LCM", note: "좌측 2선 보조." },
    ],
  },

  CB: {
    whyItMatters:
      "3-4-3의 **수비 사령탑**. 양 측면 미드가 올라가고 스리백만 남는 순간이 많아 **위치 선정·콜이 결정적**. 3-5-2 CB보다 리스크 상시 노출.",
    extraCommunication: [
      "**측면 미드(LM·RM) 위치 수시 체크 + 라인 높이 조절**. 둘 다 올라간 순간을 놓치면 실점.",
    ],
    linkage: [
      { position: "LCB·RCB", note: "3인 수비 유닛. 내가 조율 책임." },
      { position: "LCM·RCM", note: "빌드업 경유지. 중원 숫자 열세라 긴밀 연결." },
      { position: "GK", note: "빌드업·커버 협력." },
    ],
  },

  RCB: {
    whyItMatters:
      "LCB의 미러. **RM 올라간 우측 커버 전담**. 오른발 크로스필드 전환 주무기.",
    extraDefense: [
      "RM 뒷공간 커버. RM 복귀 지연 시 측면 이동.",
    ],
    extraAttack: [
      "반대쪽 LM·LW 대상 대각선 전환 패스.",
    ],
    linkage: [
      { position: "CB", note: "사령탑 파트너." },
      { position: "LCB", note: "반대 축." },
      { position: "RM", note: "측면 커버 파트너." },
      { position: "RCM", note: "우측 2선 보조." },
    ],
  },

  LM: {
    whyItMatters:
      "3-4-3의 LM은 **사실상 윙백**. 공격 시 윙어처럼 높이 올라가고 수비 시 풀백 위치까지 복귀. **체력 부담 팀 최상위**.",
    extraAttack: [
      "**LW 안쪽 치고 들어갈 때 측면 오버래핑** — 3-4-3 좌측 공격의 기본 패턴.",
    ],
    extraDefense: [
      "**수비 복귀 필수**. 복귀 실패하면 LCB 혼자 측면 2명 상대.",
    ],
    extraStamina: [
      "3-4-3 측면 미드 = 윙백 수준 활동량. 60분 시점 교체 고려.",
    ],
    linkage: [
      { position: "LCB", note: "수비 복귀 파트너." },
      { position: "LCM", note: "중원 연결 + 뒷공간 보조." },
      { position: "LW", note: "공격 2:1 파트너." },
    ],
  },

  LCM: {
    whyItMatters:
      "3-4-3의 2인 중원 좌측. **중앙 숫자가 2명뿐**이라 공수 양방향 + RCM과 교대 전진 원칙이 3-5-2보다 엄격해요.",
    extraDefense: [
      "**RCM과 동시 전진 절대 금지**. 중원 2명뿐인데 둘 다 올라가면 즉시 역습 허용.",
    ],
    linkage: [
      { position: "RCM", note: "중원 파트너. 교대 원칙이 포메이션 생명." },
      { position: "LCB", note: "좌측 수비 라인 연결." },
      { position: "LM", note: "측면 미드 연결." },
      { position: "ST", note: "공격 공급자." },
    ],
  },

  RCM: {
    whyItMatters:
      "LCM의 미러. **중원 2인 우측 축**. 동시 전진 금지 원칙 엄수. 오른발 대각선 패스가 공격 전환의 한 축.",
    extraDefense: [
      "LCM과 동시 전진 금지.",
    ],
    linkage: [
      { position: "LCM", note: "파트너. 교대 원칙." },
      { position: "RCB", note: "우측 수비 연결." },
      { position: "RM", note: "측면 미드 연결." },
      { position: "ST", note: "공격 공급자." },
    ],
  },

  RM: {
    whyItMatters:
      "LM의 미러. **우측 윙백 성향의 미드**. 공격 시 RW와 2:1, 수비 시 RCB 옆까지 복귀. 체력 부담 최상위.",
    extraAttack: [
      "RW 컷인 시 측면 오버래핑.",
    ],
    extraStamina: [
      "윙백 수준 활동량. 교체 고려.",
    ],
    linkage: [
      { position: "RCB", note: "수비 복귀 파트너." },
      { position: "RCM", note: "중원 연결." },
      { position: "RW", note: "공격 2:1 파트너." },
    ],
  },

  LW: {
    whyItMatters:
      "3-4-3의 **좌측 윙어**. 3톱 일원으로 LM과 조합해 좌측 공격 주도. ST·RW와 3인 공격 삼각형 형성이 포메이션의 핵심 공격 루트.",
    extraAttack: [
      "**LM과 2:1 + ST와 원투**. 3톱 조합이 공격의 전부.",
    ],
    linkage: [
      { position: "LM", note: "2:1 파트너." },
      { position: "ST", note: "3톱 동료. 원투·컷백." },
      { position: "RW", note: "반대쪽 윙어. 파포스트 침투 파트너." },
    ],
  },

  ST: {
    whyItMatters:
      "3-4-3의 원톱이지만 **양 윙어(LW·RW)와 함께 3톱 구조**. 혼자가 아니라 2선 동료가 항상 박스에 따라 들어와 **득점 기회 다양**. 상대 CB 3명 상대지만 3톱이라 수적 우세 순간 자주.",
    extraAttack: [
      "**LW·RW와 3각 연계** — 3-4-3 공격의 정점. 내가 CB 끌어내면 윙어가 득점.",
      "**중원 2명밖에 없어 2선 침투 동료 수는 제한** — 4-3-3보다 LCM·RCM 공격 가담 빈도 낮음. 대신 윙어 의존도 높음.",
    ],
    linkage: [
      { position: "LW·RW", note: "3톱 동료. 교차·원투 핵심." },
      { position: "LCM·RCM", note: "키패스 공급자. 2명뿐이라 공급은 제한적." },
    ],
  },

  RW: {
    whyItMatters:
      "LW의 미러. **우측 윙어**. RM과 2:1 + ST와 원투. 3톱 공격의 우측 축.",
    extraAttack: [
      "RM과 2:1 + ST 원투. 3톱 조합.",
    ],
    linkage: [
      { position: "RM", note: "2:1 파트너." },
      { position: "ST", note: "3톱 동료." },
      { position: "LW", note: "파포스트 침투 파트너." },
    ],
  },
};
