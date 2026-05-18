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
  calculateOVR,
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
    // 0경기 풀: "첫 경기" 또는 "출전 전" 패턴
    const sig = generateSignature(base);
    expect(sig).toMatch(/첫 경기|출전 전/);
  });

  it("FW 득점왕 → 골 수치 + 득점왕 관련 표현", () => {
    const sig = generateSignature({
      ...base,
      goals: 15,
      assists: 8,
      matchCount: 18,
      isTopScorer: true,
    });
    // 패턴 풀 다양성: 15 숫자는 반드시 포함, 득점왕/공격P 중 하나
    expect(sig).toContain("15");
    expect(sig).toMatch(/득점왕|공격P|공격 포인트|팀 최다|1위/);
  });

  it("DEF 클린시트 5+ → 무실점/클린시트 관련 카피", () => {
    const sig = generateSignature({
      ...base,
      cat: "DEF",
      cleanSheets: 7,
      matchCount: 18,
    });
    expect(sig).toContain("7");
    expect(sig).toMatch(/무실점|클린시트|막아낸|뚫리지/);
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

  it("DEF + goals 3+ (절대 수치) → 수비수 골 카피", () => {
    const sig = generateSignature({
      ...base,
      cat: "DEF",
      goals: 7,
      matchCount: 16,
      isTopScorer: false,
    });
    expect(sig).toContain("7");
    expect(sig).toMatch(/수비수|보기 드문|증명|공격까지|득점/);
  });

  it("DEF + MOM 1회 + 공동 1위 → MOM 분기 통과 안 함 (mvp>=2 강화)", () => {
    const sig = generateSignature({
      ...base,
      cat: "DEF",
      goals: 7,
      mvp: 1,
      matchCount: 16,
      isTopMvp: true,
    });
    expect(sig).not.toMatch(/MOM 1회|1회 MOM/);
    // 대신 DEF + goals 3+ 분기 적중
    expect(sig).toContain("7");
  });

  it("출석 streak 8+ → 연속 출장 카피 (DEF)", () => {
    const sig = generateSignature({
      ...base,
      cat: "DEF",
      matchCount: 16,
      attendanceStreak: 13,
    });
    expect(sig).toContain("13");
    expect(sig).toMatch(/연속 출장|연속,|연속 13/);
  });

  it("출석 streak 8+ → 연속 출장 카피 (FW)", () => {
    const sig = generateSignature({
      ...base,
      cat: "FW",
      matchCount: 16,
      attendanceStreak: 10,
    });
    expect(sig).toContain("10");
    expect(sig).toMatch(/연속 출장|연속,|연속 10/);
  });

  it("DEF + assists 3+ → 빌드업 카피", () => {
    const sig = generateSignature({
      ...base,
      cat: "DEF",
      assists: 5,
      matchCount: 16,
    });
    expect(sig).toContain("5");
    expect(sig).toMatch(/어시|빌드업|시발점|기여/);
  });

  it("attendanceStreak null이어도 안전 처리", () => {
    const sig = generateSignature({
      ...base,
      matchCount: 10,
      attendanceStreak: null,
    });
    expect(sig).toBeDefined();
    expect(typeof sig).toBe("string");
  });
});

describe("calculateOVR", () => {
  it("출전 0경기 → 바닥 OVR 45", () => {
    expect(calculateOVR("FW", 0, 0, 0, 0, 0, 0, 0, 0)).toBe(45);
  });

  it("DEF 김선휘 케이스 (16경기, 7골/3어시/1MOM, 94%, 81%, CS 1, 실점 3.44)", () => {
    const ovr = calculateOVR(
      "DEF",
      7 / 16,    // goalsPerGame
      3 / 16,    // assistsPerGame
      16 / 17,   // attendRate
      1 / 16,    // mvpRate
      13 / 16,   // winRate
      1 / 16,    // cleanSheetPerGame
      55 / 16,   // concededPerGame (실점 평균 3.44)
      16,
    );
    // 신 공식 기댓값: 65~68 사이 (수비수 골 보너스 반영)
    expect(ovr).toBeGreaterThanOrEqual(63);
    expect(ovr).toBeLessThanOrEqual(70);
  });

  it("GK 일반 케이스 (10경기, CS 3, 실점 2.0, 90%, 60%, MVP 0)", () => {
    const ovr = calculateOVR(
      "GK",
      0, 0,        // goals/assists (GK는 무관)
      0.9,         // attendRate
      0,           // mvpRate
      0.6,         // winRate
      0.3,         // cleanSheetPerGame
      2.0,         // concededPerGame
      10,
    );
    // 신 공식: 실점 감점 완화 + cleanSheet 정규화 → 70+ 도달
    expect(ovr).toBeGreaterThanOrEqual(70);
    expect(ovr).toBeLessThanOrEqual(80);
  });

  it("FW 일반 케이스 (10경기, 5골/2어시, 70%, MVP 1, 60%) → HERO 근처", () => {
    const ovr = calculateOVR(
      "FW",
      0.5,   // goalsPerGame
      0.2,   // assistsPerGame
      0.7,   // attendRate
      0.1,   // mvpRate
      0.6,   // winRate
      0, 0,  // cleanSheet/conceded (FW 무관)
      10,
    );
    expect(ovr).toBeGreaterThanOrEqual(60);
    expect(ovr).toBeLessThanOrEqual(75);
  });

  it("표본 부족 (3경기) → sqrt 보정 감점", () => {
    const ovr3 = calculateOVR("FW", 1, 0.5, 1, 0.3, 0.8, 0, 0, 3);
    const ovr6 = calculateOVR("FW", 1, 0.5, 1, 0.3, 0.8, 0, 0, 6);
    // 3경기는 sqrt(3/6) ≈ 0.71 보정 → 6경기 만점 보정보다 낮아야 함
    expect(ovr3).toBeLessThan(ovr6);
  });

  it("FW 1경기 8골 폭발 → cap 작동으로 OVR 천장 안 뚫음", () => {
    const ovr = calculateOVR(
      "FW",
      8,     // goalsPerGame (1경기 8골 비정상치)
      0, 1, 0, 1, 0, 0,
      1,     // 1경기
    );
    // goalsContrib cap=1 + gameScale sqrt(1/6)=0.41 보정으로 99 안 뜸
    expect(ovr).toBeLessThan(90);
  });

  it("최대 천장 99 clamp 작동 (만점 시나리오)", () => {
    const ovr = calculateOVR("FW", 1, 0.5, 1, 1, 1, 0, 0, 20);
    expect(ovr).toBeLessThanOrEqual(99);
    expect(ovr).toBeGreaterThanOrEqual(95);
  });

  it("DEF 골 보너스 검증 (수비수가 골 넣으면 OVR 가산)", () => {
    const noGoals = calculateOVR("DEF", 0, 0, 0.9, 0.1, 0.7, 0.2, 2.0, 16);
    const withGoals = calculateOVR("DEF", 0.5, 0, 0.9, 0.1, 0.7, 0.2, 2.0, 16);
    expect(withGoals).toBeGreaterThan(noGoals);
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
