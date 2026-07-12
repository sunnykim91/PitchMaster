import type { MotionArrow, MotionArrowKind } from "@/lib/formationMotions/types";

/** 전술 화살표 스타일 — 이동(노랑 실선)·패스(청록 점선)·압박(빨강 실선). 0~100 좌표계 기준 굵기. */
export const MOTION_ARROW_STYLE: Record<MotionArrowKind, { color: string; dash?: string; label: string }> = {
  run: { color: "#facc15", label: "이동" },
  pass: { color: "#22d3ee", dash: "2 1.4", label: "패스" },
  press: { color: "#f87171", label: "압박" },
};
export const MOTION_ARROW_KINDS: MotionArrowKind[] = ["run", "pass", "press"];

/**
 * SVG 전술 화살표 레이어 — 에디터·뷰어 공용. viewBox 0~100 정사각(uniform) 안에서 그대로 렌더.
 * idPrefix 로 marker id 충돌 방지(한 페이지에 여러 SVG 있을 때).
 */
export function MotionArrows({ arrows, idPrefix }: { arrows?: MotionArrow[] | null; idPrefix: string }) {
  if (!arrows || arrows.length === 0) return null;
  return (
    <>
      <defs>
        {MOTION_ARROW_KINDS.map((k) => (
          <marker
            key={k}
            id={`ma-${k}-${idPrefix}`}
            viewBox="0 0 10 10"
            refX="7.2"
            refY="5"
            markerWidth="4.6"
            markerHeight="4.6"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill={MOTION_ARROW_STYLE[k].color} />
          </marker>
        ))}
      </defs>
      {arrows.map((a, i) => {
        const st = MOTION_ARROW_STYLE[a.kind] ?? MOTION_ARROW_STYLE.run;
        return (
          <line
            key={i}
            x1={a.x1}
            y1={a.y1}
            x2={a.x2}
            y2={a.y2}
            stroke={st.color}
            strokeWidth={1.1}
            strokeLinecap="round"
            strokeDasharray={st.dash}
            markerEnd={`url(#ma-${a.kind}-${idPrefix})`}
          />
        );
      })}
    </>
  );
}
