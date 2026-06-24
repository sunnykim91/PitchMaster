import { test, chromium, type Browser, type Page } from "@playwright/test";
import { playAudit } from "playwright-lighthouse";

/**
 * Lighthouse 종합 감사 (perf·a11y·best-practices·SEO). prod/라이브 대상.
 * 모바일 emulation + throttling 은 Lighthouse 가 자체 적용 (모바일 우선 서비스에 적합).
 * HTML 리포트는 lighthouse-report/ 에 저장 (gitignore). 점수는 콘솔에도 출력되며,
 * 하한(THRESHOLDS) 미달 시 실패 = 회귀 가드.
 */
const BASE_URL = process.env.PERF_BASE_URL || "https://pitch-master.app";
const PORT = 9222;

// `/` 는 비로그인 시 `/login`(=실제 랜딩 페이지)으로 리다이렉트되므로 랜딩은 `/login` 으로 직접 측정.
const PAGES = [
  { path: "/login", name: "landing" },
  { path: "/guide", name: "guide" },
  { path: "/pricing", name: "pricing" },
];

// 점수 하한 (0~100). 모바일 throttling 이라 perf 는 낮게 — 첫 실행 통과 + 큰 회귀만 잡는 수준.
const THRESHOLDS = { performance: 30, accessibility: 80, "best-practices": 75, seo: 80 };

test.describe.configure({ mode: "serial" });

test.describe("Lighthouse 감사 (prod 대상)", () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    // Lighthouse 가 붙을 수 있도록 remote debugging 포트를 연 별도 브라우저를 띄운다.
    browser = await chromium.launch({ args: [`--remote-debugging-port=${PORT}`] });
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await browser?.close();
  });

  for (const p of PAGES) {
    test(`${p.name} (${p.path})`, async () => {
      test.setTimeout(120_000);
      await page.goto(BASE_URL + p.path, { waitUntil: "networkidle" });
      await playAudit({
        page,
        port: PORT,
        thresholds: THRESHOLDS,
        reports: {
          formats: { html: true },
          name: `lighthouse-${p.name}`,
          directory: "lighthouse-report",
        },
      });
    });
  }
});
