/**
 * Supabase target: dev vs prod credentials in .env.local.
 *
 * - Legacy: if NEXT_PUBLIC_SUPABASE_URL is set, that trio is used (single project).
 * - Otherwise: pick dev or prod from NEXT_PUBLIC_DEBUG_MODE and/or NEXT_PUBLIC_SUPABASE_PROFILE.
 *
 * NEXT_PUBLIC_DEBUG_MODE=true | 1  → dev (when not using legacy URL)
 * NEXT_PUBLIC_DEBUG_MODE=false | 0 → prod
 * If DEBUG_MODE is unset: NEXT_PUBLIC_SUPABASE_PROFILE=dev | prod (default dev)
 *
 * Pairs: *_DEV / *_PROD on URL, anon, and service role keys.
 */

export type SupabaseProfile = 'dev' | 'prod';

function trimEnv(v: string | undefined): string | undefined {
  const t = v?.trim();
  return t || undefined;
}

/** When set, use single-project env (backwards compatible). */
export function isLegacySupabaseEnv(): boolean {
  return !!trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function getActiveSupabaseProfile(): SupabaseProfile {
  if (isLegacySupabaseEnv()) {
    return 'prod';
  }
  const debug = trimEnv(process.env.NEXT_PUBLIC_DEBUG_MODE)?.toLowerCase();
  if (debug === 'true' || debug === '1') return 'dev';
  if (debug === 'false' || debug === '0') return 'prod';
  const p = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_PROFILE)?.toLowerCase();
  if (p === 'prod') return 'prod';
  if (p === 'dev') return 'dev';
  // Dual-mode default: prod on Vercel/build, dev for local next dev
  return process.env.NODE_ENV === 'production' ? 'prod' : 'dev';
}

function missingDualMessage(profile: SupabaseProfile): string {
  const u = profile === 'prod' ? 'NEXT_PUBLIC_SUPABASE_URL_PROD' : 'NEXT_PUBLIC_SUPABASE_URL_DEV';
  const a = profile === 'prod' ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY_PROD' : 'NEXT_PUBLIC_SUPABASE_ANON_KEY_DEV';
  const s = profile === 'prod' ? 'SUPABASE_SERVICE_ROLE_KEY_PROD' : 'SUPABASE_SERVICE_ROLE_KEY_DEV';
  return `Set ${u}, ${a}, and ${s} (or use legacy NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY + SUPABASE_SERVICE_ROLE_KEY).`;
}

export function getSupabaseUrl(): string {
  const legacy = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (legacy) return legacy;
  const profile = getActiveSupabaseProfile();
  const url =
    profile === 'prod'
      ? trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL_PROD)
      : trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL_DEV);
  if (!url) {
    throw new Error(`[Supabase] Missing URL for profile "${profile}". ${missingDualMessage(profile)}`);
  }
  return url;
}

export function getSupabaseAnonKey(): string {
  const legacy = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (isLegacySupabaseEnv() && legacy) return legacy;
  const profile = getActiveSupabaseProfile();
  const key =
    profile === 'prod'
      ? trimEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PROD)
      : trimEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_DEV);
  if (!key) {
    throw new Error(`[Supabase] Missing anon key for profile "${profile}". ${missingDualMessage(profile)}`);
  }
  return key;
}

export function getSupabaseServiceRoleKey(): string {
  const legacy = trimEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (isLegacySupabaseEnv() && legacy) return legacy;
  const profile = getActiveSupabaseProfile();
  const key =
    profile === 'prod'
      ? trimEnv(process.env.SUPABASE_SERVICE_ROLE_KEY_PROD)
      : trimEnv(process.env.SUPABASE_SERVICE_ROLE_KEY_DEV);
  if (!key) {
    throw new Error(`[Supabase] Missing service role for profile "${profile}". ${missingDualMessage(profile)}`);
  }
  return key;
}
