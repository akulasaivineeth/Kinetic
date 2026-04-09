/**
 * Export Playwright storage state from a normal Chrome you started with remote debugging.
 * Google blocks OAuth in Playwright-driven Chrome; this path avoids that.
 *
 * 1) Close other Chromes using port 9222, then start Chrome (macOS example):
 *    /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
 *      --remote-debugging-port=9222 \
 *      --user-data-dir="$HOME/.kinetic-uat-chrome-profile"
 *
 * 2) In that window only: open http://localhost:3000 and sign in with Google until /dashboard.
 *
 * 3) From repo root:
 *    node tests/uat/scripts/export-auth-from-cdp.mjs
 *
 * Env: UAT_CDP_ENDPOINT (default http://localhost:9222)
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const endpoint = process.env.UAT_CDP_ENDPOINT || 'http://localhost:9222';
const authFile = path.join(process.cwd(), '.auth', 'user.json');

const browser = await chromium.connectOverCDP(endpoint);
try {
  const contexts = browser.contexts();
  if (!contexts.length) {
    console.error('No browser contexts. Open at least one tab in that Chrome window.');
    process.exit(1);
  }
  const context = contexts[0];
  const state = await context.storageState();
  const hasCookies = Array.isArray(state.cookies) && state.cookies.length > 0;
  if (!hasCookies) {
    console.warn(
      'Warning: exported storage has no cookies. Sign in on http://localhost:3000 in the debug Chrome window, then run this script again.'
    );
  }
  await fs.promises.mkdir(path.dirname(authFile), { recursive: true });
  await fs.promises.writeFile(authFile, JSON.stringify(state, null, 2), 'utf8');
  console.log(`Wrote ${authFile} (${state.cookies?.length ?? 0} cookies).`);
} finally {
  await browser.close();
}
