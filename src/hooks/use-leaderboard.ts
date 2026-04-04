'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import { getDateRange, type DateRange } from './use-workout-logs';
import type { LeaderboardEntry } from '@/types/database';

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

    const channel = supabase
      .channel('arena-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'workout_logs',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'workout_logs',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
