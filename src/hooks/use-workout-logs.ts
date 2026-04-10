'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import type { WorkoutLog, WeeklyVolume } from '@/types/database';
import { startOfWeek, endOfWeek, subMonths, subWeeks, startOfMonth, endOfMonth } from 'date-fns';
import { get, set, del } from 'idb-keyval';
import { useEffect, useCallback } from 'react';

/**
 * Workout Logs Hook System
 * Precise implementation of offline sync, auto-save drafts, and weekly volume calculation.
 */

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
  const supabase = createClient();

  return useQuery({
    queryKey: ['weekly-volume', user?.id],
    queryFn: async (): Promise<WeeklyVolume | null> => {
      if (!user) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase.rpc('get_weekly_volume' as any, {
        p_user_id: user.id,
      } as any);
      if (error) throw error;
      const rows = data as WeeklyVolume[] | null;
      return rows?.[0] ?? { total_pushups: 0, total_plank_seconds: 0, total_run_distance: 0 };
    },
    enabled: !!user,
  });
}

export function useWorkoutLogs(dateRange: DateRange, customFrom?: Date, customTo?: Date) {
  const { user } = useAuth();
  const supabase = createClient();
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
  const supabase = createClient();

  return useQuery({
    queryKey: ['draft-log', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      // 1. Try IndexedDB first for offline persistence
      const idbDraft = await get(`draft-log-${user.id}`);
      if (idbDraft && !navigator.onLine) return idbDraft;

      // 2. Fetch from Supabase
      const { data, error } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_draft', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      
      // Update IndexedDB if remote is newer or better
      if (data) await set(`draft-log-${user.id}`, data);
      return data as WorkoutLog | null;
    },
    enabled: !!user,
  });
}

export function useSaveDraft() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (log: Partial<WorkoutLog>) => {
      if (!user) throw new Error('Not authenticated');

      const logData = { ...log, user_id: user.id, is_draft: true, updated_at: new Date().toISOString() };

      // 1. Always save to IndexedDB immediately for offline safety
      await set(`draft-log-${user.id}`, logData);

      // 2. If online, sync to Supabase
      if (navigator.onLine) {
        if (log.id) {
          const { data, error } = await supabase
            .from('workout_logs')
            .update(logData)
            .eq('id', log.id)
            .select()
            .single();
          if (error) throw error;
          await set(`draft-log-${user.id}`, data);
          return data;
        } else {
          const { data, error } = await supabase
            .from('workout_logs')
            .insert(logData)
            .select()
            .single();
          if (error) throw error;
          await set(`draft-log-${user.id}`, data);
          return data;
        }
      }
      
      return logData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['draft-log'] });
    },
  });
}

export function useSubmitLog() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (logId: string) => {
      if (!logId) throw new Error('No log id provided for submission');
      if (!user) throw new Error('Not authenticated');

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

      // Clean up local draft after successful submission
      await del(`draft-log-${user.id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['draft-log'] });
      queryClient.invalidateQueries({ queryKey: ['workout-logs'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-volume'] });
      queryClient.invalidateQueries({ queryKey: ['stamina'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['alltime-stats'] });
    },
  });
}

export function useRecentSubmittedLogs(limit = 8) {
  const { user } = useAuth();
  const supabase = createClient();

  return useQuery({
    queryKey: ['recent-workout-logs', user?.id, limit],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('user_id', user.id)
        .not('submitted_at', 'is', null)
        .order('logged_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as WorkoutLog[];
    },
    enabled: !!user,
  });
}

export function useUpdateSubmittedLog() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({
      logId,
      patch,
    }: {
      logId: string;
      patch: Partial<Pick<WorkoutLog, 'pushup_reps' | 'plank_seconds' | 'run_distance' | 'notes' | 'photo_url'>>;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('workout_logs')
        .update({
          ...patch,
          updated_at: new Date().toISOString(),
        })
        .eq('id', logId)
        .eq('user_id', user.id)
        .not('submitted_at', 'is', null)
        .select()
        .single();
      if (error) throw error;
      return data as WorkoutLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-logs'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-volume'] });
      queryClient.invalidateQueries({ queryKey: ['stamina'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['recent-workout-logs'] });
      queryClient.invalidateQueries({ queryKey: ['alltime-stats'] });
    },
  });
}

export function useSharedLogs(dateRange: DateRange, customFrom?: Date, customTo?: Date) {
  const { user } = useAuth();
  const supabase = createClient();
  const { from, to } = getDateRange(dateRange, customFrom, customTo);
  const queryClient = useQueryClient();

  // Real-time subscription for shared logs (Arena Chart updates)
  useEffect(() => {
    if (!user) return;

    const channelId = `shared-logs-realtime-${user.id}-${Math.random().toString(36).slice(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workout_logs',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['shared-workout-logs'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, supabase]);

  return useQuery({
    queryKey: ['shared-workout-logs', user?.id, dateRange, from.toISOString(), to.toISOString()],
    queryFn: async () => {
      if (!user) return [];

      // 1. Get accepted connections (Differentiate one-way vs mutual)
      const { data: connections } = await supabase
        .from('sharing_connections')
        .select('requester_id, recipient_id, is_mutual')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`);

      if (!connections || connections.length === 0) return [];

      const sharedUserIds = connections
        .filter(c => {
          // I requested them -> I see them (Accept/AcceptMutual both allow this)
          if (c.requester_id === user.id) return true;
          // They requested me -> I see them ONLY if I clicked Accept Mutual
          if (c.recipient_id === user.id && c.is_mutual) return true;
          return false;
        })
        .map(c => c.requester_id === user.id ? c.recipient_id : c.requester_id);

      // 2. Fetch logs for these users
      const { data: logs, error } = await supabase
        .from('workout_logs')
        .select('*, profiles(full_name)')
        .in('user_id', sharedUserIds)
        .not('submitted_at', 'is', null)
        .gte('logged_at', from.toISOString())
        .lte('logged_at', to.toISOString())
        .order('logged_at', { ascending: true });

      if (error) throw error;
      return logs ?? [];
    },
    enabled: !!user,
  });
}

/**
 * Background Sync Hook: listens for SW sync events or online reconnect
 */
export function useBackgroundSync() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const saveDraft = useSaveDraft();

  const sync = useCallback(async () => {
    if (!user || !navigator.onLine) return;
    const localDraft = await get(`draft-log-${user.id}`);
    if (localDraft && !localDraft.id) {
      // It's a purely local draft that hasn't seen the server
      saveDraft.mutate(localDraft);
    }
    queryClient.invalidateQueries({ queryKey: ['draft-log'] });
  }, [user, saveDraft, queryClient]);

  useEffect(() => {
    window.addEventListener('online', sync);
    return () => window.removeEventListener('online', sync);
  }, [sync]);
}
