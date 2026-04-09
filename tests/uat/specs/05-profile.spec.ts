import { test, expect } from '@playwright/test';
import { requireSignedIn } from '../fixtures/require-auth';

test.describe('profile', { tag: ['@profile', '@smoke'] }, () => {
  test.beforeEach(async ({ page }) => {
    await requireSignedIn(page);
  });

  test('profile shows account, Whoop row, and appearance', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByText('CONNECTED ACCOUNT')).toBeVisible();
    await expect(page.getByText('WHOOP', { exact: true })).toBeVisible();
    await expect(page.getByText('Appearance')).toBeVisible();
    await expect(page.getByText(/Elite dark — full app|Light — full app/)).toBeVisible();
  });

  test('theme toggle is actionable', async ({ page }) => {
    await page.goto('/profile');
    const toggle = page.getByTestId('uat-profile-theme-toggle');
    await expect(toggle).toBeVisible();
    await toggle.click();
  });
});
