import { describe, it, expect } from "vitest";
import { MotionArrows, MOTION_ARROW_KINDS, MOTION_ARROW_STYLE } from "@/components/MotionArrows";
import type { MotionArrow } from "@/lib/formationMotions/types";

// MotionArrows 는 훅이 없는 순수 컴포넌트라 함수로 직접 호출해 반환값(null/요소)만 검증.
describe("MotionArrows", () => {
  it("arrows 없으면 null 반환 (하위호환 — 기존 화살표 없는 영상)", () => {
    expect(MotionArrows({ arrows: undefined, idPrefix: "t" })).toBeNull();
    expect(MotionArrows({ arrows: null, idPrefix: "t" })).toBeNull();
    expect(MotionArrows({ arrows: [], idPrefix: "t" })).toBeNull();
  });

  it("arrows 있으면 요소 반환", () => {
    const arrows: MotionArrow[] = [{ x1: 0, y1: 0, x2: 10, y2: 10, kind: "run" }];
    expect(MotionArrows({ arrows, idPrefix: "t" })).not.toBeNull();
  });

  it("3종 화살표 스타일 모두 정의 (이동·패스·압박)", () => {
    expect(MOTION_ARROW_KINDS).toEqual(["run", "pass", "press"]);
    for (const k of MOTION_ARROW_KINDS) {
      expect(MOTION_ARROW_STYLE[k].color).toMatch(/^#/);
      expect(MOTION_ARROW_STYLE[k].label).toBeTruthy();
    }
    // 패스만 점선
    expect(MOTION_ARROW_STYLE.pass.dash).toBeTruthy();
    expect(MOTION_ARROW_STYLE.run.dash).toBeUndefined();
  });
});
