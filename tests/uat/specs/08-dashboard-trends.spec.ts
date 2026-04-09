import { test, expect } from '@playwright/test';
import { requireSignedIn } from '../fixtures/require-auth';

test.describe('dashboard trends and arena toggles', { tag: ['@dashboard', '@trends'] }, () => {
  test.beforeEach(async ({ page }) => {
    await requireSignedIn(page);
  });

  test('personal trends date tabs and metric toggles respond', async ({ page }) => {
    await page.goto('/dashboard');
    const trendsSection = page.getByTestId('uat-dashboard-trends');
    await expect(trendsSection).toBeVisible();

    await trendsSection.getByRole('button', { name: 'MONTH', exact: true }).click();
    await trendsSection.getByRole('button', { name: '3MO', exact: true }).click();
    await trendsSection.getByRole('button', { name: 'WEEK', exact: true }).click();

    await trendsSection.getByRole('button', { name: 'PLANK', exact: true }).click();
    await trendsSection.getByRole('button', { name: 'RUN', exact: true }).click();
    await trendsSection.getByRole('button', { name: 'PUSH-UPS', exact: true }).click();
    await trendsSection.getByRole('button', { name: 'PEAK', exact: true }).click();
    await trendsSection.getByRole('button', { name: 'VOLUME', exact: true }).click();
    await trendsSection.getByRole('button', { name: '% IMP.', exact: true }).click();
    await trendsSection.getByRole('button', { name: 'RAW', exact: true }).click();
  });

  test('this week arena header toggles respond', async ({ page }) => {
    await page.goto('/dashboard');
    const arena = page.getByTestId('uat-dashboard-arena-section');
    await expect(arena).toBeVisible();

    await arena.getByRole('button', { name: 'PEAK', exact: true }).click();
    await arena.getByRole('button', { name: 'VOLUME', exact: true }).click();
    await arena.getByRole('button', { name: '% IMP.', exact: true }).click();
    await arena.getByRole('button', { name: 'RAW', exact: true }).click();
  });

  test('performance velocity chart region present', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByTestId('uat-dashboard-trends-chart')).toBeVisible();
    await expect(page.getByText('PERFORMANCE')).toBeVisible();
    await expect(page.getByText('VELOCITY')).toBeVisible();
  });
});
