import { describe, it, expect } from "vitest";
import {
  hasMinRole,
  isPresident,
  isStaffOrAbove,
  canPerform,
} from "@/lib/permissions";
import type { Role } from "@/lib/types";

// ─── hasMinRole ───────────────────────────────────────────────────────────────
describe("hasMinRole", () => {
  it("PRESIDENT는 모든 역할 충족", () => {
    expect(hasMinRole("PRESIDENT", "PRESIDENT")).toBe(true);
    expect(hasMinRole("PRESIDENT", "STAFF")).toBe(true);
    expect(hasMinRole("PRESIDENT", "MEMBER")).toBe(true);
  });

  it("STAFF는 STAFF, MEMBER 충족 / PRESIDENT 불충족", () => {
    expect(hasMinRole("STAFF", "PRESIDENT")).toBe(false);
    expect(hasMinRole("STAFF", "STAFF")).toBe(true);
    expect(hasMinRole("STAFF", "MEMBER")).toBe(true);
  });

  it("MEMBER는 MEMBER만 충족", () => {
    expect(hasMinRole("MEMBER", "PRESIDENT")).toBe(false);
    expect(hasMinRole("MEMBER", "STAFF")).toBe(false);
    expect(hasMinRole("MEMBER", "MEMBER")).toBe(true);
  });

  it("undefined role → false", () => {
    expect(hasMinRole(undefined, "MEMBER")).toBe(false);
    expect(hasMinRole(undefined, "PRESIDENT")).toBe(false);
  });
});

// ─── isPresident ──────────────────────────────────────────────────────────────
describe("isPresident", () => {
  it("PRESIDENT → true", () => {
    expect(isPresident("PRESIDENT")).toBe(true);
  });

  it("STAFF, MEMBER → false", () => {
    expect(isPresident("STAFF")).toBe(false);
    expect(isPresident("MEMBER")).toBe(false);
  });

  it("undefined → false", () => {
    expect(isPresident(undefined)).toBe(false);
  });
});

// ─── isStaffOrAbove ───────────────────────────────────────────────────────────
describe("isStaffOrAbove", () => {
  it("PRESIDENT, STAFF → true", () => {
    expect(isStaffOrAbove("PRESIDENT")).toBe(true);
    expect(isStaffOrAbove("STAFF")).toBe(true);
  });

  it("MEMBER → false", () => {
    expect(isStaffOrAbove("MEMBER")).toBe(false);
  });

  it("undefined → false", () => {
    expect(isStaffOrAbove(undefined)).toBe(false);
  });
});

// ─── canPerform ───────────────────────────────────────────────────────────────
describe("canPerform", () => {
  // 경기 관련 권한 (STAFF 이상)
  describe("경기 관련 권한", () => {
    const matchActions = ["MATCH_CREATE", "MATCH_EDIT"] as const;

    it.each(matchActions)("%s: STAFF, PRESIDENT만 허용", (action) => {
      expect(canPerform("PRESIDENT", action)).toBe(true);
      expect(canPerform("STAFF", action)).toBe(true);
      expect(canPerform("MEMBER", action)).toBe(false);
    });

    it("MATCH_DELETE: PRESIDENT만 허용", () => {
      expect(canPerform("PRESIDENT", "MATCH_DELETE")).toBe(true);
      expect(canPerform("STAFF", "MATCH_DELETE")).toBe(false);
      expect(canPerform("MEMBER", "MATCH_DELETE")).toBe(false);
    });
  });

  // 골 기록 (MEMBER 이상)
  it("GOAL_RECORD: 모든 역할 허용", () => {
    const roles: Role[] = ["PRESIDENT", "STAFF", "MEMBER"];
    for (const role of roles) {
      expect(canPerform(role, "GOAL_RECORD")).toBe(true);
    }
  });

  // 회원 관리 (PRESIDENT만)
  describe("회원 관리 권한", () => {
    const presidentOnly = ["MEMBER_ROLE_CHANGE", "MEMBER_KICK", "TEAM_DELETE"] as const;

    it.each(presidentOnly)("%s: PRESIDENT만 허용", (action) => {
      expect(canPerform("PRESIDENT", action)).toBe(true);
      expect(canPerform("STAFF", action)).toBe(false);
      expect(canPerform("MEMBER", action)).toBe(false);
    });
  });

  // 회비 관리 (STAFF 이상)
  it("DUES_RECORD_ADD: STAFF 이상만 허용", () => {
    expect(canPerform("PRESIDENT", "DUES_RECORD_ADD")).toBe(true);
    expect(canPerform("STAFF", "DUES_RECORD_ADD")).toBe(true);
    expect(canPerform("MEMBER", "DUES_RECORD_ADD")).toBe(false);
  });

  it("undefined role → false", () => {
    expect(canPerform(undefined, "MATCH_CREATE")).toBe(false);
  });
});
