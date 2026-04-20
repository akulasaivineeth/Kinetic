import { test, expect } from '@playwright/test';
import { fillPushupReps } from '../fixtures/routes';
import { requireSignedIn } from '../fixtures/require-auth';

test.describe('cross flows', { tag: ['@crossflow', '@smoke'] }, () => {
  test.beforeEach(async ({ page }) => {
    await requireSignedIn(page);
  });

  test('log submit then dashboard shows pulse section', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/log');
    await fillPushupReps(page, '1');
    await page.getByRole('button', { name: /^SUBMIT$/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 25_000 });
    await expect(page.getByTestId('uat-dashboard-pulse')).toBeVisible();
  });

  test('theme change then navigate across shell preserves layout', async ({ page }) => {
    await page.goto('/profile');
    await page.getByTestId('uat-profile-theme-toggle').click();
    await page.getByRole('link', { name: /Squads/i }).click();
    await expect(page).toHaveURL(/\/squads/);
    await expect(page.getByTestId('uat-squads-page').getByText(/^HUB$/)).toBeVisible();
    await page.getByRole('link', { name: /LOG/i }).click();
    await expect(page).toHaveURL(/\/log/);
    await expect(page.getByTestId('uat-log-page')).toBeVisible();
  });

  test('squads hub scope toggle after navigation', async ({ page }) => {
    await page.goto('/squads');
    await page.getByTestId('uat-squads-page').getByRole('button', { name: 'Squads', exact: true }).click();
    await page.getByTestId('uat-squads-page').getByRole('button', { name: 'Yours', exact: true }).click();
    await expect(page.getByTestId('uat-squads-page')).toBeVisible();
  });

  test('profile export link targets CSV API', async ({ page }) => {
    await page.goto('/profile');
    const exportLink = page.getByTestId('uat-profile-export-csv');
    await exportLink.scrollIntoViewIfNeeded();
    await expect(exportLink).toBeVisible();
    await expect(exportLink).toHaveAttribute('href', '/api/export');
  });
});
