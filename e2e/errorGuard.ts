import { test, expect } from "@playwright/test";

const HYDRATION_RE = /hydrat|did not match|Text content does not match|Minified React error #(418|423|425)/i;

/**
 * 하이드레이션 불일치·런타임 예외(pageerror / console.error)를 감지해 테스트를 실패시키는 가드.
 * 스펙 최상단에서 1회 호출한다. (인증 스펙은 authenticated/guard.ts 가 내부에서 호출)
 *
 * beforeEach 에서 리스너를 붙이므로(네비게이션 전), 각 테스트의 페이지 로드 중 발생한
 * 하이드레이션 에러를 afterEach 가 잡아낸다.
 */
export function installRuntimeErrorGuard() {
  const errors: string[] = [];
  test.beforeEach(({ page }) => {
    errors.length = 0;
    page.on("pageerror", (e) => {
      if (HYDRATION_RE.test(e.message)) errors.push(`pageerror: ${e.message.slice(0, 200)}`);
    });
    page.on("console", (m) => {
      if (m.type() === "error" && HYDRATION_RE.test(m.text())) {
        errors.push(`console: ${m.text().slice(0, 200)}`);
      }
    });
  });
  test.afterEach(() => {
    expect(errors, `런타임/하이드레이션 에러 감지:\n${errors.join("\n")}`).toEqual([]);
  });
}
