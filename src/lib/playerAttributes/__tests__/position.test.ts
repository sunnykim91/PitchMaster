import { describe, it, expect } from "vitest";
import { recommendPositions } from "../position";
import type { AttributeCode } from "../types";

function buildScoreMap(scores: Partial<Record<AttributeCode, number>>) {
  const map = new Map<AttributeCode, { pitch_score: number; sample_count: number; name_ko: string }>();
  for (const [code, s] of Object.entries(scores) as [AttributeCode, number][]) {
    map.set(code, { pitch_score: s, sample_count: 5, name_ko: code });
  }
  return map;
}

describe("recommendPositions — 룰 기반 포지션 추천", () => {
  it("능력치 0개 → 빈 결과", () => {
    const result = recommendPositions(new Map());
    expect(result).toEqual([]);
  });

  it("결정력·슈팅력·드리블·헤딩 강점 → ST 추천", () => {
    const result = recommendPositions(
      buildScoreMap({
        FINISHING: 4.5,
        SHOT_POWER: 4.3,
        DRIBBLING: 4.2,
        HEADING: 4.0,
        SPEED: 4.1,
        TACKLING: 2.0,
      }),
    );
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].position).toBe("ST");
    expect(result[0].name_ko).toBe("스트라이커");
  });

  it("태클·위치선정·헤딩 강점 → CB 추천", () => {
    const result = recommendPositions(
      buildScoreMap({
        TACKLING: 4.5,
        POSITIONING: 4.3,
        CLEARING: 4.4,
        HEADING: 4.2,
        STRENGTH: 4.0,
      }),
    );
    expect(result[0].position).toBe("CB");
  });

  it("isGoalkeeper=true → GK만 추천", () => {
    const result = recommendPositions(
      buildScoreMap({
        GK_REFLEX: 4.5,
        GK_HANDLING: 4.3,
        GK_FOOT: 4.0,
        GK_LONG_KICK: 4.2,
      }),
      true,
    );
    expect(result.length).toBe(1);
    expect(result[0].position).toBe("GK");
  });

  it("필드 선수는 GK 추천 안 함", () => {
    const result = recommendPositions(
      buildScoreMap({
        FINISHING: 4.5,
        SPEED: 4.0,
      }),
      false,
    );
    const positions = result.map((r) => r.position);
    expect(positions).not.toContain("GK");
  });

  it("기본 limit=3 적용", () => {
    const result = recommendPositions(
      buildScoreMap({
        SHORT_PASS: 4.0,
        LONG_PASS: 4.0,
        STAMINA: 4.0,
        VISION: 4.0,
        BREAK_PRESS: 4.0,
        TACKLING: 4.0,
        INTERCEPT: 4.0,
        POSITIONING: 4.0,
      }),
    );
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it("top_attributes는 점수 내림차순으로 3개만", () => {
    const result = recommendPositions(
      buildScoreMap({
        FINISHING: 4.8,
        SHOT_POWER: 4.5,
        DRIBBLING: 4.0,
        HEADING: 3.8,
        SPEED: 3.5,
      }),
    );
    const st = result.find((r) => r.position === "ST");
    expect(st).toBeDefined();
    expect(st!.top_attributes.length).toBe(3);
    expect(st!.top_attributes[0].score).toBeGreaterThanOrEqual(st!.top_attributes[1].score);
  });
});
