import { test, type Page } from '@playwright/test';

/**
 * UAT storage state must match the Supabase project your app uses (see `NEXT_PUBLIC_DEBUG_MODE` /
 * `NEXT_PUBLIC_SUPABASE_PROFILE` and *_DEV / *_PROD keys in `.env.local`). Cookies from another
 * project send you back to `/` with the Google CTA.
 */
export async function requireSignedIn(page: Page) {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  const path = new URL(page.url()).pathname;
  if (path !== '/dashboard') {
    test.skip(
      true,
      'UAT auth: delete `.auth/user.json`, set `.env.local` to the Supabase project you will sign into, then run `npm run uat:export-auth` (or `uat:setup`) and `npm run uat` again.'
    );
  }
}
