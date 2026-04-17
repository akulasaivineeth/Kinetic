'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import { startOfWeek, subWeeks, format } from 'date-fns';

export interface WeekBucket {
  week: string;
  pushups: number;
  plankMin: number;
  runKm: number;
  squats: number;
}

export function useRecentWeeks(count = 4) {
  const { user } = useAuth();
  const supabase = createClient();

  return useQuery({
    queryKey: ['recent-weeks', user?.id, count],
    queryFn: async (): Promise<WeekBucket[]> => {
      if (!user) return [];

      const now = new Date();
      const from = startOfWeek(subWeeks(now, count - 1), { weekStartsOn: 1 });

      const { data: logs, error } = await supabase
        .from('workout_logs')
        .select('pushup_reps, plank_seconds, run_distance, squat_reps, logged_at')
        .eq('user_id', user.id)
        .not('submitted_at', 'is', null)
        .gte('logged_at', from.toISOString())
        .order('logged_at', { ascending: true });

      if (error) throw error;
      if (!logs || logs.length === 0) return [];

      const buckets = new Map<string, WeekBucket>();

      for (let i = 0; i < count; i++) {
        const wk = startOfWeek(subWeeks(now, count - 1 - i), { weekStartsOn: 1 });
        const key = format(wk, 'MM/dd');
        buckets.set(key, { week: key, pushups: 0, plankMin: 0, runKm: 0, squats: 0 });
      }

      for (const log of logs) {
        const wk = startOfWeek(new Date(log.logged_at), { weekStartsOn: 1 });
        const key = format(wk, 'MM/dd');
        const bucket = buckets.get(key);
        if (bucket) {
          bucket.pushups += log.pushup_reps || 0;
          bucket.plankMin += (log.plank_seconds || 0) / 60;
          bucket.runKm += Number(log.run_distance) || 0;
          bucket.squats += log.squat_reps || 0;
        }
      }

      return [...buckets.values()];
    },
    enabled: !!user,
  });
}
