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

    const connectButton = page.getByRole('button', { name: /CONNECT WALLET/i });
    await expect(connectButton).toBeVisible();

    // Real Freighter needs the browser extension, unavailable in CI — the Demo
    // button loads a predefined sandbox identity instead.
    const demoButton = page.getByRole('button', { name: /^DEMO$/i });
    await demoButton.click();

    // After connecting, the header shows the connected sandbox address
    await expect(page.locator('header').getByText(/GC32/i)).toBeVisible();
  });
});
