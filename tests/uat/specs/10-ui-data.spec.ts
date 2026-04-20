import { test, expect } from '@playwright/test';
import { requireSignedIn } from '../fixtures/require-auth';

/**
 * Deeper UI checks aligned with multi-month seeded logs (see `supabase/migrations/*seed*`).
 * Requires a signed-in user with workout_logs in Supabase for meaningful chart points.
 */
test.describe('UI data and multi-range toggles', { tag: ['@data', '@ui'] }, () => {
  test.beforeEach(async ({ page }) => {
    await requireSignedIn(page);
  });

  test('dashboard weekly bars and day labels render', async ({ page }) => {
    await page.goto('/dashboard');
    const pulse = page.getByTestId('uat-dashboard-pulse');
    await expect(pulse.getByText('Mon')).toBeVisible({ timeout: 15_000 });
    await expect(pulse.getByText('Sun')).toBeVisible();
  });

  test('pulse hero shows today effort and ring', async ({ page }) => {
    await page.goto('/dashboard');
    const pulse = page.getByTestId('uat-dashboard-pulse');
    await expect(pulse.getByText(/Today's effort/i)).toBeVisible({ timeout: 15_000 });
    await expect(pulse.locator('svg').first()).toBeVisible();
  });

  test('squads hub loads standings or empty state', async ({ page }) => {
    await page.goto('/squads');
    const root = page.getByTestId('uat-squads-page');
    await expect(
      root.getByText('Standings').or(root.getByText('No squads yet')).or(root.getByText('No squads to show')).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('squads scope toggle remains visible', async ({ page }) => {
    await page.goto('/squads');
    await page.getByTestId('uat-squads-page').getByRole('button', { name: 'Global', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Yours', exact: true })).toBeVisible();
  });

  test('profile data export card is reachable', async ({ page }) => {
    await page.goto('/profile');
    const exp = page.getByTestId('uat-profile-export-csv');
    await exp.scrollIntoViewIfNeeded();
    await expect(exp).toBeVisible();
    await expect(page.getByText('Export Data (CSV)')).toBeVisible();
  });

  test('log page history or empty state', async ({ page }) => {
    await page.goto('/log');
    await expect(
      page.getByText('No submitted logs yet.').or(page.getByText('CURRENT SESSION')).first()
    ).toBeVisible({ timeout: 15_000 });
  });
});
