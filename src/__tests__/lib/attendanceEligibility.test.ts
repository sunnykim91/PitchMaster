import { describe, it, expect } from "vitest";
import {
  isEligibleMatch,
  countEligibleMatches,
  computeAttendanceRate,
  computeAttendanceRateWithHistory,
} from "@/lib/attendanceEligibility";

// 시즌 전체 경기일 (오름차순일 필요는 없음)
const SEASON = [
  "2026-02-07", "2026-02-14", "2026-02-21", "2026-02-28",
  "2026-03-07", "2026-03-14", "2026-03-21", "2026-03-28",
];

describe("isEligibleMatch / countEligibleMatches", () => {
  it("가입일 null이면 전체 경기가 표본", () => {
    expect(isEligibleMatch("2026-02-07", null)).toBe(true);
    expect(countEligibleMatches(SEASON, null)).toBe(SEASON.length);
  });

  it("가입일 이후 경기만 분모에 포함", () => {
    // 3/01 가입 → 3월 경기 4개만 eligible
    expect(countEligibleMatches(SEASON, "2026-03-01T00:00:00+09:00")).toBe(4);
  });
});

describe("computeAttendanceRate", () => {
  it("분모 0이면 0 반환 (가입일이 모든 경기보다 늦음)", () => {
    expect(computeAttendanceRate(8, SEASON, "2026-06-25T00:00:00+09:00")).toBe(0);
  });

  it("가입 이후 경기 기준 비율", () => {
    // 3/01 가입, 4경기 중 2경기 출석 → 0.5
    expect(computeAttendanceRate(2, SEASON, "2026-03-01T00:00:00+09:00")).toBe(0.5);
  });
});

describe("computeAttendanceRateWithHistory (과거 데이터 이관 보정)", () => {
  it("가입 전 출석 기록이 있으면 시즌 전체를 분모로 (이관 멤버)", () => {
    // 가입 6/25지만 2~3월 경기 전부 출석 → 분모=8, 8/8=1
    const attendedAll = [...SEASON];
    expect(
      computeAttendanceRateWithHistory(8, SEASON, "2026-06-25T00:00:00+09:00", attendedAll)
    ).toBe(1);
  });

  it("가입 전 출석이 있으면 결석 경기도 분모에 포함 (강대훈 시나리오)", () => {
    // 가입 6/25, 8경기 중 6경기만 출석(가입 전) → 분모=8, 6/8=0.75
    const attended6 = SEASON.slice(0, 6);
    expect(
      computeAttendanceRateWithHistory(6, SEASON, "2026-06-25T00:00:00+09:00", attended6)
    ).toBe(0.75);
  });

  it("일반 신규 회원(가입 전 출석 없음)은 기존 게이트 동작 유지", () => {
    // 3/01 가입, 출석은 전부 가입 이후(3월) → 분모=4, 2/4=0.5
    const attendedAfterJoin = ["2026-03-07", "2026-03-21"];
    expect(
      computeAttendanceRateWithHistory(2, SEASON, "2026-03-01T00:00:00+09:00", attendedAfterJoin)
    ).toBe(0.5);
  });

  it("가입일 null이면 그대로 전체 분모", () => {
    expect(computeAttendanceRateWithHistory(4, SEASON, null, [])).toBe(0.5);
  });
});
