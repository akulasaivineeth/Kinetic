import { test, expect } from '@playwright/test';
import { fillPushupReps } from '../fixtures/routes';
import { requireSignedIn } from '../fixtures/require-auth';

test.describe('log workout', { tag: ['@log', '@smoke'] }, () => {
  test.beforeEach(async ({ page }) => {
    await requireSignedIn(page);
  });

  test('log page shows session and submit control', async ({ page }) => {
    await page.goto('/log');
    await expect(page.getByText('CURRENT SESSION')).toBeVisible();
    await expect(page.getByRole('button', { name: /SUBMIT TO ARENA/i })).toBeVisible();
  });

  test('submit minimal log reaches dashboard', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/log');
    await fillPushupReps(page, '2');
    await page.getByRole('button', { name: /SUBMIT TO ARENA/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 25_000 });
  });

  test('edit submitted log flow when history exists', async ({ page }) => {
    await page.goto('/log');
    const noLogs = page.getByText('No submitted logs yet.');
    const recentBtn = page.locator('button').filter({ hasText: /reps •/i }).first();

    if (await noLogs.isVisible()) {
      test.skip(true, 'No submitted logs to edit');
    }

    await recentBtn.click();
    await expect(page.getByRole('button', { name: /UPDATE LOG|SUBMIT TO ARENA/i })).toBeVisible();
    await fillPushupReps(page, '3');
    await page.getByRole('button', { name: /UPDATE LOG/i }).click();
    await expect(page.getByText(/UPDATED|SUBMITTED/i).first()).toBeVisible({ timeout: 20_000 });
  });
});
