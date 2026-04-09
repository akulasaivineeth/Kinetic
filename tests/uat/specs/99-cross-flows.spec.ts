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
    await page.getByRole('button', { name: /SUBMIT TO ARENA/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 25_000 });
    await expect(page.getByTestId('uat-dashboard-pulse')).toBeVisible();
  });

  test('theme change then navigate across shell preserves layout', async ({ page }) => {
    await page.goto('/profile');
    await page.getByTestId('uat-profile-theme-toggle').click();
    await page.getByRole('link', { name: /ARENA/i }).click();
    await expect(page).toHaveURL(/\/arena/);
    await expect(page.getByRole('heading', { name: /ARENA/i })).toBeVisible();
    await page.getByRole('link', { name: /LOG/i }).click();
    await expect(page).toHaveURL(/\/log/);
    await expect(page.getByText('CURRENT SESSION')).toBeVisible();
  });

  test('arena export control then metric mode switch', async ({ page }) => {
    await page.goto('/arena');
    await page.getByTestId('uat-arena-export').click();
    const filters = page.getByTestId('uat-arena-filters');
    await filters.getByRole('button', { name: '% IMP.', exact: true }).click();
    await expect(filters.getByRole('button', { name: '% IMP.', exact: true })).toBeVisible();
  });

  test('profile export link targets CSV API', async ({ page }) => {
    await page.goto('/profile');
    const exportLink = page.getByTestId('uat-profile-export-csv');
    await exportLink.scrollIntoViewIfNeeded();
    await expect(exportLink).toBeVisible();
    await expect(exportLink).toHaveAttribute('href', '/api/export');
  });
});
