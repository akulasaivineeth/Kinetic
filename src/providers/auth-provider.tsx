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

    // PWA: refresh JWT after a *real* background transition (tab hidden → visible).
    // Do NOT run on every window `focus` — that fires on clicks, OAuth return, DevTools, etc. and
    // left ConnectionGuard stuck on "Reconnecting / Tap to reload" while getSession() ran.
    const wasHiddenRef = { current: document.visibilityState === 'hidden' };
    const wakeInFlightRef = { current: false };

    const performWakeSessionRefresh = async () => {
      if (wakeInFlightRef.current) return;
      wakeInFlightRef.current = true;

      let resolveGate: () => void = () => {};
      const gatePromise = new Promise<void>((r) => {
        resolveGate = r;
      });
      sessionGateRef.current = { promise: gatePromise, resolve: resolveGate };

      setIsSessionRefreshing(true);
      const refresh = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          const { data: { user: freshUser } } = await supabase.auth.getUser();
          if (freshUser) {
            setUser(freshUser);
            await fetchProfile(freshUser.id);
          } else {
            setUser(null);
            setProfile(null);
          }
        }
      };

      try {
        await Promise.race([
          refresh(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('wake-session-timeout')), 10000)
          ),
        ]);
      } catch {
        // Timeout or offline — clear blocking UI; next user action can retry.
      } finally {
        setIsSessionRefreshing(false);
        resolveGate();
        sessionGateRef.current = null;
        wakeInFlightRef.current = false;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        wasHiddenRef.current = true;
        return;
      }
      if (document.visibilityState === 'visible' && wasHiddenRef.current) {
        wasHiddenRef.current = false;
        void performWakeSessionRefresh();
      }
    };

    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        void performWakeSessionRefresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
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
