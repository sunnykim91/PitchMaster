import { describe, it, expect } from "vitest";
import { getQuarterPlayerIds } from "@/components/TacticsBoard.utils";
import type { Placement } from "@/components/TacticsBoard.types";

describe("getQuarterPlayerIds — 이 쿼터에 배치된 선수", () => {
  const placements: Record<string, Placement | null> = {
    lcb: { playerId: "p1", x: 0, y: 0 },
    rcb: { playerId: "p2", x: 0, y: 0, secondPlayerId: "p3" }, // 반쿼터 교체
    st: null,
    __referee: { playerId: "p9", x: 0, y: 0 }, // 메타 슬롯 — 제외 대상
  };

  it("배치된 선수 + 반쿼터 후반 선수 포함, 빈 슬롯 무시", () => {
    const ids = getQuarterPlayerIds(placements);
    expect(ids.has("p1")).toBe(true);
    expect(ids.has("p2")).toBe(true);
    expect(ids.has("p3")).toBe(true); // secondPlayerId
  });

  it("메타 슬롯(__referee 등) 선수는 제외 (뛰는 선수 아님)", () => {
    const ids = getQuarterPlayerIds(placements);
    expect(ids.has("p9")).toBe(false);
  });

  it("빈 배치면 빈 집합", () => {
    expect(getQuarterPlayerIds({ a: null, __camera: null }).size).toBe(0);
  });
});
