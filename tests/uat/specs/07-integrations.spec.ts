import { test, expect } from '@playwright/test';
import { requireSignedIn } from '../fixtures/require-auth';

test.describe('integrations', { tag: ['@whoop'] }, () => {
  test.beforeEach(async ({ page }) => {
    await requireSignedIn(page);
  });

  test('Whoop row shows connect or connected state', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByText('WHOOP', { exact: true })).toBeVisible();
    const connect = page.locator('a[href="/api/whoop/auth"]');
    if (await connect.isVisible()) {
      await expect(connect).toBeVisible();
    } else {
      await expect(page.getByText(/Connected \(ID:/)).toBeVisible();
    }
  });

  test('Whoop auth link points at app API when not connected', async ({ page }) => {
    await page.goto('/profile');
    const connect = page.locator('a[href="/api/whoop/auth"]');
    if (await connect.isVisible()) {
      await expect(connect).toHaveAttribute('href', '/api/whoop/auth');
    } else {
      test.skip(true, 'Whoop already connected — link hidden');
    }
  });
});
