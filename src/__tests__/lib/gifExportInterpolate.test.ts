import { describe, it, expect } from "vitest";
import { interpolateStep } from "@/lib/animationExport/gifExport";
import type { MotionStep } from "@/lib/formationMotions/types";

function step(over: Partial<MotionStep> = {}): MotionStep {
  return {
    caption: "cut",
    positions: [{ slot: "gk", x: 50, y: 90 }],
    ...over,
  };
}

describe("interpolateStep", () => {
  it("선수 좌표를 t로 선형보간", () => {
    const a = step({ positions: [{ slot: "gk", x: 0, y: 0 }] });
    const b = step({ positions: [{ slot: "gk", x: 100, y: 40 }] });
    const mid = interpolateStep(a, b, 0.5);
    expect(mid.positions[0]).toMatchObject({ slot: "gk", x: 50, y: 20 });
  });

  it("공 좌표 보간 (양쪽 다 있을 때)", () => {
    const a = step({ ball: { x: 0, y: 0 } });
    const b = step({ ball: { x: 10, y: 20 } });
    expect(interpolateStep(a, b, 0.5).ball).toMatchObject({ x: 5, y: 10 });
  });

  it("화살표는 보간하지 않고 컷 기준 전환 (t<0.5 = a, else b)", () => {
    const aArrows = [{ x1: 1, y1: 1, x2: 2, y2: 2, kind: "run" as const }];
    const bArrows = [{ x1: 9, y1: 9, x2: 8, y2: 8, kind: "pass" as const }];
    const a = step({ arrows: aArrows });
    const b = step({ arrows: bArrows });
    expect(interpolateStep(a, b, 0.3).arrows).toBe(aArrows);
    expect(interpolateStep(a, b, 0.5).arrows).toBe(bArrows);
    expect(interpolateStep(a, b, 0.8).arrows).toBe(bArrows);
  });

  it("화살표 없는 컷은 arrows undefined 유지 (하위호환)", () => {
    expect(interpolateStep(step(), step(), 0.5).arrows).toBeUndefined();
  });

  it("캡션은 t<0.5에서 a, 이후 b", () => {
    const a = step({ caption: "A" });
    const b = step({ caption: "B" });
    expect(interpolateStep(a, b, 0.4).caption).toBe("A");
    expect(interpolateStep(a, b, 0.6).caption).toBe("B");
  });
});
