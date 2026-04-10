# Agents

## Cursor Cloud specific instructions

### Project overview

Kinetic is a Next.js 15 (App Router) fitness-tracking PWA backed by a remote Supabase instance. There is no local database, Docker, or docker-compose needed. The remote Supabase project handles Postgres, Auth, Realtime, and Storage.

### Running the app

- **Dev server**: `npm run dev` (port 3000)
- **Build**: `npm run build`
- **Lint**: `ESLINT_USE_FLAT_CONFIG=false npm run lint` (uses legacy ESLint config mode; the `.eslintrc.json` extends `next/core-web-vitals`)
- Pre-existing lint warnings exist for `react-hooks/exhaustive-deps` and `@typescript-eslint/no-explicit-any`; these are not blockers.

### Environment variables

All secrets are injected as environment variables by the Cloud Agent VM. The `.env.local` file must be generated from these env vars at setup time (it is gitignored). Required secrets: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_APP_URL`. Optional: `WHOOP_*`, `VAPID_*`.

### Authentication

Google OAuth is the only sign-in method. The app is invite-only: the first user auto-becomes admin, subsequent users need an invite code. Protected routes redirect unauthenticated users to `/`. Testing authenticated flows end-to-end requires a real Google account with a valid invite code (or being the first user in a fresh Supabase instance).

### Key gotchas

- The `next lint` command may prompt interactively if no ESLint config file exists. The `.eslintrc.json` in the repo root prevents this.
- `eslint-config-next` v15.5 bundles `@typescript-eslint/eslint-plugin` as a nested dependency; the `.eslintrc.json` adds it as a plugin so `@typescript-eslint/no-explicit-any` disable-comments don't cause build errors.
- The `@eslint/eslintrc` package is needed for ESLint compatibility (`FlatCompat` is not used, but the package supports the legacy config mode).
- Playwright UAT tests (`npm run uat`) require `npx playwright install chromium` and an authenticated session exported to `.auth/user.json`. These are not part of the standard dev loop.
