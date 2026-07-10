import { describe, it, expect } from "vitest";
import { matchMemberByName } from "@/lib/dues/matchMemberByName";

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
