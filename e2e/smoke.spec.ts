import { test, expect } from '@playwright/test';

test.describe('Obscura Smoke Tests', () => {
  test('should load the landing page successfully', async ({ page }) => {
    await page.goto('/');

    // Check page title
    await expect(page).toHaveTitle(/Obscura/i);

    // Check main headers
    const mainHeading = page.locator('h1');
    await expect(mainHeading).toContainText(/Confidential/i);
    await expect(mainHeading).toContainText(/B2B Settlement/i);
  });

  // Verify telemetry section is visible
  test('should verify system telemetry console is loaded', async ({ page }) => {
    await page.goto('/');
    const telemetry = page.locator('#telemetry-console');
    await expect(telemetry).toBeVisible();
    await expect(telemetry).toContainText(/SYSTEM TELEMETRY/i);
  });
});
