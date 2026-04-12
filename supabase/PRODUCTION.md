# Production Supabase database

Use a **separate** Supabase project for production so dev experiments never touch real users.

## 1. Create the production project

1. [Supabase Dashboard](https://supabase.com/dashboard) → **New project** (region, strong DB password).
2. After it is ready: **Project Settings → API** — copy `URL` and `anon` / `service_role` keys for Vercel.
3. **Project Settings → Database** — copy the **URI** connection string (direct, port `5432`) for backups. URL-encode special characters in the password if the CLI complains.

## 2. Apply migrations (schema)

From this repo, with the CLI logged in (`supabase login`):

```bash
# Link your machine to the NEW production project (one-time per machine)
supabase link --project-ref <PRODUCTION_PROJECT_REF>

# Push all files in supabase/migrations/ to production
supabase db push
```

To keep **dev** linked to another project, use a second clone or `supabase unlink` / `link` when switching; only one `link` target is stored per directory.

**Ongoing:** Whenever you add a migration on `main`, run `supabase db push` against production after review (or use the GitHub Action **Migrate production DB** manually).

## 3. Auth & URLs (production)

In the **production** project: **Authentication → URL configuration**

- **Site URL**: `https://your-vercel-domain.vercel.app` (or custom domain).
- **Redirect URLs**: add `https://your-domain/**` and explicitly `https://your-domain/auth/callback`.

Match **Google OAuth** and **Whoop** redirect URLs to this host (see main deploy notes).

### Google provider (required or sign-in returns `provider is not enabled`)

In the **same production** project: **Authentication → Providers → Google**

1. Turn **Enable Sign in with Google** on.
2. Paste the **Client ID** and **Client Secret** from Google Cloud Console (same OAuth client you use for dev, or a dedicated prod client).
3. In Google Cloud Console → **Credentials** → your OAuth client → **Authorized redirect URIs**, add Supabase’s callback for this project, e.g. `https://<your-prod-ref>.supabase.co/auth/v1/callback`.

Dev and prod are **separate** Supabase projects — enabling Google on dev does **not** enable it on prod.

## 4. Backups

| Method | What it does |
|--------|----------------|
| **GitHub Action** `.github/workflows/supabase-prod-backup.yml` | Daily dump (roles + schema + data) → workflow artifact (private repo). Set secret `PRODUCTION_SUPABASE_DB_URL` to the **full** Postgres URI with your **real** DB password (not the literal `[YOUR-PASSWORD]`). In the Supabase Database settings, use **URI** / **Direct** and either fill the password field so the copied string is complete, or toggle **URI encoded** if your password has special characters. |
| **Local script** `npm run db:backup:prod` | Same dumps into `./backups/` (gitignored). |
| **Supabase Dashboard** | Paid plans include automated backups / PITR — enable for production. |

Artifacts are not a long-term archive; download periodically or copy to your own S3 if you need years of retention.

## 5. What “automatic sync” means here

- **Schema (migrations):** Sync is **via Git**: migration SQL is versioned; you apply to prod with `db push` or the manual GitHub Action. We do **not** auto-push migrations on every commit to avoid accidental prod breakage.
- **Data:** There is no safe built-in “sync prod data to dev” in this repo. Use **dumps** for restore/disaster recovery only. For test data, use seed migrations or a dedicated staging project.

## 6. Edge Functions (if you use them)

Deploy Whoop/digest/etc. to the **production** project:

```bash
supabase link --project-ref <PRODUCTION_PROJECT_REF>
supabase functions deploy whoop-webhook
# …other function names
```

Set function secrets in the production dashboard to match Vercel env where applicable.
