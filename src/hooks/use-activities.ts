'use client';
import { useMemo } from 'react';

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
export function useRecentActivityLog(limit = 50) {
  const { user } = useAuth();
  const supabase = createClient();

  return useQuery({
    queryKey: ['recent-activity-logs', user?.id, limit],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', user.id)
        .not('submitted_at', 'is', null)
        .order('logged_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as ActivityLog[];
    },
    enabled: !!user,
  });
}

/**
 * Hook to get the user's top 4 most frequent activity types (core or flex).
 * Falls back to the standard 4 core types if no history exists.
 */
export function useRankedActivityTypes() {
  const { data: allTypes = [] } = useActivityTypes();
  const { data: coreLogs = [] } = useQuery({
    queryKey: ['recent-core-logs-for-ranking'],
    queryFn: async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase.from('workout_logs').select('*').eq('user_id', user.id).not('submitted_at', 'is', null).order('logged_at', { ascending: false }).limit(50);
      return data || [];
    }
  });
  const { data: flexLogs = [] } = useRecentActivityLog(100);

  return useMemo(() => {
    if (allTypes.length === 0) return [];

    // 1. Calculate frequencies
    const counts: Record<string, number> = {};
    
    // Core sessions
    coreLogs.forEach(log => {
      if (log.pushup_reps > 0) counts['pushups'] = (counts['pushups'] || 0) + 1;
      if (log.squat_reps > 0) counts['squats'] = (counts['squats'] || 0) + 1;
      if (log.plank_seconds > 0) counts['plank'] = (counts['plank'] || 0) + 1;
      if (log.run_distance > 0) counts['run'] = (counts['run'] || 0) + 1;
    });

    // Flex sessions
    const typeById = new Map(allTypes.map(t => [t.id, t.slug]));
    flexLogs.forEach(log => {
      const slug = typeById.get(log.activity_type_id);
      if (slug) counts[slug] = (counts[slug] || 0) + 1;
    });

    // 2. Sort all types by count
    const ranked = [...allTypes].sort((a, b) => {
      const countA = counts[a.slug] || 0;
      const countB = counts[b.slug] || 0;
      if (countB !== countA) return countB - countA;
      // Secondary sort: core activities first
      if (a.is_core && !b.is_core) return -1;
      if (!a.is_core && b.is_core) return 1;
      return 0;
    });

    return ranked;
  }, [allTypes, coreLogs, flexLogs]);
}
