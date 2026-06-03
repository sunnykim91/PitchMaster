import { describe, it, expect } from "vitest";
import { isMembershipRevoked } from "@/lib/auth";

// auth() 의 validMembership strip 규칙 회귀 가드.
// 강퇴(BANNED)·탈퇴(LEFT)는 row 삭제가 아니라 status 변경이라, status 로만 박탈을 판정한다.
// 과거 회귀: ACTIVE 만 통과시키면 휴면(DORMANT) 회원이 세션 권한을 잃고 로그인 잠김 →
//           반드시 ACTIVE·DORMANT 양쪽 모두 "유효(=박탈 아님)"로 유지돼야 한다.
describe("isMembershipRevoked", () => {
  it("BANNED(강퇴)는 박탈 상태로 true", () => {
    expect(isMembershipRevoked("BANNED")).toBe(true);
  });

  it("LEFT(탈퇴)는 박탈 상태로 true", () => {
    expect(isMembershipRevoked("LEFT")).toBe(true);
  });

  it("ACTIVE(정상)는 유지 — false", () => {
    expect(isMembershipRevoked("ACTIVE")).toBe(false);
  });

  it("DORMANT(휴면)는 유지 — false (휴면 회원 로그인 잠김 회귀 방지)", () => {
    expect(isMembershipRevoked("DORMANT")).toBe(false);
  });

  it("null/undefined/빈 문자열은 박탈 아님 — false", () => {
    expect(isMembershipRevoked(null)).toBe(false);
    expect(isMembershipRevoked(undefined)).toBe(false);
    expect(isMembershipRevoked("")).toBe(false);
  });

  it("알 수 없는 status 는 보수적으로 유지 — false", () => {
    expect(isMembershipRevoked("PENDING")).toBe(false);
    expect(isMembershipRevoked("SOMETHING_NEW")).toBe(false);
  });
});
