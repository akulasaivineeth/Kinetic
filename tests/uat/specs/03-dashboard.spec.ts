import { test, expect } from '@playwright/test';
import { requireSignedIn } from '../fixtures/require-auth';

test.describe('dashboard', { tag: ['@dashboard', '@smoke'] }, () => {
  test.beforeEach(async ({ page }) => {
    await requireSignedIn(page);
  });

  test('dashboard shows stamina and personal trends', async ({ page }) => {
    await page.goto('/dashboard');
    const stamina = page.getByTestId('uat-dashboard-stamina');
    await stamina.scrollIntoViewIfNeeded();
    await expect(stamina.getByText('STAMINA SCORE')).toBeVisible();
    await expect(page.getByTestId('uat-dashboard-trends').getByText('PERSONAL TRENDS')).toBeVisible();
  });

  test('dashboard arena strip and range controls', async ({ page }) => {
    await page.goto('/dashboard');
    const arena = page.getByTestId('uat-dashboard-arena-section');
    await expect(arena.locator('h3').filter({ hasText: /ARENA/i })).toBeVisible();
    await expect(arena.getByRole('button', { name: 'VOLUME', exact: true })).toBeVisible();
  });
});
