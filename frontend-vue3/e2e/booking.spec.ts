import { test, expect } from '@playwright/test';

test.describe('Booking E2E Scenario', () => {
  test('should display the equipment list', async ({ page }) => {
    await page.goto('/equipment');
    await expect(page.locator('h1')).toHaveText('Equipment Catalog');
    await expect(page.locator('.equipment-grid')).toBeVisible();
  });
});
