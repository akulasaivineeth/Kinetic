'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import { getDateRange, type DateRange } from './use-workout-logs';
import type { LeaderboardEntry } from '@/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Refetch-friendly (e.g. after log submit) — same RPC as `useLeaderboard`. */
export async function fetchLeaderboard(
  supabase: SupabaseClient,
  userId: string,
  dateRange: DateRange,
  metric: 'volume' | 'peak' = 'volume',
  mode: 'raw' | 'percent' = 'raw',
  customFrom?: Date,
  customTo?: Date,
): Promise<LeaderboardEntry[]> {
  const { from, to } = getDateRange(dateRange, customFrom, customTo);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase.rpc('get_leaderboard' as any, {
    p_user_id: userId,
    p_date_from: from.toISOString(),
    p_date_to: to.toISOString(),
    p_metric: metric,
    p_mode: mode,
  } as any);
  if (error) throw error;
  return (data ?? []) as LeaderboardEntry[];
}

export function useLeaderboard(
  dateRange: DateRange,
  metric: 'volume' | 'peak' = 'volume',
  mode: 'raw' | 'percent' = 'raw',
  customFrom?: Date,
  customTo?: Date
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const supabase = createClient();
  const { from, to } = getDateRange(dateRange, customFrom, customTo);

  // Real-time subscription — auto-refresh when anyone logs a workout
  useEffect(() => {
    if (!user) return;

    let channel: any;
    let retries = 0;
    let isHealthy = false;

    const createChannel = async () => {
      if (channel) {
        await supabase.removeChannel(channel);
        channel = undefined;
        isHealthy = false;
      }

      const channelId = `squads-realtime-${user.id}-${crypto.randomUUID()}`;
      channel = supabase
        .channel(channelId)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'workout_logs' },
          () => queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'workout_logs' },
          () => queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'sharing_connections' },
          () => queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'sharing_connections' },
          () => queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            retries = 0;
            isHealthy = true;
          } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
            isHealthy = false;
            if (retries < 1) {
              retries++;
              void createChannel();
            }
          }
        });
    };

    void createChannel();

    // On tab visible: only invalidate cache for fresh data; don't recreate healthy channel
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
        // Only recreate channel if it's unhealthy
        if (!isHealthy) {
          retries = 0;
          void createChannel();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    // On auth reconnect: always recreate channel (session token changed)
    const handleReconnect = () => {
      retries = 0;
      void createChannel();
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    };
    window.addEventListener('kinetic-reconnect', handleReconnect);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('kinetic-reconnect', handleReconnect);
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, queryClient]);

  return useQuery({
    queryKey: ['leaderboard', user?.id, dateRange, metric, mode, from.toISOString(), to.toISOString()],
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      if (!user) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase.rpc('get_leaderboard' as any, {
        p_user_id: user.id,
        p_date_from: from.toISOString(),
        p_date_to: to.toISOString(),
        p_metric: metric,
        p_mode: mode,
      } as any);
      if (error) throw error;
      return (data ?? []) as LeaderboardEntry[];
    },
    enabled: !!user,
  });
}
