import { test, expect } from "@playwright/test";

/**
 * 데모 세션이 없으면(CI/placeholder DB 등 setup 이 빈 storageState 를 남긴 경우)
 * 인증 테스트를 통째로 skip 한다. 각 인증 spec 최상단에서 1회 호출.
 *
 * /dashboard 로 이동했을 때 /login 으로 튕기면 = 비로그인 상태로 판단.
 */
export function skipWhenUnauthenticated() {
  // 하이드레이션 불일치·런타임 예외 감지용 (타임스탬프 locale 등 이 클래스 재발 자동 차단)
  const runtimeErrors: string[] = [];
  const HYDRATION_RE = /hydrat|did not match|Text content does not match|Minified React error #(418|423|425)/i;

  test.beforeEach(async ({ page }) => {
    runtimeErrors.length = 0;
    page.on("pageerror", (e) => {
      if (HYDRATION_RE.test(e.message)) runtimeErrors.push(`pageerror: ${e.message.slice(0, 200)}`);
    });
    page.on("console", (m) => {
      if (m.type() === "error" && HYDRATION_RE.test(m.text())) {
        runtimeErrors.push(`console: ${m.text().slice(0, 200)}`);
      }
    });

    // 첫 방문 온보딩 코치마크(z-[200] 모달 오버레이)가 탭바·햄버거 클릭을 가로채므로
    // 노출 1회 플래그(localStorage["pm_coach_mark_v1"])를 미리 심어 차단한다.
    await page.addInitScript(() => {
      try {
        localStorage.setItem("pm_coach_mark_v1", "1");
      } catch {
        /* localStorage 차단 환경 — 무시 */
      }
      // Next.js dev 에러 오버레이(<nextjs-portal>)가 빠른 RSC 네비게이션 중
      // "Connection closed"(turbopack dev 잡음)로 떠서 클릭을 가로채는 것을 차단.
      // 앱 자체는 정상 렌더되므로 오버레이만 비활성화한다 (display:none).
      const css = "nextjs-portal{display:none!important;pointer-events:none!important}";
      const apply = () => {
        const head = document.head || document.documentElement;
        if (head) {
          const s = document.createElement("style");
          s.textContent = css;
          head.appendChild(s);
        } else {
          requestAnimationFrame(apply);
        }
      };
      apply();
    });
    await page.goto("/dashboard");
    if (new URL(page.url()).pathname.startsWith("/login")) {
      test.skip(true, "데모 로그인 불가 — 인증 E2E skip (로컬 .env + 데모 계정 필요)");
    }
  });

  test.afterEach(() => {
    expect(runtimeErrors, `런타임/하이드레이션 에러 감지:\n${runtimeErrors.join("\n")}`).toEqual([]);
  });
}
