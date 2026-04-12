import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/env-profile';

/**
 * Clears Supabase auth cookies on the server so middleware treats the user as logged out.
 * Browser-only signOut() is not enough for Next.js + SSR cookie sessions.
 */
export async function POST(request: NextRequest) {
  let response = NextResponse.json({ ok: true });

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
        });
      },
    },
  });

  await supabase.auth.signOut();
  return response;
}
