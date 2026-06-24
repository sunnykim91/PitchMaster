import { test, expect, type Page } from "@playwright/test";

/**
 * 경량 Core Web Vitals + 리소스 weight 측정 (의존성 0).
 * prod/라이브 대상 (playwright.perf.config.ts). 실제 값은 콘솔 표로 출력하고,
 * 회귀 가드용 예산(넉넉하게)만 assert 한다 — 네트워크 변동에 의한 flaky 방지.
 */

type Vitals = {
  url: string;
  ttfb: number;
  fcp: number;
  lcp: number;
  cls: number;
  domContentLoaded: number;
  load: number;
  requests: number;
  transferKB: number;
};

// 공개 핵심 페이지 (인증 불필요). `/` 는 비로그인 시 `/login`(=실제 랜딩 페이지)으로 리다이렉트되므로
// 랜딩은 `/login` 으로 직접 측정한다. (서로 다른 페이지를 재기 위함)
const PAGES = [
  { path: "/login", name: "랜딩(로그인)" },
  { path: "/guide", name: "가이드 허브(SEO)" },
  { path: "/pricing", name: "요금제" },
];

// 회귀 가드 예산 (모바일·네트워크 변동 흡수 위해 관대하게 — 큰 회귀만 잡음). 튜닝은 자유.
const BUDGET = { lcp: 9000, cls: 0.25, transferKB: 4000 };

// Google Core Web Vitals 판정 기준 (검토용 — 가드와 별개로 실태를 표시)
function verdict(metric: "lcp" | "fcp" | "cls", value: number): string {
  const t = {
    lcp: [2500, 4000],
    fcp: [1800, 3000],
    cls: [0.1, 0.25],
  }[metric];
  if (value <= t[0]) return "✅ 좋음";
  if (value <= t[1]) return "🟡 개선필요";
  return "🔴 나쁨";
}

async function measure(page: Page, path: string): Promise<Vitals> {
  // 네비게이션 전에 LCP/CLS 옵저버 주입 (이후 페이지에서 누적)
  await page.addInitScript(() => {
    const w = window as unknown as { __vitals: { lcp: number; cls: number } };
    w.__vitals = { lcp: 0, cls: 0 };
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          w.__vitals.lcp = (e as PerformanceEntry & { startTime: number }).startTime;
        }
      }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          const ls = e as PerformanceEntry & { value: number; hadRecentInput: boolean };
          if (!ls.hadRecentInput) w.__vitals.cls += ls.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch {
      /* 일부 항목 미지원 브라우저 — 무시 */
    }
  });

  await page.goto(path, { waitUntil: "load" });
  // LCP/CLS 안정화 대기 (prod 라 HMR 소켓 없어 networkidle 신뢰 가능)
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(1500);

  return page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const fcp = performance.getEntriesByType("paint").find((e) => e.name === "first-contentful-paint")?.startTime ?? 0;
    const res = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    const transfer = res.reduce((s, r) => s + (r.transferSize || 0), 0) + (nav?.transferSize || 0);
    const v = (window as unknown as { __vitals: { lcp: number; cls: number } }).__vitals;
    return {
      url: location.pathname,
      ttfb: Math.round(nav?.responseStart ?? 0),
      fcp: Math.round(fcp),
      lcp: Math.round(v.lcp),
      cls: Math.round(v.cls * 1000) / 1000,
      domContentLoaded: Math.round(nav?.domContentLoadedEventEnd ?? 0),
      load: Math.round(nav?.loadEventEnd ?? 0),
      requests: res.length + 1,
      transferKB: Math.round(transfer / 1024),
    };
  });
}

test.describe("Web Vitals (prod 대상)", () => {
  for (const p of PAGES) {
    test(`${p.name} (${p.path})`, async ({ page }) => {
      const v = await measure(page, p.path);
      /* eslint-disable no-console */
      console.log(`\n[Web Vitals] ${p.name} — ${v.url}`);
      console.table([
        { 지표: "LCP", 값: `${v.lcp}ms`, 판정: verdict("lcp", v.lcp) },
        { 지표: "FCP", 값: `${v.fcp}ms`, 판정: verdict("fcp", v.fcp) },
        { 지표: "CLS", 값: v.cls, 판정: verdict("cls", v.cls) },
        { 지표: "TTFB", 값: `${v.ttfb}ms`, 판정: "-" },
        { 지표: "DOMContentLoaded", 값: `${v.domContentLoaded}ms`, 판정: "-" },
        { 지표: "Load", 값: `${v.load}ms`, 판정: "-" },
        { 지표: "요청수", 값: v.requests, 판정: "-" },
        { 지표: "전송량(KB)", 값: v.transferKB, 판정: "-" },
      ]);
      /* eslint-enable no-console */

      // 회귀 가드 (egregious 회귀만 잡는 관대 예산)
      expect(v.lcp, "LCP 예산 초과").toBeLessThan(BUDGET.lcp);
      expect(v.cls, "CLS 예산 초과").toBeLessThan(BUDGET.cls);
      expect(v.transferKB, "전송량 예산 초과").toBeLessThan(BUDGET.transferKB);
    });
  }
});
