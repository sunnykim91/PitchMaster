/**
 * 4-4-2 포메이션 오버라이드
 *
 * 슬롯: GK · LB · LCB · RCB · RB · LM · LCM · RCM · RM · LS · RS (11명)
 *
 * 특징:
 * - 가장 전통적인 포메이션. 밸런스형
 * - 중앙 미드 2명(LCM·RCM)이 공수 전부 담당
 * - 투톱(LS·RS)으로 상대 CB 2명 분산
 * - 양 측면 미드필더(LM·RM)가 공수 겸임
 */

import type { FormationOverrideMap } from "../types";

export const OVERRIDE_442: FormationOverrideMap = {
  GK: {
    whyItMatters:
      "4-4-2는 **구조가 단순한 만큼 GK의 롱킥 배급 품질이 공격 시작을 좌우**해요. 투톱이라 전방에 도달할 목표가 둘이니 롱킥 성공률이 더 높아요. 짧은 빌드업 시엔 4백과 두 센터 미드의 간격 유지도 함께 지휘.",
    linkage: [
      { position: "LCB·RCB", note: "백패스·빌드업 1순위 파트너." },
      { position: "LS·RS", note: "롱킥 배급 타겟 2명. 누구 머리·가슴으로 보낼지 경기 전 합의." },
      { position: "LB·RB", note: "측면 롱킥 대안. 압박 받을 때 양쪽 풀백으로 길게." },
    ],
  },

  LB: {
    whyItMatters:
      "4-4-2 LB는 **LM과 2인 1조로 좌측 측면 공수 전담**. LM이 수비 가담도 해주는 구조라 풀백 부담이 4-3-3·4-2-3-1보다 적어요. 대신 투톱 공격이라 공격 가담 시 박스 안 수신자 수를 늘려주는 역할.",
    extraAttack: [
      "**오버래핑 후 크로스**가 투톱 공격의 핵심 루트. LS·RS 박스 위치 확인 후 크로스 궤적 결정.",
    ],
    linkage: [
      { position: "LCB", note: "수비 커버 파트너." },
      { position: "LM (좌측 미드)", note: "2인 1조 측면 담당. LM이 수비 내려오면 내가 올라가는 구조." },
      { position: "LCM", note: "공격 안 풀릴 때 백패스 재전개 상대." },
    ],
  },

  LCB: {
    whyItMatters:
      "4-4-2의 LCB는 **중앙 미드 2명(LCM·RCM) 바로 뒤**. 미드가 뚫리면 바로 위험 구역 노출이라 수비 라인 조율·커버가 핵심. 투톱 상대할 일이 많은 포메이션이라 ST 한 명 전담 마크가 기본.",
    extraDefense: [
      "**상대 투톱 중 한 명(주로 내 쪽) 고정 마크**. RCB가 반대쪽 담당. 상대 ST 교차 움직임 시 \"스위치!\" 콜로 빠르게 교환.",
    ],
    linkage: [
      { position: "RCB", note: "가장 가까운 파트너. 간격·전진 교대." },
      { position: "LCM", note: "빌드업 1순위 경유지. LCM 막히면 RCB로." },
      { position: "LB", note: "측면 커버 파트너." },
      { position: "GK", note: "백패스 안전 루트." },
    ],
  },

  RCB: {
    whyItMatters:
      "LCB의 미러. **RCM 뒤 공간 수비**. 투톱 상대 시 RS·LS 중 한 명(주로 내 쪽) 전담 마크. 오른발 크로스필드 패스로 LB 쪽 전환 주무기.",
    extraDefense: [
      "상대 투톱 중 반대쪽 ST 마크. LCB와 \"내 거\" / \"네 거\" 상시 정리.",
    ],
    linkage: [
      { position: "LCB", note: "수비 파트너." },
      { position: "RCM", note: "빌드업 1순위 우측 경유지." },
      { position: "RB", note: "측면 커버 파트너." },
      { position: "GK", note: "백패스 루트." },
    ],
  },

  RB: {
    whyItMatters:
      "LB의 미러. **RM과 2인 1조로 우측 공수**. RM이 수비 가담해줘서 4-2-3-1·4-3-3보다 오버래핑 여유가 조금 더 있어요. 오른발 크로스 품질이 투톱 득점 루트 핵심.",
    extraAttack: [
      "오버래핑 후 낮고 빠른 크로스 or 컷백 — 투톱이 박스 중앙을 먼저 점거하게.",
    ],
    linkage: [
      { position: "RCB", note: "수비 커버." },
      { position: "RM", note: "2인 1조 측면 파트너." },
      { position: "RCM", note: "공격 안 풀릴 때 재전개 상대." },
    ],
  },

  LM: {
    whyItMatters:
      "4-4-2 LM은 **순수 윙어가 아니라 공수 겸비 측면 미드**. 공격 시 크로스·2:1 만들기, 수비 시 LB와 2인 측면 방어. LW(4-3-3)만큼 공격 자유도는 없지만 체력 부담도 상대적으로 덜해요.",
    extraDefense: [
      "**LB와 2:2 측면 유닛** — LB 혼자가 아니라 나와 2인 1조. 상대 풀백+윙 2명 상대가 기본.",
    ],
    linkage: [
      { position: "LB", note: "측면 수비·공격 2인 파트너. 교대 전진 원칙." },
      { position: "LCM", note: "중앙 연결 다리." },
      { position: "LS", note: "크로스·스루 패스 수신자." },
    ],
  },

  LCM: {
    whyItMatters:
      "4-4-2의 **중앙 미드 2명 중 하나로 수비·공격·빌드업 모두 담당**. RCM과 둘이서 중앙 전체를 감당해야 해서 활동량과 판단력이 팀 심장. 한 명이 공격 가담하면 한 명은 뒤에 남는 원칙 엄수.",
    extraAttack: [
      "**박스-투-박스 움직임**. 박스까지 침투해 득점 가담도, 포백 앞 2선 보호도 상황 따라.",
    ],
    extraDefense: [
      "**RCM과 동시 전진 절대 금지**. 둘 중 한 명은 반드시 수비형 미드처럼 잔류. 안 그러면 CB가 고립.",
    ],
    linkage: [
      { position: "RCM", note: "파트너. 교대 전진·잔류. 호흡이 포메이션의 생명." },
      { position: "LCB", note: "수비 연결. 압박 받으면 내려와 CB 옆에." },
      { position: "LM", note: "좌측 측면 연결." },
      { position: "LS·RS", note: "투톱한테 결정적 패스 공급자." },
    ],
  },

  RCM: {
    whyItMatters:
      "LCM의 미러. **중앙 2인 미드의 우측 축**. 공수 양방향 + 오른발 대각선 전환 패스가 강점. LCM과 교대 전진 원칙이 포메이션 생명.",
    extraAttack: [
      "박스-투-박스 + 오른발 장거리 패스로 좌측 LW/LM 쪽 전환.",
    ],
    extraDefense: [
      "LCM과 동시 전진 금지. 한 명 잔류 원칙.",
    ],
    linkage: [
      { position: "LCM", note: "파트너. 교대 원칙 엄수." },
      { position: "RCB", note: "수비 연결." },
      { position: "RM", note: "우측 측면 연결." },
      { position: "LS·RS", note: "결정적 패스 공급." },
    ],
  },

  RM: {
    whyItMatters:
      "LM의 미러. **RB와 2인 1조 우측 측면**. 공수 겸비로 순수 윙어와 다르게 수비 부담도 있음. 오른발 크로스가 투톱 득점 루트의 한 축.",
    extraDefense: [
      "RB와 2:2 측면 방어 유닛.",
    ],
    linkage: [
      { position: "RB", note: "2인 1조 측면 파트너." },
      { position: "RCM", note: "중앙 연결." },
      { position: "RS", note: "크로스 수신자." },
    ],
  },

  LS: {
    whyItMatters:
      "4-4-2의 **간판 투톱 좌측**. RS와 간격 유지하면서 상대 CB 2명 분산이 공격의 전부라 해도 과언 아님. 2인 교차 움직임·원투 연계가 투톱의 진수.",
    extraAttack: [
      "**RS와 좌우 간격 + 수직 간격**. 같은 공간에 서면 투톱 의미 없음.",
      "**측면 미드(LM) 크로스 수신이 주 득점 루트**. 박스 안 니어·파 포스트 사전 분담.",
    ],
    linkage: [
      { position: "RS", note: "투톱 파트너. 교차·간격·호흡이 득점 직결." },
      { position: "LM", note: "크로스 공급원. 움직임 방향 알려주기." },
      { position: "LCM", note: "스루 패스 공급자." },
    ],
  },

  RS: {
    whyItMatters:
      "LS의 파트너. **투톱 우측**에서 상대 LCB 고정 마크 + 득점·어시스트. 투톱 호흡이 포메이션의 핵심.",
    extraAttack: [
      "LS와 좌우·수직 간격 유지. 교차 움직임으로 CB 마크 혼선.",
      "RM 크로스 수신. 박스 안 위치 분담.",
    ],
    linkage: [
      { position: "LS", note: "투톱 파트너. 호흡·간격·교차." },
      { position: "RM", note: "크로스 공급원." },
      { position: "RCM", note: "스루 패스 공급자." },
    ],
  },
};
