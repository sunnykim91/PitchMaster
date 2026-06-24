import { test, expect } from "@playwright/test";
import { skipWhenUnauthenticated } from "./guard";

// guard.beforeEach 가 매 테스트 시작 시 /dashboard 로 이동 + 비로그인 시 skip.
skipWhenUnauthenticated();

test.describe("Dashboard (authenticated)", () => {
  test("대시보드가 로그인 상태로 로드된다", async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);
    // 데모 계정(isDemo) → "데모 모드" 안내 배너가 노출된다.
    await expect(page.getByText("데모 모드")).toBeVisible();
  });

  test("하단 탭바 4개 + 더보기가 보인다", async ({ page }) => {
    for (const id of ["tab-home", "tab-matches", "tab-records", "tab-dues", "tab-more"]) {
      await expect(page.locator(`[data-coach-id="${id}"]`)).toBeVisible();
    }
  });

  test("하단 탭바로 일정·기록·회비·홈을 오갈 수 있다", async ({ page }) => {
    // 각 이동 후 "활성 탭(text-primary)" 으로 바뀔 때까지 기다린다.
    // → App Router 전환이 커밋된 뒤 다음 클릭을 눌러 RSC 스트림 겹침(dev 오버레이)을 방지.
    const steps = [
      { id: "tab-matches", url: /\/matches/ },
      { id: "tab-records", url: /\/records/ },
      { id: "tab-dues", url: /\/dues/ },
      { id: "tab-home", url: /\/dashboard/ },
    ];
    for (const step of steps) {
      const tab = page.locator(`[data-coach-id="${step.id}"]`);
      await tab.click();
      await expect(page).toHaveURL(step.url);
      await expect(tab).toHaveClass(/text-primary/);
    }
  });

  test("햄버거 메뉴에 로그아웃·초대 코드가 보인다", async ({ page }) => {
    await page.locator('[data-coach-id="hamburger"]').click();
    // 데스크톱 사이드바(hidden lg:block)도 같은 내용을 DOM 에 두므로 열린 메뉴 다이얼로그로 스코프.
    const menu = page.getByRole("dialog").filter({ hasText: "메뉴" });
    await expect(menu.getByRole("button", { name: /로그아웃/ })).toBeVisible();
    await expect(menu.getByText("초대 코드")).toBeVisible();
  });
});
