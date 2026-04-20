'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';

/**
 * Single root-level subscription so dashboard / log / stamina caches invalidate
 * when this user's workout_logs change (not only from mutations on the same page).
 */
export function WorkoutDataRealtimeSync() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const supabase = createClient();

  useEffect(() => {
    if (!user) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any;

    // Submit triggers two UPDATEs (row + session_score); debounce so we do not stampede refetches.
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const invalidateWorkoutDerived = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        queryClient.invalidateQueries({ queryKey: ['weekly-volume'] });
        queryClient.invalidateQueries({ queryKey: ['workout-logs'] });
        queryClient.invalidateQueries({ queryKey: ['month-logs'] });
        queryClient.invalidateQueries({ queryKey: ['recent-workout-logs'] });
        queryClient.invalidateQueries({ queryKey: ['alltime-stats'] });
        queryClient.invalidateQueries({ queryKey: ['recent-weeks'] });
        queryClient.invalidateQueries({ queryKey: ['stamina'] });
        queryClient.invalidateQueries({ queryKey: ['user-milestone-unlocks'] });
        queryClient.invalidateQueries({ queryKey: ['shared-workout-logs'] });
      }, 120);
    };

    let reconnectAttempt = 0;
    const setup = async () => {
      if (channel) {
        await supabase.removeChannel(channel);
        channel = undefined;
      }
      const id = `user-workouts-${user.id}-${crypto.randomUUID()}`;
      channel = supabase
        .channel(id)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'workout_logs',
            filter: `user_id=eq.${user.id}`,
          },
          invalidateWorkoutDerived
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'workout_logs',
            filter: `user_id=eq.${user.id}`,
          },
          invalidateWorkoutDerived
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            reconnectAttempt = 0;
          } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
            const delay = Math.min(30000, 800 * Math.pow(2, reconnectAttempt) + Math.random() * 400);
            reconnectAttempt += 1;
            setTimeout(() => {
              void setup();
            }, delay);
          }
        });
    };

    void setup();

    let visibilityDebounce: ReturnType<typeof setTimeout> | null = null;
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      if (visibilityDebounce) clearTimeout(visibilityDebounce);
      visibilityDebounce = setTimeout(() => {
        visibilityDebounce = null;
        void setup();
      }, 400);
    };
    document.addEventListener('visibilitychange', onVisibility);
    const onReconnect = () => void setup();
    window.addEventListener('kinetic-reconnect', onReconnect);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (visibilityDebounce) clearTimeout(visibilityDebounce);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('kinetic-reconnect', onReconnect);
      if (channel) void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, queryClient]);

  return null;
}
