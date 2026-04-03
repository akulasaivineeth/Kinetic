'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import { getDateRange, type DateRange } from './use-workout-logs';

const supabase = createClient();

export function useLeaderboard(
  dateRange: DateRange,
  metric: 'volume' | 'peak' = 'volume',
  mode: 'raw' | 'percent' = 'raw',
  customFrom?: Date,
  customTo?: Date
) {
  const { user } = useAuth();
  const { from, to } = getDateRange(dateRange, customFrom, customTo);

  return useQuery({
    queryKey: ['leaderboard', user?.id, dateRange, metric, mode, from.toISOString(), to.toISOString()],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.rpc('get_leaderboard', {
        p_user_id: user.id,
        p_date_from: from.toISOString(),
        p_date_to: to.toISOString(),
        p_metric: metric,
        p_mode: mode,
      });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}
