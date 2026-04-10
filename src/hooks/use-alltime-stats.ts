'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';

export interface AllTimeStats {
  totalPushups: number;
  totalPlankSeconds: number;
  totalRunDistance: number;
  peakPushups: number;
  peakPlankSeconds: number;
  peakRunDistance: number;
}

export function useAllTimeStats() {
  const { user } = useAuth();
  const supabase = createClient();

  return useQuery({
    queryKey: ['alltime-stats', user?.id],
    queryFn: async (): Promise<AllTimeStats> => {
      if (!user) return emptyStats();

      const { data: logs, error } = await supabase
        .from('workout_logs')
        .select('pushup_reps, plank_seconds, run_distance')
        .eq('user_id', user.id)
        .not('submitted_at', 'is', null);

      if (error) throw error;
      if (!logs || logs.length === 0) return emptyStats();

      let totalPushups = 0;
      let totalPlankSeconds = 0;
      let totalRunDistance = 0;
      let peakPushups = 0;
      let peakPlankSeconds = 0;
      let peakRunDistance = 0;

      for (const log of logs) {
        const pushups = log.pushup_reps || 0;
        const plank = log.plank_seconds || 0;
        const run = Number(log.run_distance) || 0;

        totalPushups += pushups;
        totalPlankSeconds += plank;
        totalRunDistance += run;

        if (pushups > peakPushups) peakPushups = pushups;
        if (plank > peakPlankSeconds) peakPlankSeconds = plank;
        if (run > peakRunDistance) peakRunDistance = run;
      }

      return {
        totalPushups,
        totalPlankSeconds,
        totalRunDistance,
        peakPushups,
        peakPlankSeconds,
        peakRunDistance,
      };
    },
    enabled: !!user,
  });
}

function emptyStats(): AllTimeStats {
  return {
    totalPushups: 0,
    totalPlankSeconds: 0,
    totalRunDistance: 0,
    peakPushups: 0,
    peakPlankSeconds: 0,
    peakRunDistance: 0,
  };
}
