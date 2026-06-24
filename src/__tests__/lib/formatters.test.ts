import { describe, it, expect } from "vitest";
import { formatKstDateTime } from "@/lib/formatters";

/**
 * formatKstDateTime 은 하이드레이션 불일치를 막기 위한 결정론적 KST 포매터.
 * 핵심: 런타임 타임존/로케일에 의존하지 않고 UTC+9h 컴포넌트로 동일 문자열을 만든다.
 * (이 테스트는 러너 TZ 와 무관하게 항상 같은 값이어야 한다)
 */
describe("formatKstDateTime", () => {
  it("UTC 타임스탬프를 KST 오후 시각으로 변환한다", () => {
    // 05:00Z → KST 14:00
    expect(formatKstDateTime("2026-04-02T05:00:00Z")).toBe("4월 2일 오후 02:00");
  });

  it("오전 시각을 오전으로 표기한다", () => {
    // 00:30Z → KST 09:30
    expect(formatKstDateTime("2026-04-02T00:30:00Z")).toBe("4월 2일 오전 09:30");
  });

  it("자정(00시)은 오전 12:00, 정오(12시)는 오후 12:00", () => {
    // 15:00Z(전날) → KST 익일 00:00
    expect(formatKstDateTime("2026-04-01T15:00:00Z")).toBe("4월 2일 오전 12:00");
    // 03:00Z → KST 12:00
    expect(formatKstDateTime("2026-04-02T03:00:00Z")).toBe("4월 2일 오후 12:00");
  });

  it("+9h 로 날짜가 넘어가는 경우를 처리한다", () => {
    // 20:00Z → KST 익일 05:00
    expect(formatKstDateTime("2026-04-02T20:00:00Z")).toBe("4월 3일 오전 05:00");
  });

  it("withYear 옵션은 연도를 붙인다", () => {
    expect(formatKstDateTime("2026-04-02T05:00:00Z", { withYear: true })).toBe(
      "2026년 4월 2일 오후 02:00",
    );
  });

  it("Date 객체도 받는다", () => {
    expect(formatKstDateTime(new Date("2026-04-02T05:00:00Z"))).toBe("4월 2일 오후 02:00");
  });

  it("잘못된 입력은 빈 문자열", () => {
    expect(formatKstDateTime("not-a-date")).toBe("");
  });
});
