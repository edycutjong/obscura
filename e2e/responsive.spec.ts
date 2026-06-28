import { test, expect } from '@playwright/test';

test.describe('Obscura Responsive Design Tests', () => {
  test('should display correctly on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    // Check navigation links are visible on desktop
    const desktopNav = page.locator('nav');
    await expect(desktopNav).toBeVisible();
  });

  test('should adjust layout on mobile viewport', async ({ page }) => {
    // Standard iPhone 12/13/14 viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    // Check main layout container exists without horizontal overflow problems
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Verify desktop nav is hidden on mobile
    const desktopNav = page.locator('nav');
    await expect(desktopNav).toBeHidden();
  });
});
