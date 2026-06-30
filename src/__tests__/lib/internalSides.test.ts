import { describe, it, expect } from "vitest";
import { distributeToBalance, type InternalSide } from "@/lib/internalSides";

describe("distributeToBalance — 미배정 인원 증분 균형 배정", () => {
  it("빈 팀에 6명을 2팀으로 균등 분배한다 (3:3)", () => {
    const out = distributeToBalance(
      ["p1", "p2", "p3", "p4", "p5", "p6"],
      { A: 0, B: 0 },
      ["A", "B"],
    );
    const counts = tally(out);
    expect(counts.A).toBe(3);
    expect(counts.B).toBe(3);
  });

  it("기존 배정은 건드리지 않고 추가분만 반환한다", () => {
    const out = distributeToBalance(["new1"], { A: 5, B: 4 }, ["A", "B"]);
    // 기존 9명은 결과에 없어야 함 — 추가 1명만
    expect(Object.keys(out)).toEqual(["new1"]);
  });

  it("인원이 적은 팀부터 채운다", () => {
    // A가 더 많으므로 B로
    const out = distributeToBalance(["x"], { A: 6, B: 4 }, ["A", "B"]);
    expect(out.x).toBe("B");
  });

  it("동률이면 sides 순서(A→B→C) 우선", () => {
    const out = distributeToBalance(["x"], { A: 5, B: 5 }, ["A", "B"]);
    expect(out.x).toBe("A");
  });

  it("불균형 팀을 추가 인원으로 메워 균형에 가깝게 만든다", () => {
    // A6 B6 C0 에 2명 → 둘 다 C로 가서 6:6:2
    const out = distributeToBalance(["x", "y"], { A: 6, B: 6, C: 0 }, ["A", "B", "C"]);
    expect(out.x).toBe("C");
    expect(out.y).toBe("C");
  });

  it("여러 명을 순차로 가장 적은 팀에 배정해 누적 균형을 유지한다", () => {
    // 빈 2팀에 3명 → A,B,A (동률 시 A 우선) → 최종 2:1
    const out = distributeToBalance(["a", "b", "c"], { A: 0, B: 0 }, ["A", "B"]);
    expect(out.a).toBe("A");
    expect(out.b).toBe("B");
    expect(out.c).toBe("A");
  });

  it("currentCounts에 키가 없어도 0으로 간주한다", () => {
    const out = distributeToBalance(["x"], {}, ["A", "B"]);
    expect(out.x).toBe("A");
  });

  it("미배정 인원이 없으면 빈 객체를 반환한다", () => {
    const out = distributeToBalance([], { A: 3, B: 3 }, ["A", "B"]);
    expect(out).toEqual({});
  });
});

function tally(map: Record<string, InternalSide>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const side of Object.values(map)) counts[side] = (counts[side] ?? 0) + 1;
  return counts;
}
