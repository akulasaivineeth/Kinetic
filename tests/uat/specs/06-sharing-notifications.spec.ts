import { test, expect } from '@playwright/test';
import { requireSignedIn } from '../fixtures/require-auth';

test.describe('sharing and notifications', { tag: ['@sharing'] }, () => {
  test.beforeEach(async ({ page }) => {
    await requireSignedIn(page);
  });

  test('sharing panel exposes email invite controls', async ({ page }) => {
    await page.goto('/profile');
    await page.getByTestId('uat-profile-sharing-card').click();
    await expect(page.getByPlaceholder('Search by email...')).toBeVisible();
    await expect(page.getByRole('button', { name: /^SEND$/i })).toBeVisible();
  });

  test('notification drawer opens with heading', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByTestId('uat-notifications-toggle').click();
    // Substring match would hit "No notifications yet" — use exact heading text
    await expect(page.getByText('NOTIFICATIONS', { exact: true })).toBeVisible();
    await expect(
      page.locator('.glass-card-elevated').filter({ hasText: 'NOTIFICATIONS' }).first()
    ).toBeVisible();
  });
});
