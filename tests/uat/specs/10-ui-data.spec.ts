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

  test('dashboard personal trends: 3MO + percent mode still renders chart', async ({ page }) => {
    await page.goto('/dashboard');
    const trends = page.getByTestId('uat-dashboard-trends');
    await trends.getByRole('button', { name: '3MO', exact: true }).click();
    await trends.getByRole('button', { name: '% IMP.', exact: true }).click();
    const chart = page.getByTestId('uat-dashboard-trends-chart');
    await expect(chart.locator('svg')).toBeVisible({ timeout: 15_000 });
  });

  test('dashboard arena cards show numeric session stats when leaderboard loads', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText('PUSH-UPS')).toBeVisible();
    await expect(page.getByText('PLANK (MIN)')).toBeVisible();
    // At least one large numeric score (4xl) from metric cards
    await expect(page.locator('.text-4xl.font-black').first()).toBeVisible({ timeout: 15_000 });
  });

  test('arena 3MO range and percent mode: filters and standings respond', async ({ page }) => {
    await page.goto('/arena');
    const filters = page.getByTestId('uat-arena-filters');
    await filters.getByRole('button', { name: '3MO', exact: true }).click();
    await filters.getByRole('button', { name: '% IMP.', exact: true }).click();
    await expect(page.getByText('DETAILED STANDINGS')).toBeVisible();
    await expect(
      page.getByText('Log sessions to start the competition').or(page.getByText('YOU', { exact: true })).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('arena export button remains after range change', async ({ page }) => {
    await page.goto('/arena');
    await page.getByTestId('uat-arena-filters').getByRole('button', { name: 'MONTH', exact: true }).click();
    await expect(page.getByTestId('uat-arena-export')).toBeVisible();
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
