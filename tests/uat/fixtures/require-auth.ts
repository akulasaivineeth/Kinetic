import { test, type Page } from '@playwright/test';

/**
 * UAT storage state must match `NEXT_PUBLIC_SUPABASE_URL` / anon key in `.env.local`.
 * Otherwise middleware leaves the browser on `/` with the Google CTA.
 */
export async function requireSignedIn(page: Page) {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  const path = new URL(page.url()).pathname;
  if (path !== '/dashboard') {
    test.skip(
      true,
      'UAT auth: `.auth/user.json` missing, expired, or not for this Supabase project. Run `npm run uat:setup` with matching `.env.local`.'
    );
  }
}
