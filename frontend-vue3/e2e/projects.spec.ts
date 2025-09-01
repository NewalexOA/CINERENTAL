import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/projects/paginated**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          { id: 1, name: 'Test Project 1', client_name: 'Client A', status: 'In Progress' },
          { id: 2, name: 'Test Project 2', client_name: 'Client B', status: 'Completed' },
        ],
        total: 2,
        pages: 1,
      }),
    });
  });
});

test('visits the projects page and sees the projects list', async ({ page }) => {
  await page.goto('/projects');
  await expect(page.locator('h1')).toHaveText(/Projects|Проекты/);

  await expect(page.locator('.project-grid > div')).toBeVisible();
});
