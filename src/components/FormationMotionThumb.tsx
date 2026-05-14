"use client";

/**
 * FormationMotionThumb — 영상 목록 카드용 정적 미니 미리보기.
 *
 * FormationMotionViewer 의 정적 렌더 부분만 추출 — animation·인터랙션 없음, framer-motion 미사용.
 * 영상의 첫 step (attack[0].steps[0]) 위치 그대로. 슬롯 라벨도 생략, 점만 표시.
 *
 * 의도: 카드에서 "어떤 모양 영상인지" 한눈에 인지하는 데 충분한 시각 단서.
 */

import type { TacticalAnimationData } from "@/lib/formationMotions/dbTypes";

interface Props {
  data: TacticalAnimationData;
  size?: number;
}

export default function FormationMotionThumb({ data, size = 64 }: Props) {
  // P3 평면 영상은 data.steps에 컷이 있음. 레거시는 attack/defense의 첫 phase·첫 step.
  const firstStep =
    data.steps?.[0] ?? data.attack?.[0]?.steps[0] ?? data.defense?.[0]?.steps[0];
  if (!firstStep) {
    return (
      <div
        className="shrink-0 rounded-md bg-muted/40"
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div className="shrink-0 overflow-hidden rounded-md" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="h-full w-full">
        <rect x="0" y="0" width="100" height="100" fill="hsl(140 25% 18%)" />
        <g stroke="hsl(140 18% 45%)" strokeWidth="0.6" fill="none">
          <rect x="2" y="2" width="96" height="96" />
          <line x1="2" y1="50" x2="98" y2="50" />
          <circle cx="50" cy="50" r="9" />
          <rect x="22" y="82" width="56" height="16" />
          <rect x="22" y="2" width="56" height="16" />
        </g>
        {firstStep.positions.map((pos) => (
          <circle
            key={pos.slot}
            cx={pos.x}
            cy={pos.y}
            r={3}
            fill="hsl(0 0% 92%)"
            stroke="hsl(140 25% 18%)"
            strokeWidth="0.5"
          />
        ))}
        {firstStep.ball && (
          <circle
            cx={firstStep.ball.x}
            cy={firstStep.ball.y + 2.4}
            r={1.6}
            fill="white"
            stroke="#0f0f0f"
            strokeWidth={0.4}
          />
        )}
      </svg>
    </div>
  );
}
