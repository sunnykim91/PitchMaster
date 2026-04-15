import { describe, it, expect } from "vitest";
import {
  getRarity,
  classifyPosition,
  getHeroStatKey,
  generateSignature,
  computeRankLabel,
  computeRateRankLabel,
  computeStreak,
  generateSeasonSummary,
  awardContext,
  findBestMoments,
  type MatchPerformance,
} from "@/lib/playerCardUtils";

describe("getRarity", () => {
  it("OVR 80+ → ICON", () => {
    expect(getRarity(99)).toBe("ICON");
    expect(getRarity(80)).toBe("ICON");
  });
  it("OVR 70~79 → HERO", () => {
    expect(getRarity(79)).toBe("HERO");
    expect(getRarity(70)).toBe("HERO");
  });
  it("OVR 60~69 → RARE", () => {
    expect(getRarity(69)).toBe("RARE");
    expect(getRarity(60)).toBe("RARE");
  });
  it("OVR 59 이하 → COMMON", () => {
    expect(getRarity(59)).toBe("COMMON");
    expect(getRarity(45)).toBe("COMMON");
  });
});

describe("classifyPosition", () => {
  it("GK", () => expect(classifyPosition(["GK"])).toBe("GK"));
  it("CB → DEF", () => expect(classifyPosition(["CB"])).toBe("DEF"));
  it("CM → MID", () => expect(classifyPosition(["CM"])).toBe("MID"));
  it("ST → FW", () => expect(classifyPosition(["ST"])).toBe("FW"));
  it("빈 배열 → DEFAULT", () => expect(classifyPosition([])).toBe("DEFAULT"));
  it("null → DEFAULT", () => expect(classifyPosition(null)).toBe("DEFAULT"));
  it("소문자도 동일 분류", () =>
    expect(classifyPosition(["gk"])).toBe("GK"));
});

describe("getHeroStatKey", () => {
  it("FW → goals", () => expect(getHeroStatKey("FW")).toBe("goals"));
  it("MID → assists", () => expect(getHeroStatKey("MID")).toBe("assists"));
  it("DEF → cleanSheet", () =>
    expect(getHeroStatKey("DEF")).toBe("cleanSheet"));
  it("GK → cleanSheet", () => expect(getHeroStatKey("GK")).toBe("cleanSheet"));
});

describe("generateSignature", () => {
  const base = {
    cat: "FW" as const,
    goals: 0,
    assists: 0,
    mvp: 0,
    cleanSheets: 0,
    matchCount: 0,
    attendanceRate: 0,
    winRate: 0,
  };

  it("출전 0경기면 placeholder 반환", () => {
    expect(generateSignature(base)).toContain("첫 경기");
  });

  it("FW 득점왕 + 어시 → 골/어시 카피", () => {
    const sig = generateSignature({
      ...base,
      goals: 15,
      assists: 8,
      matchCount: 18,
      isTopScorer: true,
    });
    expect(sig).toContain("15골");
    expect(sig).toContain("8어시");
    expect(sig).toContain("팀 득점왕");
  });

  it("DEF 클린시트 5+ → 무실점 카피", () => {
    const sig = generateSignature({
      ...base,
      cat: "DEF",
      cleanSheets: 7,
      matchCount: 18,
    });
    expect(sig).toContain("7경기 무실점");
  });

  it("승률 70%+ → 승률 카피", () => {
    const sig = generateSignature({
      ...base,
      matchCount: 10,
      goals: 1,
      winRate: 0.8,
    });
    expect(sig).toContain("80%");
  });

  it("출석률 90%+ → 기둥 카피", () => {
    const sig = generateSignature({
      ...base,
      matchCount: 18,
      attendanceRate: 0.95,
    });
    expect(sig).toContain("95%");
  });
});

describe("computeRankLabel", () => {
  it("최댓값 → 팀 1위", () => {
    expect(computeRankLabel(15, [15, 10, 8, 3])).toBe("🏆 팀 1위");
  });
  it("두 번째 → 팀 2위", () => {
    expect(computeRankLabel(10, [15, 10, 8, 3])).toBe("🥈 팀 2위");
  });
  it("세 번째 → 팀 3위", () => {
    expect(computeRankLabel(8, [15, 10, 8, 3])).toBe("🥉 팀 3위");
  });
  it("0은 랭크 없음", () => {
    expect(computeRankLabel(0, [15, 10])).toBeUndefined();
  });
  it("상위 10% 산정", () => {
    const all = Array.from({ length: 20 }, (_, i) => 20 - i); // 20..1
    expect(computeRankLabel(20, all)).toBe("🏆 팀 1위");
    expect(computeRankLabel(19, all)).toBe("🥈 팀 2위");
    expect(computeRankLabel(18, all)).toBe("🥉 팀 3위");
  });
});

