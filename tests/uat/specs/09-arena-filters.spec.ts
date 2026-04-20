import { test, expect } from '@playwright/test';
import { requireSignedIn } from '../fixtures/require-auth';

test.describe('squads hub scope', { tag: ['@arena', '@filters'] }, () => {
  test.beforeEach(async ({ page }) => {
    await requireSignedIn(page);
  });

  test('global and yours pills switch', async ({ page }) => {
    await page.goto('/squads');
    const root = page.getByTestId('uat-squads-page');
    await root.getByRole('button', { name: 'Global', exact: true }).click();
    await root.getByRole('button', { name: 'Yours', exact: true }).click();
    await expect(root).toBeVisible();
  });

  test('podium section or empty state visible', async ({ page }) => {
    await page.goto('/squads');
    await expect(
      page
        .getByText('This week — top 3')
        .or(page.getByText('No squads yet'))
        .or(page.getByText('No squads to show'))
        .first(),
    ).toBeVisible({ timeout: 15_000 });
  });
});
