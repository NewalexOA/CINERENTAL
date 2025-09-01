import { test, expect } from '@playwright/test';

test('visits the projects page and sees the projects list', async ({ page }) => {
  await page.goto('/projects');
  await expect(page.locator('h1')).toHaveText('Projects');

  // The mock server should be running and providing the data
  await expect(page.locator('.project-grid > div')).toHaveCount(2);
  await expect(page.locator('.project-grid > div:nth-child(1)')).toContainText('Test Project 1');
  await expect(page.locator('.project-grid > div:nth-child(2)')).toContainText('Test Project 2');
});
