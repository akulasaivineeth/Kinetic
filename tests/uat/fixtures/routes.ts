import type { Page } from '@playwright/test';

export async function fillPushupReps(page: Page, value: string) {
  await page.getByTestId('uat-log-pushup-reps').fill(value);
}
