# Kinetic UAT (Playwright)

Browser UAT for the Next.js app. OpenClaw (or any runner) can execute **`npm run uat`** after the dev server is up and auth storage exists.

## Prerequisites

1. **Env**: Copy `.env.local` from `.env.example` / your secrets so `npm run dev` can reach Supabase and auth.
2. **Browsers** (once per machine): `npx playwright install chromium` (or `npx playwright install` if you see **Executable doesn't exist** for headless shell).
3. **Auth storage** (once per machine, or when the session expires): see below.
4. If **`next dev` + UAT** throws missing `.next/server/app/page.js` or invariant errors, stop the server, run **`rm -rf .next`**, start dev again, re-run UAT. Optional: **`UAT_WORKERS=2 npm run uat`** to ease HMR load.

## Record Google session (`storageState`)

Google OAuth is not scripted. You save a real session to a **gitignored** file at **`.auth/user.json`** (repo root).

Default **`BASE_URL`** for UAT is **`http://localhost:3000`** so cookies match the same host you use when signing in manually. If you use **`127.0.0.1`** for the app, set `BASE_URL=http://127.0.0.1:3000` for both dev and UAT, or Google cookies will not apply.

### Recommended: sign in with normal Chrome, then export (bypasses Google blocking Playwright)

Even real Chrome is still **remote-controlled** by Playwright during `uat:setup`, and Google often shows **“This browser or app may not be secure”** anyway. The reliable fix is: **you** open Chrome **without** Playwright, sign in, then we **attach once** and dump storage.

1. **Quit** other Chrome windows that might be using the same profile (or pick a fresh user-data dir below).
2. Start Chrome with remote debugging (macOS):

   ```bash
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
     --remote-debugging-port=9222 \
     --user-data-dir="$HOME/.kinetic-uat-chrome-profile"
   ```

   On Windows/Linux, run `chrome` / `google-chrome` with the same two flags (use a dedicated `--user-data-dir`).

3. In **that** window only, open **`http://localhost:3000`**, complete **Continue with Google**, and reach **`/dashboard`**.
4. From the **Kinetic repo root**:

   ```bash
   npm run uat:export-auth
   ```

   This writes **`.auth/user.json`**. It does **not** close your Chrome window (Playwright only disconnects).

5. Run UAT: `UAT_SKIP_WEBSERVER=1 npm run uat` (or `npm run uat`).

Optional: `UAT_CDP_ENDPOINT=http://127.0.0.1:9222 npm run uat:export-auth` if you use a non-default CDP URL.

### Alternative: `npm run uat:setup`

1. Install **Google Chrome**.
2. `npm run dev` and `npm run uat:setup`.
3. In the Playwright-driven Chrome window, sign in, then resume the inspector.

Setup uses **`channel: 'chrome'`** plus flags that hide some automation signals; Google may still block this path.

### “This browser or app may not be secure” (Google)

That usually means Google is rejecting a **controlled** browser. Use the **CDP + `uat:export-auth`** flow above if `uat:setup` still fails.

Also check:

- [Google Cloud Console](https://console.cloud.google.com/) → OAuth client → **Authorized JavaScript origins** and **redirect URIs** match Supabase (Supabase → Authentication → URL Configuration).
- `UAT_SETUP_USE_PLAYWRIGHT_CHROMIUM=1` forces bundled Chromium for setup only (usually **worse** for Google).

If you previously saved under `tests/.auth/`, move the file: `mkdir -p .auth && mv tests/.auth/user.json .auth/user.json` (then re-run setup if cookies are still empty).

Never commit `.auth/`. Use a dedicated test Google account if possible.

### CI

Set `CI=true` and provide a valid `storageState` JSON (e.g. from a secure artifact). If the file is missing in CI, the setup project throws a clear error instead of hanging.

To run tests **without** auto-starting the dev server (you already have it running):

```bash
UAT_SKIP_WEBSERVER=1 npm run uat
```

## Commands

| Command | Purpose |
|--------|---------|
| `npm run uat` | Full suite (guest + setup + authenticated projects). Starts `npm run dev` unless already listening and unless `UAT_SKIP_WEBSERVER=1`. |
| `npm run uat:setup` | Headed setup only — record `.auth/user.json`. |
| `npm run uat:export-auth` | Attach to Chrome on port 9222 and write `.auth/user.json` (use after manual Google sign-in; see above). |
| `npm run uat:smoke` | Tests tagged `@smoke` only. |

Optional:

```bash
BASE_URL=http://127.0.0.1:3000 npm run uat
```

## Failure tracking (`issues.md`)

The custom reporter appends a markdown block to **`issues.md`** at the repo root for each failed test (file path, title, error line, attachment paths). Use it as a fix queue for humans or agents.

HTML report: `tests/uat/playwright-report/index.html` after a run (relative to the config directory).

## Layout

- `specs/01-auth-guest.spec.ts` — no session (redirects, `/unauthorized`).
- `specs/01-auth-session.spec.ts` — authenticated navigation and sign-out.
- `specs/02-log-workout.spec.ts` — log / submit / optional edit.
- `specs/03-dashboard.spec.ts` — dashboard widgets.
- `specs/04-arena.spec.ts` — arena rankings UI.
- `specs/05-profile.spec.ts` — profile / theme.
- `specs/06-sharing-notifications.spec.ts` — sharing UI, notification panel.
- `specs/07-integrations.spec.ts` — Whoop row / connect link.
- `specs/99-cross-flows.spec.ts` — multi-step flows across areas.

Tags: `@smoke`, `@auth`, `@log`, `@dashboard`, `@arena`, `@profile`, `@sharing`, `@whoop`, `@crossflow`. Example:

```bash
npx playwright test --config tests/uat/playwright.config.ts --grep @whoop
```

## OpenClaw runbook

1. Ensure `.env.local` is present and `npm run dev` works.
2. Ensure `.auth/user.json` exists (`npm run uat:export-auth` after manual Chrome login, or `npm run uat:setup`).
3. Run `npm run uat` (or `UAT_SKIP_WEBSERVER=1 npm run uat` if the app is already running).
4. On non-zero exit, open **`issues.md`** (new entries at the bottom) and the HTML report under `tests/uat/playwright-report/` to triage.
