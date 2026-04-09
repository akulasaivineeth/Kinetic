import { test, expect } from '@playwright/test';
import { requireSignedIn } from '../fixtures/require-auth';

test.describe('arena filters and chart', { tag: ['@arena', '@filters'] }, () => {
  test.beforeEach(async ({ page }) => {
    await requireSignedIn(page);
  });

  test('date range and metric toggles', async ({ page }) => {
    await page.goto('/arena');
    await expect(page.getByTestId('uat-arena-page').getByRole('heading', { name: /ARENA/i })).toBeVisible();

    const f = page.getByTestId('uat-arena-filters');
    await f.getByRole('button', { name: 'MONTH', exact: true }).click();
    await f.getByRole('button', { name: '3MO', exact: true }).click();
    await f.getByRole('button', { name: 'WEEK', exact: true }).click();
    await f.getByRole('button', { name: 'PEAK', exact: true }).click();
    await f.getByRole('button', { name: 'VOLUME', exact: true }).click();
    await f.getByRole('button', { name: '% IMP.', exact: true }).click();
    await f.getByRole('button', { name: 'RAW', exact: true }).click();
  });

  test('intensity velocity card present', async ({ page }) => {
    await page.goto('/arena');
    await expect(page.getByText('INTENSITY VELOCITY')).toBeVisible();
  });

  test('podium or empty state visible', async ({ page }) => {
    await page.goto('/arena');
    await expect(
      page
        .getByText('Log sessions to start the competition')
        .or(page.getByText('YOU', { exact: true }))
        .first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
