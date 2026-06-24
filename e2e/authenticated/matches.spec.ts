import { test, expect } from "@playwright/test";
import { skipWhenUnauthenticated } from "./guard";

skipWhenUnauthenticated();

/** 경기 목록에서 실제 경기 상세(/matches/<id>) 링크들을 수집. 갤러리 등 비-경기 경로는 제외. */
async function collectMatchHrefs(page: import("@playwright/test").Page): Promise<string[]> {
  await page.goto("/matches");
  // 클라이언트 데이터 fetch 후 경기 카드가 렌더될 시간을 준다 (없으면 빈 상태로 진행).
  await page
    .locator('a[href^="/matches/"]')
    .first()
    .waitFor({ state: "visible", timeout: 8000 })
    .catch(() => {});
  return page.locator('a[href^="/matches/"]').evaluateAll((els) =>
    Array.from(
      new Set(
        els
          .map((e) => e.getAttribute("href"))
          .filter((h): h is string => !!h && /^\/matches\/[0-9a-f-]{8,}/i.test(h)),
      ),
    ),
  );
}

test.describe("Matches (authenticated)", () => {
  test("경기 목록이 로그인 상태로 로드된다", async ({ page }) => {
    await page.goto("/matches");
    await expect(page).toHaveURL(/\/matches/);
    // 비로그인이면 /login 으로 튕기므로 탭바 존재로 로그인 상태를 재확인.
    await expect(page.locator('[data-coach-id="tab-matches"]')).toBeVisible();
  });

  test("경기 상세로 진입하면 6탭(정보·투표…)이 보인다", async ({ page }) => {
    const hrefs = await collectMatchHrefs(page);
    test.skip(hrefs.length === 0, "데모 팀에 경기가 없음 — skip");

    await page.goto(hrefs[0]);
    await expect(page.getByRole("tablist", { name: "경기 상세 탭" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "정보" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "투표" })).toBeVisible();
  });

  test("기록 페이지가 로그인 상태로 로드된다", async ({ page }) => {
    await page.goto("/records");
    await expect(page).toHaveURL(/\/records/);
    await expect(page.locator('[data-coach-id="tab-records"]')).toBeVisible();
  });
});
