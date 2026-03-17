import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("should load the landing page", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/PitchMaster/);
  });

  test("should have a login link", async ({ page }) => {
    await page.goto("/");
    const loginLink = page.getByRole("link", { name: /로그인|시작/i });
    await expect(loginLink).toBeVisible();
  });
});

test.describe("Login Page", () => {
  test("should load the login page", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/PitchMaster/);
  });

  test("should show Kakao login button", async ({ page }) => {
    await page.goto("/login");
    // Look for kakao login button or link
    const kakaoBtn = page.locator("text=/카카오|Kakao|로그인/i").first();
    await expect(kakaoBtn).toBeVisible();
  });
});
