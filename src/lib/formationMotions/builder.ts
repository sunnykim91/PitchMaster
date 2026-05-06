/**
 * 표준 포메이션 motion 자동 생성 — 기본 전형 + 공격 1 + 수비 1.
 *
 * 4-2-3-1 같은 풀 시퀀스 별도 정의가 없는 포메이션을 위한 단순 베이스.
 * 각 팀 운영진이 편집기에서 복사·편집해 풍성하게 만들어가는 시작점.
 */

import type { FormationMotion, PhasePosition } from "./types";
import type { FormationTemplate } from "@/lib/formations";

function basePositions(slots: FormationTemplate["slots"]): PhasePosition[] {
  return slots.map((s) => ({ slot: s.id, x: s.x, y: s.y }));
}

/** y 좌표를 위쪽(상대 골대)으로 시프트. y >= 4 보장. */
function shiftY(positions: PhasePosition[], shift: number): PhasePosition[] {
  return positions.map((p) => ({ ...p, y: Math.max(p.y - shift, 4) }));
}

export function buildBasicMotion(template: FormationTemplate): FormationMotion {
  const base = basePositions(template.slots);

  return {
    formationId: template.id,
    attack: [
      {
        label: "기본 전형",
        steps: [
          {
            caption: `${template.name} 공격 시작 형태 — 모든 선수 자기 위치 정렬.`,
            ball: null,
            positions: base,
          },
        ],
      },
      {
        label: "공격 1",
        steps: [
          {
            caption: "라인 전체가 한 단계 전진 — 빌드업 시작, 미드라인까지 진출.",
            ball: { x: 50, y: 50 },
            positions: shiftY(base, 8),
          },
        ],
      },
    ],
    defense: [
      {
        label: "기본 전형",
        steps: [
          {
            caption: `${template.name} 수비 시작 형태 — 모든 선수 자기 위치 정렬, 상대 빌드업 트리거 대기.`,
            ball: { x: 50, y: 35 },
            positions: base,
          },
        ],
      },
      {
        label: "수비 1",
        steps: [
          {
            caption: "전방 압박 — 라인 전체 한 단계 올려 상대 빌드업 차단.",
            ball: { x: 50, y: 14 },
            positions: shiftY(base, 12),
          },
        ],
      },
    ],
  };
}
