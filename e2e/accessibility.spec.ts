import { test, expect } from "@playwright/test";

test.describe("Accessibility Basics", () => {
  test("landing page has proper HTML lang attribute", async ({ page }) => {
    await page.goto("/");
    const lang = await page.locator("html").getAttribute("lang");
    expect(lang).toBe("ko");
  });

  test("landing page has meta viewport", async ({ page }) => {
    await page.goto("/");
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute("content", /width=device-width/);
  });

  test("login page has proper heading structure", async ({ page }) => {
    await page.goto("/login");
    // Should have at least one heading
    const headings = page.locator("h1, h2, h3");
    await expect(headings.first()).toBeVisible();
  });

  test("PWA manifest is accessible", async ({ page }) => {
    await page.goto("/");
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute("href", "/manifest.json");

    // Verify manifest is valid JSON
    const response = await page.goto("/manifest.json");
    expect(response?.status()).toBe(200);
    const manifest = await response?.json();
    expect(manifest.name).toContain("PitchMaster");
    expect(manifest.display).toBe("standalone");
  });
});
