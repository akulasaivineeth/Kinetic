import { test, expect } from '@playwright/test';

test.describe('auth guest', { tag: ['@auth', '@smoke'] }, () => {
  test('unauthenticated visit to /dashboard redirects to landing', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/?$/);
    await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible();
  });

  test('/unauthorized shows restricted copy', async ({ page }) => {
    await page.goto('/unauthorized');
    await expect(page.getByRole('heading', { name: /ACCESS RESTRICTED/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /RETURN TO BASE/i })).toBeVisible();
  });
});
