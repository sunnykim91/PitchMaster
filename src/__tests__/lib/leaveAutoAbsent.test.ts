import { describe, it, expect } from "vitest";
import { leaveCoversDate } from "@/lib/server/leaveAutoAbsent";

describe("leaveCoversDate — 휴회 기간이 경기일 포함 판정", () => {
  it("기간 안(경계 포함)이면 true", () => {
    expect(leaveCoversDate("2026-07-01", "2026-07-31", "2026-07-01")).toBe(true);
    expect(leaveCoversDate("2026-07-01", "2026-07-31", "2026-07-15")).toBe(true);
    expect(leaveCoversDate("2026-07-01", "2026-07-31", "2026-07-31")).toBe(true);
  });

  it("기간 전/후면 false", () => {
    expect(leaveCoversDate("2026-07-01", "2026-07-31", "2026-06-30")).toBe(false);
    expect(leaveCoversDate("2026-07-01", "2026-07-31", "2026-08-01")).toBe(false);
  });

  it("종료일 없으면(무기한) 시작일 이후 전부 true", () => {
    expect(leaveCoversDate("2026-04-01", null, "2026-09-30")).toBe(true);
    expect(leaveCoversDate("2026-04-01", null, "2026-03-31")).toBe(false);
  });
});
