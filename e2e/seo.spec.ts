import { test, expect } from "@playwright/test";

/**
 * 공개 SEO / 인프라 스모크 (비로그인, CI-safe).
 * 실 서비스가 SEO 유입에 의존하고, 과거 canonical/sitemap 불일치로 "색인 0" 사고가 있었던 영역을
 * 직접 가드한다. sitemap.ts/robots.ts 는 prod URL 을 하드코딩하므로 dev 서버에서도 동일하게 검증 가능.
 */
test.describe("SEO / 인프라 (공개)", () => {
  test("sitemap.xml 이 핵심 공개 URL을 포함한다", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const xml = await res.text();
    for (const u of ["/login", "/guide", "/privacy", "/terms"]) {
      expect(xml, `sitemap 에 ${u} 누락`).toContain(`https://pitch-master.app${u}`);
    }
    // 가이드 본문(블로그) 최소 1개
    expect(xml).toMatch(/https:\/\/pitch-master\.app\/guide\/[^<]+</);
  });

  test("robots.txt 가 sitemap을 가리키고 인증영역을 차단한다", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const txt = await res.text();
    expect(txt).toContain("Sitemap: https://pitch-master.app/sitemap.xml");
    expect(txt).toMatch(/Disallow:\s*\/api\//);
    expect(txt).toMatch(/Disallow:\s*\/dashboard/);
  });

  test("랜딩(/login) canonical 이 prod 도메인을 가리킨다", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /^https:\/\/pitch-master\.app/,
    );
  });

  test("랜딩(/login) 에 OG 메타(title·image)가 있다", async ({ page }) => {
    await page.goto("/login");
    expect(await page.locator('meta[property="og:title"]').count()).toBeGreaterThan(0);
    expect(await page.locator('meta[property="og:image"]').count()).toBeGreaterThan(0);
  });
});
