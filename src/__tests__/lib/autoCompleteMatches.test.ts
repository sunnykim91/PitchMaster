import { describe, it, expect } from "vitest";
import {
  shouldAutoComplete,
  getKstToday,
  getKstTimeOfDay,
} from "@/lib/server/autoCompleteMatches";

// KST 2026-04-11 10:00:00 = UTC 2026-04-11 01:00:00
// 4/11 07:00~09:00 KST 경기 기준 시나리오를 재현할 수 있도록 고정 시각 사용
const FIXED_KST_APRIL11_10AM = Date.parse("2026-04-11T01:00:00Z"); // KST 10:00
const FIXED_KST_APRIL11_8AM = Date.parse("2026-04-10T23:00:00Z"); // KST 08:00 (경기 중)
const FIXED_KST_APRIL11_6AM = Date.parse("2026-04-10T21:00:00Z"); // KST 06:00 (경기 시작 전)

describe("getKstToday / getKstTimeOfDay", () => {
  it("UTC 에서 KST 날짜로 변환", () => {
    expect(getKstToday(FIXED_KST_APRIL11_10AM)).toBe("2026-04-11");
  });

  it("자정 직전 UTC 는 KST 로는 다음날 오전", () => {
    // UTC 2026-04-10 17:00 = KST 2026-04-11 02:00
    const ms = Date.parse("2026-04-10T17:00:00Z");
    expect(getKstToday(ms)).toBe("2026-04-11");
    expect(getKstTimeOfDay(ms)).toBe("02:00:00");
  });

  it("KST 시간 대역 포맷", () => {
    expect(getKstTimeOfDay(FIXED_KST_APRIL11_10AM)).toBe("10:00:00");
    expect(getKstTimeOfDay(FIXED_KST_APRIL11_8AM)).toBe("08:00:00");
  });
});

describe("shouldAutoComplete", () => {
  const base = {
    status: "SCHEDULED" as const,
    match_date: "2026-04-11",
    match_time: "07:00:00",
    match_end_date: null as string | null,
    match_end_time: "09:00:00",
  };

  it("SCHEDULED 이 아니면 항상 false", () => {
    expect(
      shouldAutoComplete(
        { ...base, status: "COMPLETED" },
        FIXED_KST_APRIL11_10AM
      )
    ).toBe(false);
    expect(
      shouldAutoComplete(
        { ...base, status: "IN_PROGRESS" },
        FIXED_KST_APRIL11_10AM
      )
    ).toBe(false);
  });

  it("과거 날짜 경기는 시간 무관 완료", () => {
    expect(
      shouldAutoComplete(
        { ...base, match_date: "2026-04-10", match_end_time: null },
        FIXED_KST_APRIL11_10AM
      )
    ).toBe(true);
  });

  it("미래 날짜 경기는 항상 false", () => {
    expect(
      shouldAutoComplete(
        { ...base, match_date: "2026-04-12" },
        FIXED_KST_APRIL11_10AM
      )
    ).toBe(false);
  });

  it("당일 경기 + match_end_time 이 현재보다 이전 → true (핵심 케이스)", () => {
    // 10:00 현재, 경기 09:00 종료 → 완료
    expect(shouldAutoComplete(base, FIXED_KST_APRIL11_10AM)).toBe(true);
  });

  it("당일 경기 + 경기 진행 중 → false", () => {
    // 08:00 현재, 경기 07:00~09:00 → 진행 중
    expect(shouldAutoComplete(base, FIXED_KST_APRIL11_8AM)).toBe(false);
  });

  it("당일 경기 + 경기 시작 전 → false", () => {
    // 06:00 현재, 경기 07:00~09:00 → 아직 시작 전
    expect(shouldAutoComplete(base, FIXED_KST_APRIL11_6AM)).toBe(false);
  });

  it("당일 경기 + match_end_time 없음 → false (기존 동작 보존)", () => {
    // end_time 미등록된 과거 경기들 건드리지 않음
    expect(
      shouldAutoComplete(
        { ...base, match_end_time: null },
        FIXED_KST_APRIL11_10AM
      )
    ).toBe(false);
  });

  it("match_end_date 가 오늘보다 과거면 완료", () => {
    // 멀티데이 이벤트 - 어제 끝난 것
    expect(
      shouldAutoComplete(
        { ...base, match_date: "2026-04-08", match_end_date: "2026-04-10" },
        FIXED_KST_APRIL11_10AM
      )
    ).toBe(true);
  });

  it("match_end_date 가 오늘이면 false (아직 진행 중 가능)", () => {
    expect(
      shouldAutoComplete(
        { ...base, match_date: "2026-04-09", match_end_date: "2026-04-11" },
        FIXED_KST_APRIL11_10AM
      )
    ).toBe(false);
  });

  it("당일 경기 + end_time 이 정확히 현재 시각 → true (경계)", () => {
    // KST 10:00:00, end_time 10:00:00 → <= 조건이라 완료
    expect(
      shouldAutoComplete(
        { ...base, match_end_time: "10:00:00" },
        FIXED_KST_APRIL11_10AM
      )
    ).toBe(true);
  });

  it("당일 경기 + end_time 이 현재보다 1분 늦음 → false", () => {
    expect(
      shouldAutoComplete(
        { ...base, match_end_time: "10:01:00" },
        FIXED_KST_APRIL11_10AM
      )
    ).toBe(false);
  });
});