describe("computeRateRankLabel", () => {
  it("표본 부족하면 undefined", () => {
    expect(computeRateRankLabel(0.8, [0.8, 0.5])).toBeUndefined();
  });
  it("표본 충분하면 1위 산정", () => {
    expect(
      computeRateRankLabel(0.9, [0.9, 0.7, 0.5, 0.3])
    ).toBe("🏆 팀 1위");
  });
});

describe("computeStreak", () => {
  it("빈 배열 → 0", () => expect(computeStreak([])).toBe(0));
  it("전부 false → 0", () =>
    expect(computeStreak([false, false, false])).toBe(0));
  it("연속 true 길이", () =>
    expect(computeStreak([true, true, true, false, true])).toBe(3));
  it("끝에 연속이 더 길면 그 길이", () =>
    expect(computeStreak([true, false, true, true, true, true])).toBe(4));
});

describe("generateSeasonSummary", () => {
  it("0경기 → undefined", () => {
    expect(generateSeasonSummary({ wins: 0, draws: 0, losses: 0 }, 0))
      .toBeUndefined();
  });
  it("승률 60%+ → 단단한 시즌", () => {
    const s = generateSeasonSummary({ wins: 12, draws: 3, losses: 5 }, 20);
    expect(s).toBeDefined();
    expect(s).toContain("단단");
  });
  it("승률 75%+ → 압도적", () => {
    const s = generateSeasonSummary({ wins: 16, draws: 2, losses: 2 }, 20);
    expect(s).toContain("압도적");
  });
});

describe("awardContext", () => {
  it("topScorer 경기당 1골 이상", () => {
    expect(awardContext("topScorer", 22, 20)).toBe("경기당 1골 이상");
  });
  it("ironWall 5경기 이상 → 무실점 라벨", () => {
    expect(awardContext("ironWall", 7, 20)).toContain("무실점");
  });
  it("luckyCharm은 항상 라벨", () => {
    expect(awardContext("luckyCharm", 0, 20)).toBeDefined();
  });
});

describe("findBestMoments", () => {
  const mkMatch = (
    overrides: Partial<MatchPerformance> = {}
  ): MatchPerformance => ({
    matchId: "m1",
    date: "2026-01-01",
    opponent: "FC 상대",
    ourScore: 2,
    oppScore: 1,
    attended: true,
    goals: 0,
    assists: 0,
    mvp: false,
    ...overrides,
  });

  it("빈 히스토리 → 빈 배열", () => {
    expect(findBestMoments([])).toEqual([]);
  });

  it("베스트 경기 산출", () => {
    const moments = findBestMoments([
      mkMatch({ matchId: "1", date: "2026-01-01", goals: 1 }),
      mkMatch({
        matchId: "2",
        date: "2026-01-08",
        opponent: "강남 FC",
        ourScore: 5,
        oppScore: 2,
        goals: 2,
        assists: 1,
      }),
    ]);
    const best = moments.find((m) => m.kind === "bestMatch");
    expect(best).toBeDefined();
    expect(best?.headline).toContain("강남 FC");
    expect(best?.headline).toContain("5:2");
    expect(best?.detail).toContain("2골");
  });

  it("첫 골 산출", () => {
    const moments = findBestMoments([
      mkMatch({ matchId: "1", date: "2026-01-01", goals: 0 }),
      mkMatch({
        matchId: "2",
        date: "2026-01-08",
        goals: 1,
        opponent: "FC 첫골",
      }),
      mkMatch({ matchId: "3", date: "2026-01-15", goals: 2 }),
    ]);
    const first = moments.find((m) => m.kind === "firstGoal");
    expect(first?.date).toBe("2026-01-08");
    expect(first?.detail).toContain("FC 첫골");
  });

  it("3경기 연속 MOM 시 streak moment", () => {
    const matches: MatchPerformance[] = Array.from({ length: 5 }, (_, i) =>
      mkMatch({
        matchId: `m${i}`,
        date: `2026-01-${String(i + 1).padStart(2, "0")}`,
        mvp: i < 3,
      })
    );
    const moments = findBestMoments(matches);
    const streak = moments.find((m) => m.kind === "streak");
    expect(streak?.headline).toContain("3경기 연속 MOM");
  });

  it("출전 0이면 베스트 모먼트 없음", () => {
    const matches = [mkMatch({ attended: false })];
    expect(findBestMoments(matches)).toEqual([]);
  });
});
