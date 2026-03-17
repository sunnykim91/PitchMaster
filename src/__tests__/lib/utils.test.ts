import { describe, it, expect } from "vitest";
import { cn, formatPhone, stripPhone, formatTime, formatDateTime } from "@/lib/utils";

// ─── cn ──────────────────────────────────────────────────────────────────────
describe("cn", () => {
  it("단일 클래스 반환", () => {
    expect(cn("foo")).toBe("foo");
  });

  it("여러 클래스 병합", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("Tailwind 충돌 해결 (마지막 값 우선)", () => {
    expect(cn("p-4", "p-8")).toBe("p-8");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("조건부 클래스 - falsy 무시", () => {
    expect(cn("base", false && "disabled", undefined, null, "active")).toBe(
      "base active"
    );
  });

  it("빈 입력 처리", () => {
    expect(cn()).toBe("");
  });
});

// ─── formatPhone ─────────────────────────────────────────────────────────────
describe("formatPhone", () => {
  it("3자리 이하: 그대로 반환", () => {
    expect(formatPhone("010")).toBe("010");
    expect(formatPhone("01")).toBe("01");
  });

  it("4~7자리: 010-XXXX 형태", () => {
    expect(formatPhone("01012")).toBe("010-12");
    expect(formatPhone("0101234")).toBe("010-1234");
  });

  it("8자리 이상: 010-XXXX-XXXX 형태", () => {
    expect(formatPhone("01012345678")).toBe("010-1234-5678");
  });

  it("11자리 초과: 11자리만 사용", () => {
    expect(formatPhone("010123456789999")).toBe("010-1234-5678");
  });

  it("하이픈 포함 입력도 정규화", () => {
    expect(formatPhone("010-1234-5678")).toBe("010-1234-5678");
  });

  it("비숫자 문자 제거 후 포맷", () => {
    expect(formatPhone("010 1234 5678")).toBe("010-1234-5678");
  });

  it("빈 문자열 처리", () => {
    expect(formatPhone("")).toBe("");
  });
});

// ─── stripPhone ──────────────────────────────────────────────────────────────
describe("stripPhone", () => {
  it("하이픈 제거", () => {
    expect(stripPhone("010-1234-5678")).toBe("01012345678");
  });

  it("공백 제거", () => {
    expect(stripPhone("010 1234 5678")).toBe("01012345678");
  });

  it("이미 숫자만인 경우 그대로", () => {
    expect(stripPhone("01012345678")).toBe("01012345678");
  });

  it("빈 문자열 처리", () => {
    expect(stripPhone("")).toBe("");
  });
});

// ─── formatTime ──────────────────────────────────────────────────────────────
describe("formatTime", () => {
  it("HH:MM:SS → HH:MM 변환", () => {
    expect(formatTime("14:30:00")).toBe("14:30");
  });

  it("HH:MM 이미 포맷된 경우 그대로", () => {
    expect(formatTime("09:00")).toBe("09:00");
  });

  it("ISO datetime에서 시간 추출", () => {
    expect(formatTime("2025-03-16T17:00:00")).toBe("17:00");
    expect(formatTime("2025-03-16T17:00")).toBe("17:00");
  });

  it("빈 문자열 → 빈 문자열 반환", () => {
    expect(formatTime("")).toBe("");
  });
});

// ─── formatDateTime ──────────────────────────────────────────────────────────
describe("formatDateTime", () => {
  it("ISO datetime → YYYY-MM-DD HH:MM 형태", () => {
    expect(formatDateTime("2025-03-16T17:00:00")).toBe("2025-03-16 17:00");
  });

  it("datetime-local 형식 처리", () => {
    expect(formatDateTime("2025-03-16T09:30")).toBe("2025-03-16 09:30");
  });

  it("빈 문자열 → 빈 문자열 반환", () => {
    expect(formatDateTime("")).toBe("");
  });

  it("날짜만 있는 경우 날짜만 반환", () => {
    // 시간 파트가 없으면 날짜만 반환
    const result = formatDateTime("2025-03-16");
    expect(result).toMatch(/^2025-03-16/);
  });
});
