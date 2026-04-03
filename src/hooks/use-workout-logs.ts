'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import type { WorkoutLog } from '@/types/database';
import { startOfWeek, endOfWeek, subMonths, subWeeks, startOfMonth, endOfMonth } from 'date-fns';

const supabase = createClient();

export type DateRange = 'week' | 'month' | '3mo' | '6mo' | 'year' | 'custom';

export function getDateRange(range: DateRange, customFrom?: Date, customTo?: Date) {
  const now = new Date();
  switch (range) {
    case 'week':
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'month':
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case '3mo':
      return { from: subMonths(now, 3), to: now };
    case '6mo':
      return { from: subMonths(now, 6), to: now };
    case 'year':
      return { from: subMonths(now, 12), to: now };
    case 'custom':
      return { from: customFrom || subWeeks(now, 1), to: customTo || now };
    default:
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: now };
  }
}

export function useWeeklyVolume() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['weekly-volume', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.rpc('get_weekly_volume', {
        p_user_id: user.id,
      });
      if (error) throw error;
      return data?.[0] ?? { total_pushups: 0, total_plank_seconds: 0, total_run_distance: 0 };
    },
    enabled: !!user,
  });
}

export function useWorkoutLogs(dateRange: DateRange, customFrom?: Date, customTo?: Date) {
  const { user } = useAuth();
  const { from, to } = getDateRange(dateRange, customFrom, customTo);

  return useQuery({
    queryKey: ['workout-logs', user?.id, dateRange, from.toISOString(), to.toISOString()],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('user_id', user.id)
        .not('submitted_at', 'is', null)
        .gte('logged_at', from.toISOString())
        .lte('logged_at', to.toISOString())
        .order('logged_at', { ascending: true });
      if (error) throw error;
      return data as WorkoutLog[];
    },
    enabled: !!user,
  });
}

export function useDraftLog() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['draft-log', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_draft', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as WorkoutLog | null;
    },
    enabled: !!user,
  });
}

export function useSaveDraft() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (log: Partial<WorkoutLog>) => {
      if (!user) throw new Error('Not authenticated');

      if (log.id) {
        const { data, error } = await supabase
          .from('workout_logs')
          .update({ ...log, updated_at: new Date().toISOString() })
          .eq('id', log.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('workout_logs')
          .insert({ ...log, user_id: user.id, is_draft: true })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['draft-log'] });
    },
  });
}

export function useSubmitLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (logId: string) => {
      const { data, error } = await supabase
        .from('workout_logs')
        .update({
          is_draft: false,
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', logId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['draft-log'] });
      queryClient.invalidateQueries({ queryKey: ['workout-logs'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-volume'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    },
  });
}
