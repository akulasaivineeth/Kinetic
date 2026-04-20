import { test, expect } from '@playwright/test';
import { requireSignedIn } from '../fixtures/require-auth';

test.describe('squads hub', { tag: ['@arena', '@smoke'] }, () => {
  test.beforeEach(async ({ page }) => {
    await requireSignedIn(page);
  });

  test('squads hub header and actions', async ({ page }) => {
    await page.goto('/squads');
    const root = page.getByTestId('uat-squads-page');
    await expect(root.getByText(/^HUB$/)).toBeVisible();
    await expect(root.getByRole('link', { name: /New squad/i })).toBeVisible();
    await expect(root.getByRole('button', { name: /^Join$/i })).toBeVisible();
  });

  test('yours and squads scope toggles', async ({ page }) => {
    await page.goto('/squads');
    await page.getByRole('button', { name: 'Squads', exact: true }).click();
    await page.getByRole('button', { name: 'Yours', exact: true }).click();
    await expect(page.getByTestId('uat-squads-page')).toBeVisible();
  });
});
