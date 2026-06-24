import { test, expect, type Page } from "@playwright/test";

/**
 * 권한별 UI 게이트 검증 — dev-login(/api/auth/dev-login, DEV_IMPERSONATE=1 + NODE_ENV!=production 게이트)으로
 * FC DEMO 의 STAFF/MEMBER 계정을 가장(impersonate)해 staffOnly 노출 차이를 확인한다.
 *
 * 로컬 전용: dev-login 이 비활성(CI/프로덕션)이거나 데모 계정이 없으면 각 테스트가 스스로 skip.
 */
const ORIGIN = "http://localhost:3000";
const ACCOUNTS = {
  member: "demo_서공격", // FC DEMO MEMBER
  staff: "demo_정공미", //  FC DEMO STAFF
};

/** dev-login 으로 가장. 성공 시 true(세션 쿠키 설정됨), 비활성/실패 시 false. */
async function loginAs(page: Page, kakaoId: string): Promise<boolean> {
  const res = await page.request.post("/api/auth/dev-login", {
    headers: { Origin: ORIGIN },
    data: { kakaoId },
  });
  return res.ok();
}

test.describe("권한별 UI 게이트 (dev-login 가장)", () => {
  test.beforeEach(async ({ page }) => {
    // 코치마크 1회 플래그 + dev 오버레이 차단 (다른 인증 스펙과 동일)
    await page.addInitScript(() => {
      try {
        localStorage.setItem("pm_coach_mark_v1", "1");
      } catch {
        /* ignore */
      }
      const s = document.createElement("style");
      s.textContent = "nextjs-portal{display:none!important;pointer-events:none!important}";
      (document.head || document.documentElement).appendChild(s);
    });
  });

  test("MEMBER 는 회비 '납부현황'(staffOnly) 탭을 못 본다", async ({ page }) => {
    test.skip(!(await loginAs(page, ACCOUNTS.member)), "dev-login 불가 (DEV_IMPERSONATE 미설정/계정 없음)");
    await page.goto("/dues");
    await expect(page).toHaveURL(/\/dues/);
    await expect(page.getByRole("tab", { name: "입출금" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "납부현황" })).toHaveCount(0);
    await expect(page.getByRole("tab", { name: "설정" })).toHaveCount(0);
  });

  test("STAFF 는 회비 '납부현황'·'설정'(staffOnly) 탭을 본다", async ({ page }) => {
    test.skip(!(await loginAs(page, ACCOUNTS.staff)), "dev-login 불가");
    await page.goto("/dues");
    await expect(page.getByRole("tab", { name: "납부현황" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "설정" })).toBeVisible();
  });

  test("MEMBER 햄버거에 '빠른 처리'(STAFF+) 그룹이 없다", async ({ page }) => {
    test.skip(!(await loginAs(page, ACCOUNTS.member)), "dev-login 불가");
    await page.goto("/dashboard");
    await page.locator('[data-coach-id="hamburger"]').click();
    const menu = page.getByRole("dialog").filter({ hasText: "메뉴" });
    await expect(menu).toBeVisible();
    await expect(menu.getByText("빠른 처리")).toHaveCount(0);
  });

  test("STAFF 햄버거에 '빠른 처리' 그룹이 있다", async ({ page }) => {
    test.skip(!(await loginAs(page, ACCOUNTS.staff)), "dev-login 불가");
    await page.goto("/dashboard");
    await page.locator('[data-coach-id="hamburger"]').click();
    const menu = page.getByRole("dialog").filter({ hasText: "메뉴" });
    await expect(menu.getByText("빠른 처리")).toBeVisible();
  });
});
