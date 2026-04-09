import { test, expect } from '@playwright/test';
import { requireSignedIn } from '../fixtures/require-auth';

test.describe('arena', { tag: ['@arena', '@smoke'] }, () => {
  test.beforeEach(async ({ page }) => {
    await requireSignedIn(page);
  });

  test('arena header and export', async ({ page }) => {
    await page.goto('/arena');
    await expect(page.getByTestId('uat-arena-page').getByRole('heading', { name: /ARENA/i })).toBeVisible();
    await expect(page.getByText('LIVE RANKINGS')).toBeVisible();
    await expect(page.getByTestId('uat-arena-export')).toBeVisible();
  });

  test('arena metric toggles visible', async ({ page }) => {
    await page.goto('/arena');
    const filters = page.getByTestId('uat-arena-filters');
    await expect(filters.getByRole('button', { name: 'VOLUME', exact: true })).toBeVisible();
    await expect(filters.getByRole('button', { name: 'RAW', exact: true })).toBeVisible();
  });
});
