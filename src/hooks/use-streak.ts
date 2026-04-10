'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import { startOfWeek, subWeeks, format } from 'date-fns';

export function useStreak() {
  const { user } = useAuth();
  const supabase = createClient();

  return useQuery({
    queryKey: ['streak', user?.id],
    queryFn: async (): Promise<number> => {
      if (!user) return 0;

      const { data: logs, error } = await supabase
        .from('workout_logs')
        .select('logged_at')
        .eq('user_id', user.id)
        .not('submitted_at', 'is', null)
        .order('logged_at', { ascending: false });

      if (error) throw error;
      if (!logs || logs.length === 0) return 0;

      const weeksWithLogs = new Set<string>();
      for (const log of logs) {
        const wk = format(
          startOfWeek(new Date(log.logged_at), { weekStartsOn: 1 }),
          'yyyy-MM-dd'
        );
        weeksWithLogs.add(wk);
      }

      let streak = 0;
      let cursor = startOfWeek(new Date(), { weekStartsOn: 1 });

      while (true) {
        const wk = format(cursor, 'yyyy-MM-dd');
        if (weeksWithLogs.has(wk)) {
          streak++;
          cursor = subWeeks(cursor, 1);
        } else {
          break;
        }
      }

      return streak;
    },
    enabled: !!user,
  });
}
