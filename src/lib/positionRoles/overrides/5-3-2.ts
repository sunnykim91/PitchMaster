/**
 * 5-3-2 포메이션 오버라이드
 *
 * 슬롯: GK · LWB · LCB · CB · RCB · RWB · LCM · CM · RCM · LS · RS (11명)
 *
 * 특징:
 * - 파이브백 + 3미드 + 투톱 = 가장 수비적 + 역습형
 * - 양 윙백(LWB·RWB)이 공격 기여 포인트 — 측면 전부 담당
 * - 스리백(LCB·CB·RCB) 중앙 CB가 사령탑
 * - 투톱(LS·RS)이 역습 첨병 + 상대 CB 분산
 */

import type { FormationOverrideMap } from "../types";

export const OVERRIDE_532: FormationOverrideMap = {
  GK: {
    whyItMatters:
      "5-3-2는 **파이브백 + 3미드로 수비 웅크리기 전문**. GK는 세트피스·중거리 슛 대응이 주 업무. 빌드업은 CB 3명·윙백 통해 길게 배급.",
    extraDefense: [
      "파이브백 덕에 1:1 노출 적음. 대신 크로스 자주 허용되니 공중볼 조직이 중요.",
    ],
    linkage: [
      { position: "LCB·CB·RCB", note: "스리백 3명 전체와 백패스 연결." },
      { position: "LS·RS", note: "롱킥 타겟 2명." },
    ],
  },

  LWB: {
    whyItMatters:
      "5-3-2 LWB는 **좌측 공격 담당의 거의 전부**. 파이브백이라 수비 복귀 시 5번째 수비수가 되고, 공격 시엔 윙어 위치까지 올라감. **공수 양극단 이동이 팀 최대 활동량**.",
    extraAttack: [
      "**3-5-2 LWB보다 수비 비중이 더 커요**. 파이브백이라 복귀 실패하면 스리백처럼 보이는 순간 위기.",
    ],
    extraStamina: [
      "5-3-2 윙백 = 팀 최고 활동량 + 수비 비중 높음. 60~70분 교체 고려.",
    ],
    linkage: [
      { position: "LCB", note: "수비 복귀 파트너." },
      { position: "LCM", note: "뒷공간 보조 커버." },
      { position: "LS", note: "투톱 좌측한테 크로스 공급." },
    ],
  },

  LCB: {
    whyItMatters:
      "5-3-2 LCB는 **스리백 좌측 축**이지만 파이브백 체제라 **LWB가 수비 복귀하면 사실상 포백 LCB**. 구조 변화 빈번.",
    extraDefense: [
      "**LWB 위치에 따라 역할 변환** — LWB 올라가면 내가 측면 커버, 복귀하면 내가 중앙 LCB 위치.",
    ],
    linkage: [
      { position: "CB", note: "사령탑 파트너." },
      { position: "RCB", note: "반대 축." },
      { position: "LWB", note: "좌측 커버 파트너." },
      { position: "LCM", note: "좌측 2선 보조." },
    ],
  },

  CB: {
    whyItMatters:
      "5-3-2의 **수비 사령탑**. 스리백 중앙으로 LCB·RCB 지휘 + 양 윙백 위치 체크. 파이브백 체제이니 상대적으로 안정적이지만 **집중력이 생명**.",
    extraCommunication: [
      "**양 윙백 위치 수시 체크** — 둘 다 올라갔을 때와 복귀했을 때 수비 형태가 완전히 다름.",
    ],
    linkage: [
      { position: "LCB·RCB", note: "스리백 유닛." },
      { position: "CM", note: "빌드업 중앙 파트너." },
      { position: "GK", note: "후방 협력." },
    ],
  },

  RCB: {
    whyItMatters:
      "LCB의 미러. **RWB 위치에 따라 역할 변환**.",
    extraDefense: [
      "RWB 올라가면 측면 커버, 복귀하면 중앙 RCB 위치.",
    ],
    linkage: [
      { position: "CB", note: "사령탑 파트너." },
      { position: "LCB", note: "반대 축." },
      { position: "RWB", note: "우측 커버 파트너." },
      { position: "RCM", note: "우측 2선 보조." },
    ],
  },

  RWB: {
    whyItMatters:
      "LWB의 미러. **우측 공격 + 수비 5번째 선수**. 팀 최고 활동량. 오른발 크로스 퀄리티가 투톱 득점 공급선.",
    extraAttack: [
      "수비 비중 더 높은 윙백. 공격 가담 타이밍 신중히.",
    ],
    extraStamina: [
      "최고 활동량. 교체 고려.",
    ],
    linkage: [
      { position: "RCB", note: "수비 복귀 파트너." },
      { position: "RCM", note: "뒷공간 보조." },
      { position: "RS", note: "투톱 우측 크로스 공급." },
    ],
  },

  LCM: {
    whyItMatters:
      "5-3-2 3인 중원 좌측. **파이브백 앞에서 중앙 수비 강화** + 빌드업 + LWB 보조. 수비적 포메이션이라 공격 가담보다 수비 지원이 본업.",
    extraDefense: [
      "**LWB 뒷공간 보조 커버** + 상대 측면 공격의 중앙 전환 차단.",
    ],
    linkage: [
      { position: "CM", note: "중원 파트너." },
      { position: "RCM", note: "3각 중 반대 축." },
      { position: "LCB·LWB", note: "좌측 수비 연결." },
      { position: "LS", note: "투톱 공급자." },
    ],
  },

  CM: {
    whyItMatters:
      "5-3-2 중원 중앙. **파이브백 앞 단독 보호**. 상대 CAM·공격형 미드 차단 + 빌드업 허브. 투톱 키패스 공급도.",
    extraDefense: [
      "상대 10번·CAM 전담 마크. 내가 놓치면 파이브백이 끌려나옴.",
    ],
    linkage: [
      { position: "LCM·RCM", note: "3각 중원 파트너." },
      { position: "CB", note: "수비 2선 파트너." },
      { position: "LS·RS", note: "투톱 키패스 공급자." },
    ],
  },

  RCM: {
    whyItMatters:
      "LCM의 미러. **중원 우측 수비 강화**. RWB 보조.",
    extraDefense: [
      "RWB 뒷공간 보조 + 측면 중앙 전환 차단.",
    ],
    linkage: [
      { position: "CM", note: "중원 파트너." },
      { position: "LCM", note: "반대 축." },
      { position: "RCB·RWB", note: "우측 수비 연결." },
      { position: "RS", note: "투톱 공급자." },
    ],
  },

  LS: {
    whyItMatters:
      "5-3-2의 **투톱 좌측**. 수비적 포메이션이라 **역습 첨병 역할이 가장 큼**. 공급이 풍부하진 않으나 CB 2명 분산은 투톱 기본.",
    extraAttack: [
      "**역습 시 빠른 침투가 주 득점 루트** — 수비 견고하게 지키다 공 뺏는 순간 최대한 빨리 전방 돌격.",
      "RS와 교차·간격 유지.",
    ],
    linkage: [
      { position: "RS", note: "투톱 파트너." },
      { position: "CM·LCM", note: "키패스 공급자." },
      { position: "LWB", note: "크로스 공급자." },
    ],
  },

  RS: {
    whyItMatters:
      "LS의 미러. **투톱 우측 + 역습 첨병**.",
    extraAttack: [
      "역습 침투 + LS와 호흡.",
    ],
    linkage: [
      { position: "LS", note: "투톱 파트너." },
      { position: "CM·RCM", note: "키패스 공급자." },
      { position: "RWB", note: "크로스 공급자." },
    ],
  },
};
