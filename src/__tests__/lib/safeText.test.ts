import { describe, it, expect } from "vitest";
import { validateSafeName, sanitizeKakaoNickname } from "@/lib/validators/safeText";

describe("validateSafeName", () => {
  const opts = { maxLength: 20 };

  it("정상 한글 이름 통과", () => {
    expect(validateSafeName("홍길동", opts)).toEqual({ ok: true, value: "홍길동" });
  });

  it("정상 영문 이름 통과", () => {
    expect(validateSafeName("Kim Sun-hwi", opts)).toEqual({ ok: true, value: "Kim Sun-hwi" });
  });

  it("앞뒤 공백 trim", () => {
    expect(validateSafeName("  홍길동  ", opts)).toEqual({ ok: true, value: "홍길동" });
  });

  it("이모지 통과 (위험 문자 아님)", () => {
    expect(validateSafeName("🦁 사자", opts)).toEqual({ ok: true, value: "🦁 사자" });
  });

  it("빈 문자열 거부", () => {
    const r = validateSafeName("", opts);
    expect(r.ok).toBe(false);
  });

  it("공백만 거부", () => {
    const r = validateSafeName("   ", opts);
    expect(r.ok).toBe(false);
  });

  it("길이 초과 거부", () => {
    const r = validateSafeName("a".repeat(21), opts);
    expect(r.ok).toBe(false);
  });

  // 핵심 — SQL injection payload 거부
  it("'; DROP TABLE users; -- 거부", () => {
    const r = validateSafeName("'; DROP TABLE users; --", opts);
    expect(r.ok).toBe(false);
  });

  it("싱글쿼트 단독 거부", () => {
    expect(validateSafeName("O'Brien", opts).ok).toBe(false);
  });

  it("더블쿼트 거부", () => {
    expect(validateSafeName('She said "hi"', opts).ok).toBe(false);
  });

  it("세미콜론 거부", () => {
    expect(validateSafeName("user;name", opts).ok).toBe(false);
  });

  it("SQL 주석 -- 거부", () => {
    expect(validateSafeName("user--rest", opts).ok).toBe(false);
  });

  it("SQL 블록 주석 거부", () => {
    expect(validateSafeName("a/*x*/b", opts).ok).toBe(false);
  });

  it("HTML 태그 < > 거부", () => {
    expect(validateSafeName("<script>", opts).ok).toBe(false);
  });

  it("백슬래시 거부", () => {
    expect(validateSafeName("user\\name", opts).ok).toBe(false);
  });

  it("NULL byte 거부", () => {
    expect(validateSafeName("user\x00name", opts).ok).toBe(false);
  });

  it("제어 문자 거부", () => {
    expect(validateSafeName("user\x01name", opts).ok).toBe(false);
  });

  it("팀명 30자 옵션 통과", () => {
    expect(validateSafeName("a".repeat(30), { maxLength: 30 }).ok).toBe(true);
  });

  it("팀명 31자 옵션 거부", () => {
    expect(validateSafeName("a".repeat(31), { maxLength: 30 }).ok).toBe(false);
  });

  it("fieldLabel 적용된 에러 메시지", () => {
    const r = validateSafeName("", { maxLength: 30, fieldLabel: "팀 이름" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("팀 이름");
  });

  // 의미있는 문자 강제 (팀명용)
  const teamOpts = { maxLength: 30, minLength: 2, requireMeaningful: true, fieldLabel: "팀 이름" };

  it("팀명 '.' 거부 (한 글자)", () => {
    expect(validateSafeName(".", teamOpts).ok).toBe(false);
  });

  it("팀명 '..' 거부 (특수문자만)", () => {
    expect(validateSafeName("..", teamOpts).ok).toBe(false);
  });

  it("팀명 '안' 거부 (한 글자, minLength)", () => {
    expect(validateSafeName("안", teamOpts).ok).toBe(false);
  });

  it("팀명 'FC' 통과 (2자)", () => {
    expect(validateSafeName("FC", teamOpts).ok).toBe(true);
  });

  it("팀명 'FK Rebirth' 통과", () => {
    expect(validateSafeName("FK Rebirth", teamOpts).ok).toBe(true);
  });

  it("팀명 '⚽⚽' 거부 (이모지만, 의미문자 없음)", () => {
    expect(validateSafeName("⚽⚽", teamOpts).ok).toBe(false);
  });

  it("팀명 'FC⚽' 통과 (이모지+영문)", () => {
    expect(validateSafeName("FC⚽", teamOpts).ok).toBe(true);
  });

  it("팀명 'ㅁㄴㅇ' 거부 (자모만)", () => {
    expect(validateSafeName("ㅁㄴㅇ", teamOpts).ok).toBe(false);
  });

  it("팀명 'ㅏㅑㅓ' 거부 (모음만)", () => {
    expect(validateSafeName("ㅏㅑㅓ", teamOpts).ok).toBe(false);
  });

  it("팀명 'ㅋㅋ팀' 통과 (자모+한글 완성형)", () => {
    expect(validateSafeName("ㅋㅋ팀", teamOpts).ok).toBe(true);
  });
});

describe("sanitizeKakaoNickname", () => {
  it("정상 닉네임 그대로 반환", () => {
    expect(sanitizeKakaoNickname("김선휘")).toBe("김선휘");
  });

  it("위험 payload는 '사용자'로 폴백", () => {
    expect(sanitizeKakaoNickname("'; DROP TABLE users; --")).toBe("사용자");
  });

  it("null → 사용자", () => {
    expect(sanitizeKakaoNickname(null)).toBe("사용자");
  });

  it("undefined → 사용자", () => {
    expect(sanitizeKakaoNickname(undefined)).toBe("사용자");
  });

  it("빈 문자열 → 사용자", () => {
    expect(sanitizeKakaoNickname("")).toBe("사용자");
  });

  it("공백만 → 사용자", () => {
    expect(sanitizeKakaoNickname("   ")).toBe("사용자");
  });

  it("20자 초과 → 잘라서 반환", () => {
    const long = "가".repeat(25);
    expect(sanitizeKakaoNickname(long)).toBe("가".repeat(20));
  });

  it("이모지 닉네임 통과", () => {
    expect(sanitizeKakaoNickname("축구왕⚽")).toBe("축구왕⚽");
  });

  it("HTML 태그 닉네임 → 사용자", () => {
    expect(sanitizeKakaoNickname("<b>name</b>")).toBe("사용자");
  });
});
