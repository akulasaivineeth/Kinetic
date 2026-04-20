'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import type { ActivityType, ActivityLog } from '@/types/database';

export function useActivityTypes() {
  const supabase = createClient();

  return useQuery({
    queryKey: ['activity-types'],
    queryFn: async (): Promise<ActivityType[]> => {
      const { data, error } = await supabase
        .from('activity_types')
        .select('*')
        .order('id', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ActivityType[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useLogActivity() {
  const { user } = useAuth();
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ slug, value, loggedAt }: {
      slug: string;
      value: number;
      loggedAt?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase.rpc('log_activity' as string, {
        p_user_id: user.id,
        p_slug: slug,
        p_value: value,
        p_logged_at: loggedAt ?? new Date().toISOString(),
      } as Record<string, unknown>);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
      queryClient.invalidateQueries({ queryKey: ['alltime-stats'] });
      queryClient.invalidateQueries({ queryKey: ['workout-logs'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-volume'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['team-leaderboard'] });
    },
  });
}

export function useTodayActivities() {
  const { user } = useAuth();
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['today-activities', user?.id, today],
    queryFn: async (): Promise<ActivityLog[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('logged_at', `${today}T00:00:00`)
        .not('submitted_at', 'is', null)
        .order('logged_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ActivityLog[];
    },
    enabled: !!user,
  });
}
