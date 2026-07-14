import { describe, it, expect } from "vitest";
import {
  matchMemberByName,
  attributeDuesIncome,
  matchMemberByPartialName,
} from "@/lib/dues/matchMemberByName";

describe("matchMemberByName", () => {
  const members = [
    { id: "1", name: "이준" },
    { id: "2", name: "이준호" },
    { id: "3", name: "홍길동" },
  ];

  it("더 긴 이름 우선 — '이준호 회비'는 이준(짧은)이 아니라 이준호에 귀속", () => {
    expect(matchMemberByName("이준호 회비", members)?.id).toBe("2");
  });

  it("포함된 이름이 하나면 그 사람", () => {
    expect(matchMemberByName("홍길동 7월 회비", members)?.id).toBe("3");
    expect(matchMemberByName("이준 유니폼비", members)?.id).toBe("1");
  });

  it("동명이인처럼 최장 이름이 둘이면 모호 → null (자동 귀속 보류)", () => {
    const dup = [
      { id: "a", name: "김민수" },
      { id: "b", name: "김민수" },
    ];
    expect(matchMemberByName("김민수 회비", dup)).toBeNull();
  });

  it("매칭 없으면 null", () => {
    expect(matchMemberByName("없는사람 회비", members)).toBeNull();
  });

  it("빈 설명·이름 없는 멤버는 안전하게 null/무시", () => {
    expect(matchMemberByName("", members)).toBeNull();
    expect(matchMemberByName(null, members)).toBeNull();
    expect(matchMemberByName("홍길동", [{ id: "x", name: null }, { id: "3", name: "홍길동" }])?.id).toBe("3");
  });
});

describe("attributeDuesIncome — 레코드당 정확히 한 회원 귀속", () => {
  const members = [
    { id: "1", name: "이준", memberId: "m1" },
    { id: "2", name: "이준호", memberId: "m2" },
    { id: "3", name: "홍길동", memberId: "m3" },
  ];

  it("연동된 레코드(memberName)면 그 회원 우선 — description substring 이 다른 회원을 못 가로챔", () => {
    const r = { memberName: "이준호", description: "이준호 7월 회비" };
    expect(attributeDuesIncome(r, members)?.id).toBe("2");
  });

  it("연동 없으면 description 최장매칭 — '이준호 회비'는 이준호 하나만 (이준에 중복귀속 안 함)", () => {
    const r = { memberName: undefined, description: "이준호 회비" };
    expect(attributeDuesIncome(r, members)?.id).toBe("2");
  });

  it("연동 이름이 명단에 없거나 모호하면 description 매칭으로 폴백", () => {
    expect(attributeDuesIncome({ memberName: "탈퇴자", description: "홍길동 회비" }, members)?.id).toBe("3");
  });

  it("귀속 불가면 null", () => {
    expect(attributeDuesIncome({ memberName: null, description: "없는사람 회비" }, members)).toBeNull();
  });
});

describe("matchMemberByPartialName — OCR 부분 이름 보조매칭", () => {
  const members = [
    { id: "1", name: "이준호" },
    { id: "2", name: "김철수" },
    { id: "3", name: "김영희" },
  ];

  it("회원 이름이 읽힌 토큰을 포함하면 매칭 — OCR '이준' → 이준호", () => {
    expect(matchMemberByPartialName("이준", members)?.id).toBe("1");
  });

  it("토큰을 포함하는 회원이 둘 이상이면 모호 → null (배열 첫 임의반환 방지)", () => {
    expect(matchMemberByPartialName("김", members)).toBeNull();
  });

  it("빈 토큰·매칭 없음 → null", () => {
    expect(matchMemberByPartialName("", members)).toBeNull();
    expect(matchMemberByPartialName("박", members)).toBeNull();
  });
});
