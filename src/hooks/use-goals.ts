'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import type { PerformanceGoals } from '@/types/database';

const supabase = createClient();

const DEFAULT_GOALS: Omit<PerformanceGoals, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  pushup_weekly_goal: 500,
  plank_weekly_goal: 600,
  run_weekly_goal: 15,
  pushup_peak_goal: 75,
  plank_peak_goal: 180,
  run_peak_goal: 3,
};

export function useGoals() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['goals', user?.id],
    queryFn: async () => {
      if (!user) return DEFAULT_GOALS as PerformanceGoals;
      const { data, error } = await supabase
        .from('performance_goals')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data ?? ({ ...DEFAULT_GOALS, user_id: user.id } as PerformanceGoals);
    },
    enabled: !!user,
  });
}

export function useUpdateGoals() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (goals: Partial<PerformanceGoals>) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('performance_goals')
        .upsert(
          { ...goals, user_id: user.id, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}
