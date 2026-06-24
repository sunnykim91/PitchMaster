import { test, expect } from "@playwright/test";
import { installRuntimeErrorGuard } from "./errorGuard";

installRuntimeErrorGuard();

test.describe("Landing Page", () => {
  test("should load the landing page", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/PitchMaster/);
  });

  test("should have a login link", async ({ page }) => {
    await page.goto("/");
    // 랜딩에는 카카오 시작 CTA가 여러 곳(헤더·히어로·하단)에 있으므로 첫 번째만 검증
    const loginLink = page.getByRole("link", { name: /로그인|시작/i }).first();
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
