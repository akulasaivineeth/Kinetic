import { test as setup } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const authFile = path.join(process.cwd(), '.auth', 'user.json');

setup.describe.configure({ mode: 'serial' });

setup('authenticate and save storage state', async ({ page, browser }, testInfo) => {
  let existingCookieCount = -1;
  if (fs.existsSync(authFile)) {
    try {
      const j = JSON.parse(fs.readFileSync(authFile, 'utf8')) as { cookies?: unknown[] };
      existingCookieCount = Array.isArray(j.cookies) ? j.cookies.length : 0;
    } catch {
      existingCookieCount = -2;
    }
    if (existingCookieCount > 0) {
      // Playwright list reporter often hides console.log; stderr is easier to spot.
      // eslint-disable-next-line no-console
      console.error(
        `\n[UAT setup] Using existing ${authFile} (${existingCookieCount} cookies). Delete it to record a new session.\n`
      );
      testInfo.annotations.push({
        type: 'uat-auth',
        description: `reused storageState (${existingCookieCount} cookies)`,
      });
      // Do not call browser.close() here — it can tear down the worker and skip dependent chromium tests.
      return;
    }
    try {
      fs.unlinkSync(authFile);
    } catch {
      /* ignore */
    }
  }

  if (process.env.CI) {
    throw new Error(
      'Missing .auth/user.json. Add a saved Playwright storage state in CI (secret artifact) or run `npm run uat:setup` locally once (see tests/uat/README.md).'
    );
  }

  await page.goto('/');
  // pause() does NOT write user.json until you click Resume (▶) in the Playwright Inspector.
  // eslint-disable-next-line no-console
  console.log(
    '\n[UAT setup] Sign in in the browser (reach /dashboard), then press Resume in the Playwright Inspector to save .auth/user.json\n'
  );
  await page.pause();
  await fs.promises.mkdir(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });

  let savedCookies = 0;
  try {
    const saved = JSON.parse(await fs.promises.readFile(authFile, 'utf8')) as {
      cookies?: unknown[];
    };
    savedCookies = Array.isArray(saved.cookies) ? saved.cookies.length : 0;
  } catch {
    /* ignore */
  }
  // eslint-disable-next-line no-console
  console.error(
    `\n[UAT setup] ✓ Wrote ${authFile} (${savedCookies} cookies). Run: npm run uat\n`
  );
  testInfo.annotations.push({
    type: 'uat-auth',
    description: `saved storageState (${savedCookies} cookies)`,
  });

  await browser.close();
});
