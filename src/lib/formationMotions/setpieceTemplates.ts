/**
 * 세트피스 시나리오 표준 배치 템플릿.
 *
 * 좌표계: viewBox 0~100, y=0이 상대 골대(위) / y=100이 우리 골대(아래).
 *
 * 11좌표 구성 (사용자 결정 2026-05-15):
 *  · 박스 안 4명: 골문 앞 헤더·세컨드 노리는 공격라인
 *  · 박스 밖 2명: 컷백·리바운드 노리는 미드라인
 *  · 키커 1명: 시나리오 위치
 *  · GK 1명: 자기 골대 살짝 앞
 *  · 센터백 2명: 중앙선 인근
 *  · 반대편 윙백 1명: 키커 반대편 + 센터백보다 살짝 앞
 *
 * 슬롯 매핑 (사용자 결정 - 슬롯 ID는 포메이션 약어 그대로 C 옵션):
 *  포메이션 슬롯 11개를 y값 오름차순 정렬 후 좌표 11개에 1:1 매핑.
 *  사용자가 첫 컷 생성 후 드래그로 미세 조정.
 */

export const SETPIECE_SCENARIOS = ["RIGHT_CORNER", "LEFT_CORNER", "ATTACKING_FREEKICK"] as const;
export type SetpieceScenario = (typeof SETPIECE_SCENARIOS)[number];

export const SETPIECE_SCENARIO_LABEL: Record<SetpieceScenario, string> = {
  RIGHT_CORNER: "우측 코너킥 (공격)",
  LEFT_CORNER: "좌측 코너킥 (공격)",
  ATTACKING_FREEKICK: "공격 프리킥",
};

/** 좌표 1개 — 슬롯 매핑 결과 위치 */
export interface SetpiecePoint {
  x: number;
  y: number;
}

/** 시나리오별 11좌표 + 공 위치
 *
 * 좌표 순서(y값 오름차순 정렬된 포메이션 슬롯이 1:1 매핑됨):
 *  [0]   가장 전방 (보통 ST·CF 등 최전방 공격수)
 *  [1~3] 공격 미드라인 (LAM·CAM·RAM 등)
 *  [4~5] 수비형 미드 (LDM·RDM 등)
 *  [6~7] 풀백 (LB·RB)
 *  [8~9] 센터백 (LCB·RCB)
 *  [10]  GK
 */
