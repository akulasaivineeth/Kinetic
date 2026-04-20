import type { Page } from '@playwright/test';

export async function fillPushupReps(page: Page, value: string) {
  const input = page.getByTestId('uat-log-pushup-reps');
  if (!(await input.isVisible())) {
    await page.getByTestId('uat-log-tile-pushups').click();
  }
  await input.fill(value);
}
