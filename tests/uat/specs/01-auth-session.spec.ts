import { test, expect } from '@playwright/test';
import { requireSignedIn } from '../fixtures/require-auth';

test.describe('auth session', { tag: ['@auth', '@smoke'] }, () => {
  test.beforeEach(async ({ page }) => {
    await requireSignedIn(page);
  });

  test('authenticated user lands on dashboard from /', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { name: /^KINETIC$/i })).toBeVisible();
  });

  test('bottom nav reaches core routes', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByRole('link', { name: /LOG/i }).click();
    await expect(page).toHaveURL(/\/log/);
    await page.getByRole('link', { name: /ARENA/i }).click();
    await expect(page).toHaveURL(/\/arena/);
    await page.getByRole('link', { name: 'PROFILE', exact: true }).click();
    await expect(page).toHaveURL(/\/profile/);
    await page.getByRole('link', { name: /DASHBOARD/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('sign out returns to landing with Google CTA', async ({ page }) => {
    await page.goto('/profile');
    await page.getByRole('button', { name: /LOG OUT/i }).click();
    // Dashboard header also shows KINETIC — require landing-only tagline
    await expect(page.getByText('Performance Arena')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible({
      timeout: 15_000,
    });
  });
});
