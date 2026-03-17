import { test, expect } from "@playwright/test";

test.describe("Navigation & Routing", () => {
  test("unauthenticated user is redirected to login", async ({ page }) => {
    await page.goto("/dashboard");
    // Should redirect to login or show login page
    await page.waitForURL(/\/(login|$)/);
    expect(page.url()).toMatch(/\/(login|$)/);
  });

  test("offline page loads", async ({ page }) => {
    await page.goto("/offline");
    await expect(page.locator("body")).toContainText(/오프라인|offline|연결/i);
  });

  test("non-existent page shows 404", async ({ page }) => {
    const response = await page.goto("/non-existent-page-xyz");
    expect(response?.status()).toBe(404);
  });
});
