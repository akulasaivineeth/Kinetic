import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/** Always repo root — do not use __dirname from nested spec paths (that wrote `tests/.auth/` by mistake). */
const authFile = path.join(process.cwd(), '.auth', 'user.json');

/**
 * Google often blocks “Continue with Google” inside Playwright’s bundled Chromium
 * (“This browser or app may not be secure”). Setup uses your installed Chrome instead.
 * Set `UAT_SETUP_USE_PLAYWRIGHT_CHROMIUM=1` to force bundled Chromium (may still be blocked).
 */
const setupBrowser =
  process.env.UAT_SETUP_USE_PLAYWRIGHT_CHROMIUM === '1'
    ? {}
    : {
        channel: 'chrome' as const,
        ...devices['Desktop Chrome'],
        // Google still flags many Playwright launches; CDP export is the reliable path (see README).
        launchOptions: {
          ignoreDefaultArgs: ['--enable-automation'],
          args: ['--disable-blink-features=AutomationControlled'],
        },
      };

export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.UAT_WORKERS
    ? parseInt(process.env.UAT_WORKERS, 10)
    : process.env.CI
      ? 1
      : undefined,
  reporter: [
    ['list'],
    ['./reporters/issues-md-reporter.ts'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  /** Relative to this config file’s directory (`tests/uat/`). */
  outputDir: 'test-results',
  use: {
    // Default localhost (not 127.0.0.1) so it matches typical Google/Supabase redirect URLs.
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    // Pixel 5 uses Chromium; `iPhone 12` uses WebKit and breaks if only `chromium` was installed.
    ...devices['Pixel 5'],
  },
  webServer: process.env.UAT_SKIP_WEBSERVER
    ? undefined
    : {
        command: 'npm run dev',
        url: process.env.BASE_URL || 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 120_000,
      },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      timeout: 600_000,
      use: {
        ...setupBrowser,
        // Trace during teardown can slow or hang channel: 'chrome' shutdown
        trace: 'off',
      },
    },
    {
      name: 'guest',
      testMatch: /01-auth-guest\.spec\.ts/,
    },
    {
      name: 'chromium',
      testIgnore: [/auth\.setup\.ts/, /01-auth-guest\.spec\.ts/],
      dependencies: ['setup'],
      use: {
        storageState: authFile,
      },
    },
  ],
});