export const SETPIECE_TEMPLATES: Record<SetpieceScenario, {
  ball: SetpiecePoint;
  /** 11좌표 (포메이션 슬롯 y정렬 후 인덱스 0~10에 매핑) */
  positions: [SetpiecePoint, SetpiecePoint, SetpiecePoint, SetpiecePoint, SetpiecePoint, SetpiecePoint, SetpiecePoint, SetpiecePoint, SetpiecePoint, SetpiecePoint, SetpiecePoint];
}> = {
  RIGHT_CORNER: {
    ball: { x: 98, y: 3 },
    positions: [
      // 박스 안 4명 (y=8~16)
      { x: 50, y: 10 },  // [0] 최전방 ST → 박스 안 중앙
      { x: 40, y: 8 },   // [1] LAM 등 → 박스 안 좌측
      { x: 60, y: 8 },   // [2] CAM 등 → 박스 안 우측 (키커 옆 헤더)
      { x: 50, y: 16 },  // [3] RAM 등 → 박스 안 후방
      // 박스 밖 2명 (y=22~26)
      { x: 35, y: 24 },  // [4] LDM 등 → 컷백 좌측
      { x: 65, y: 24 },  // [5] RDM 등 → 컷백 우측
      // 키커 1명 + 반대편 윙백 1명
      { x: 98, y: 6 },   // [6] LB 등 풀백 1 → 키커 위치 (인덱스 6~7 중 우측 키커)
      { x: 25, y: 48 },  // [7] RB 등 풀백 2 → 반대편(좌측) 윙백
      // 센터백 2명 (y=55, 중앙선 인근)
      { x: 45, y: 55 },  // [8] LCB
      { x: 55, y: 55 },  // [9] RCB
      // GK (자기 골대 살짝 앞)
      { x: 50, y: 88 },  // [10] GK
    ],
  },
  LEFT_CORNER: {
    ball: { x: 2, y: 3 },
    positions: [
      // 박스 안 4명 (대칭)
      { x: 50, y: 10 },
      { x: 60, y: 8 },
      { x: 40, y: 8 },
      { x: 50, y: 16 },
      // 박스 밖 2명
      { x: 65, y: 24 },
      { x: 35, y: 24 },
      // 키커(좌측 코너) + 반대편(우측) 윙백
      { x: 2, y: 6 },
      { x: 75, y: 48 },
      // 센터백 2명
      { x: 55, y: 55 },
      { x: 45, y: 55 },
      // GK
      { x: 50, y: 88 },
    ],
  },
  ATTACKING_FREEKICK: {
    // 공격 프리킥 — 중앙 박스 근처(상대 페널티 박스 앞 ~5m)
    ball: { x: 50, y: 24 },
    positions: [
      // 박스 안 4명 (수비벽 너머 헤더·세컨드 노리는)
      { x: 50, y: 10 },
      { x: 40, y: 12 },
      { x: 60, y: 12 },
      { x: 50, y: 18 },
      // 박스 밖 2명 (수비벽 양옆 컷백 노리는)
      { x: 38, y: 28 },
      { x: 62, y: 28 },
      // 키커 + 반대편 윙백 (프리킥은 키커 중앙. 윙백은 좌측 기본 — 사용자가 시나리오 따라 조정)
      { x: 50, y: 26 },  // 키커 (공 옆)
      { x: 25, y: 50 },  // 반대편(좌측) 윙백
      // 센터백 2명
      { x: 45, y: 55 },
      { x: 55, y: 55 },
      // GK
      { x: 50, y: 88 },
    ],
  },
};

/**
 * 포메이션 슬롯을 세트피스 좌표에 매핑.
 *
 * 알고리즘 (사용자 결정 — 단순):
 *  1. 슬롯 11개를 y값 오름차순 정렬 (작은 y=공격라인, 큰 y=수비라인)
 *  2. 같은 y값이면 x값 보조 정렬 (좌→우)
 *  3. 시나리오의 positions[0~10]에 정렬된 슬롯 1:1 매핑
 *  4. 슬롯 ID는 그대로 유지 (포메이션 약어 — 본인 포지션 강조 정상 동작)
 *
 * 사용자가 첫 컷 생성 후 드래그로 미세 조정 가능 (예: ST가 박스 안에 자동 배치되지만
 * 사용자가 실제 키커로 쓰고 싶은 슬롯을 직접 옮길 수 있음).
 */
export function buildSetpieceStep(
  scenario: SetpieceScenario,
  formationSlots: Array<{ id: string; x: number; y: number }>,
): {
  caption: string;
  ball: SetpiecePoint;
  positions: Array<{ slot: string; x: number; y: number }>;
} {
  const template = SETPIECE_TEMPLATES[scenario];
  // 슬롯 y값 오름차순 정렬 (같은 y면 x로)
  const sorted = [...formationSlots].sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y;
    return a.x - b.x;
  });

  // 슬롯 갯수가 11이 아닐 수도 — 슬롯 갯수만큼만 매핑 (풋살 5·6명 등은 자유 배치 권장이므로
  // 별도 처리 없이 첫 N개 좌표만 사용. 일단 축구 11인제 기준.)
  const positions = sorted.slice(0, template.positions.length).map((slot, i) => ({
    slot: slot.id,
    x: template.positions[i].x,
    y: template.positions[i].y,
  }));

  return {
    caption: SETPIECE_SCENARIO_LABEL[scenario],
    ball: template.ball,
    positions,
  };
}
