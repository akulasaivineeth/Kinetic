import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/env-profile';

// Use a generic client that doesn't enforce strict table types at call sites.
// The Database schema types are used for our own interfaces (Row, Insert, etc.)
// but the Supabase client queries are validated server-side.
let browserClient: SupabaseClient<any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createClient(): SupabaseClient<any> {
  if (browserClient) return browserClient;
  browserClient = createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    realtime: {
      worker: true,
      reconnectAfterMs: (attempts: number) => {
        return Math.min(1000 * Math.pow(2, attempts) + Math.random() * 1000, 30000);
      },
    },
  });
  return browserClient;
}
