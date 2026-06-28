import { test, expect } from '@playwright/test';

test.describe('Obscura Core Settlement Flow', () => {
  test('should allow switching between Buyer and Supplier portal tabs', async ({ page }) => {
    await page.goto('/');

    // Verify buyer console is visible by default
    const buyerConsole = page.locator('#buyer-console');
    await expect(buyerConsole).toBeVisible();

    // Click Supplier View tab
    const supplierTabButton = page.getByRole('button', { name: /SUPPLIER VIEW/i });
    await supplierTabButton.click();

    // Verify supplier portal form is visible
    const supplierPortal = page.locator('#supplier-portal');
    await expect(supplierPortal).toBeVisible();
  });

  test('should simulate mock wallet connection', async ({ page }) => {
    await page.goto('/');

    const walletButton = page.locator('header button');
    await expect(walletButton).toBeVisible();

    // Connect wallet
    await walletButton.click();
    await expect(walletButton).toContainText(/GC32/i);
  });
});
