import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseAnonKey, getSupabaseServiceRoleKey, getSupabaseUrl } from '@/lib/supabase/env-profile';

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
          );
        } catch {
          // Server Component — ignore
        }
      },
    },
  });
}

export async function createServiceClient() {
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey());
}
