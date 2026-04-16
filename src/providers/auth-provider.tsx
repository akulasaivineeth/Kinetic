'use client';

import { createContext, useContext, useEffect, useState, useRef, useCallback, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/types/database';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isSessionRefreshing: boolean;
  waitForSession: () => Promise<void>;
  signInWithGoogle: (inviteCode?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isSessionRefreshing: false,
  waitForSession: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSessionRefreshing, setIsSessionRefreshing] = useState(false);
  const supabase = createClient();

  const sessionGateRef = useRef<{ promise: Promise<void>; resolve: () => void } | null>(null);

  const waitForSession = useCallback(async () => {
    if (sessionGateRef.current) {
      await sessionGateRef.current.promise;
    }
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) await fetchProfile(user.id);
      setLoading(false);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    // PWA Lifecycle Fix: When waking from background after >1 hour, the session token naturally expires
    // because OS suspends the background JS timer. We must manually prod Supabase to refresh it.
    // isSessionRefreshing gates the submit button so the user can't fire a mutation mid-refresh.
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        let resolveGate: () => void = () => {};
        const gatePromise = new Promise<void>((r) => { resolveGate = r; });
        sessionGateRef.current = { promise: gatePromise, resolve: resolveGate };

        setIsSessionRefreshing(true);
        try {
          // getSession() reads local session & auto-refreshes expired JWT via refresh token.
          const { data: { session } } = await supabase.auth.getSession();

          if (session?.user) {
            // Session is alive — update React state immediately (don't wait for onAuthStateChange race).
            setUser(session.user);
            await fetchProfile(session.user.id);
          } else {
            // getSession() returned null — session may be gone. Validate with server as fallback.
            const { data: { user: freshUser } } = await supabase.auth.getUser();
            if (freshUser) {
              setUser(freshUser);
              await fetchProfile(freshUser.id);
            } else {
              // Truly logged out (refresh token expired or revoked).
              setUser(null);
              setProfile(null);
            }
          }
        } catch {
          // Silent catch — phone may wake momentarily without network
        } finally {
          setIsSessionRefreshing(false);
          resolveGate();
          sessionGateRef.current = null;
        }
      }
    };

    // Add both visibility change and classic focus (for iOS PWA quirks)
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signInWithGoogle = async (inviteCode?: string) => {
    const redirectTo = `${window.location.origin}/auth/callback${
      inviteCode ? `?invite=${inviteCode}` : ''
    }`;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) {
      const raw = `${error.message} ${(error as { code?: string }).code ?? ''}`.toLowerCase();
      if (raw.includes('not enabled') || raw.includes('validation_failed') || raw.includes('provider')) {
        throw new Error(
          'Google sign-in is not enabled for this Supabase project. Open Supabase Dashboard → Authentication → Providers → Google, turn it on, and paste your Google OAuth Client ID and Secret. Each project (dev vs prod) must be configured separately.'
        );
      }
      throw error;
    }
    if (data?.url) {
      window.location.assign(data.url);
    }
  };

  const signOut = async () => {
    try {
      await fetch(`${window.location.origin}/auth/sign-out`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      /* still clear client session */
    }
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, isSessionRefreshing, waitForSession, signInWithGoogle, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
