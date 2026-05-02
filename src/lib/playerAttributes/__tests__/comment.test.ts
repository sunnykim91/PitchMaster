import { describe, it, expect } from "vitest";
import { generatePitchComment } from "../comment";
import type { AttributeCategory } from "../types";

function avg(category: AttributeCategory, value: number, count = 5) {
  return { category, avg: value, count };
}

describe("generatePitchComment — 룰 기반 한 줄 코멘트", () => {
  it("3개 미만 카테고리에 평가가 있으면 null 반환", () => {
    const result = generatePitchComment([
      avg("PACE", 4.5),
      avg("SHOOTING", 4.0),
    ]);
    expect(result).toBeNull();
  });

  it("폭발적인 공격수 패턴 (슈팅 + 속도 + 드리블 강점)", () => {
    const result = generatePitchComment([
      avg("PACE", 4.6),
      avg("SHOOTING", 4.5),
      avg("DRIBBLING", 4.2),
      avg("DEFENDING", 2.0),
      avg("PHYSICAL", 3.0),
    ]);
    expect(result).not.toBeNull();
    expect(result!.archetype).toBe("폭발적인 공격수");
    expect(result!.comment).toContain("폭발적인 공격수");
    expect(result!.strengths).toContain("PACE");
    expect(result!.strengths).toContain("SHOOTING");
    expect(result!.weaknesses).toContain("DEFENDING");
  });

  it("믿음직한 수비수 패턴 (수비 + 헤딩 + 피지컬 강점)", () => {
    const result = generatePitchComment([
      avg("DEFENDING", 4.5),
      avg("HEADING", 4.3),
      avg("PHYSICAL", 4.2),
      avg("PACE", 2.8),
      avg("PASSING", 3.0),
    ]);
    expect(result!.archetype).toBe("믿음직한 수비수");
  });

  it("골키퍼 패턴", () => {
    const result = generatePitchComment([
      avg("GOALKEEPING", 4.5),
      avg("PASSING", 3.5),
      avg("PHYSICAL", 3.8),
    ]);
    expect(result!.archetype).toBe("안정적인 골키퍼");
  });

  it("강점 0개 + 약점 1개 — 약점 보강 메시지", () => {
    const result = generatePitchComment([
      avg("PACE", 3.5),
      avg("PASSING", 3.0),
      avg("DEFENDING", 2.0),
    ]);
    expect(result!.archetype).toBeNull();
    expect(result!.weaknesses).toContain("DEFENDING");
    expect(result!.comment).toContain("수비");
  });

  it("강점·약점 모두 0개 — 균형형", () => {
    const result = generatePitchComment([
      avg("PACE", 3.5),
      avg("PASSING", 3.5),
      avg("DEFENDING", 3.5),
    ]);
    expect(result!.archetype).toBeNull();
    expect(result!.comment).toContain("균형");
  });

  it("강점 카테고리는 점수 내림차순 정렬", () => {
    const result = generatePitchComment([
      avg("PACE", 4.2),
      avg("SHOOTING", 4.8),
      avg("DRIBBLING", 4.5),
      avg("DEFENDING", 3.0),
    ]);
    expect(result!.strengths[0]).toBe("SHOOTING");
    expect(result!.strengths[1]).toBe("DRIBBLING");
    expect(result!.strengths[2]).toBe("PACE");
  });
});
