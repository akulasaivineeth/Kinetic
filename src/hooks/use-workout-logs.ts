'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import type { WorkoutLog, WeeklyVolume } from '@/types/database';
import { startOfWeek, endOfWeek, subMonths, subWeeks, startOfMonth, endOfMonth, endOfDay } from 'date-fns';
import { calculateSessionScore } from '@/lib/scoring';
import { get, set, del } from 'idb-keyval';
import { useEffect, useCallback } from 'react';

/**
 * Workout Logs Hook System
 * Precise implementation of offline sync, auto-save drafts, and weekly volume calculation.
 */

// Rejects if the promise doesn't settle within `ms` milliseconds.
// Prevents Supabase fetches from hanging forever after PWA wake-from-background.
function withTimeout<T>(promise: Promise<T>, ms = 12000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out. Check your connection and try again.')), ms)
    ),
  ]);
}

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
      return { from: customFrom || subWeeks(now, 1), to: customTo ? endOfDay(customTo) : now };
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
      return rows?.[0] ?? { total_pushups: 0, total_plank_seconds: 0, total_run_distance: 0, total_squats: 0 };
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

// ─── Month-scoped logs for calendar ─────────────────────────────────────────

/**
 * Fetch all submitted logs for a given month (used by the calendar DayPicker).
 */
export function useMonthLogs(month: Date) {
  const { user } = useAuth();
  const supabase = createClient();
  const from = startOfMonth(month);
  const to = endOfMonth(month);

  return useQuery({
    queryKey: ['month-logs', user?.id, from.toISOString()],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('user_id', user.id)
        .not('submitted_at', 'is', null)
        .gte('logged_at', from.toISOString())
        .lte('logged_at', to.toISOString())
        .order('logged_at', { ascending: false });
      if (error) throw error;
      return data as WorkoutLog[];
    },
    enabled: !!user,
  });
}

/**
 * Build a Map from ISO date-string (YYYY-MM-DD) → logs for that date.
 * Enables O(1) calendar-day lookups.
 */
export function dateToLogsMap(logs: WorkoutLog[]): Map<string, WorkoutLog[]> {
  const map = new Map<string, WorkoutLog[]>();
  for (const log of logs) {
    const key = log.logged_at.slice(0, 10); // YYYY-MM-DD
    const arr = map.get(key) || [];
    arr.push(log);
    map.set(key, arr);
  }
  return map;
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

/** Pass metrics so submit writes the same numbers as the form (avoids debounced autosave races). */
export type SubmitLogInput =
  | string
  | {
      logId: string;
      pushup_reps: number;
      plank_seconds: number;
      run_distance: number;
      squat_reps: number;
    };

export function useSubmitLog() {
  const queryClient = useQueryClient();
  const { user, waitForSession } = useAuth();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (input: SubmitLogInput) => {
      const logId = typeof input === 'string' ? input : input.logId;
      const metrics =
        typeof input === 'object'
          ? {
              pushup_reps: input.pushup_reps,
              plank_seconds: input.plank_seconds,
              run_distance: input.run_distance,
              squat_reps: input.squat_reps,
            }
          : null;

      if (!logId) throw new Error('No log id provided for submission');
      if (!user) throw new Error('Not authenticated');

      // Wait for any in-flight session refresh to complete before making DB calls.
      // This prevents the race condition where Submit fires before visibility-change refresh finishes.
      await waitForSession();

      let pushup_reps = 0;
      let plank_seconds = 0;
      let run_distance = 0;
      let squat_reps = 0;
      let run_duration = 0;

      if (metrics) {
        pushup_reps = metrics.pushup_reps;
        plank_seconds = metrics.plank_seconds;
        run_distance = metrics.run_distance;
        squat_reps = metrics.squat_reps;
      } else {
        const { data: draftData } = await withTimeout(
          new Promise<any>((resolve, reject) => {
            supabase
              .from('workout_logs')
              .select('pushup_reps, plank_seconds, run_distance, squat_reps, run_duration')
              .eq('id', logId)
              .single()
              .then(resolve, reject);
          })
        );
        pushup_reps = draftData?.pushup_reps || 0;
        plank_seconds = draftData?.plank_seconds || 0;
        run_distance = Number(draftData?.run_distance || 0);
        squat_reps = draftData?.squat_reps || 0;
        run_duration = draftData?.run_duration || 0;
      }

      const { totalPts } = calculateSessionScore(pushup_reps, plank_seconds, run_distance, squat_reps, run_duration);

      // Submit: always persist metrics on this row when provided so we never submit stale debounced draft data.
      const { data, error } = await withTimeout(
        new Promise<any>((resolve, reject) => {
          supabase
            .from('workout_logs')
            .update({
              is_draft: false,
              submitted_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              ...(metrics
                ? {
                    pushup_reps: metrics.pushup_reps,
                    plank_seconds: metrics.plank_seconds,
                    run_distance: metrics.run_distance,
                    squat_reps: metrics.squat_reps,
                  }
                : {}),
            })
            .eq('id', logId)
            .select()
            .single()
            .then(resolve, reject);
        })
      );

      if (error) throw error;

      // Write session_score separately (non-blocking if PostgREST hasn't reloaded schema)
      try {
        await supabase
          .from('workout_logs')
          .update({ session_score: totalPts } as Record<string, unknown>)
          .eq('id', logId);
      } catch {
        // Score will be backfilled by server-side calc_session_score if this fails
        console.warn('session_score update deferred — PostgREST schema cache stale');
      }

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
      queryClient.invalidateQueries({ queryKey: ['recent-weeks'] });
      queryClient.invalidateQueries({ queryKey: ['user-milestone-unlocks'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });

      // Push-notify shared friends that you logged a workout (best-effort, non-blocking)
      if (user) {
        (async () => {
          try {
            const { data: connections } = await supabase
              .from('sharing_connections')
              .select('requester_id, recipient_id, is_mutual')
              .eq('status', 'accepted')
              .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`);

            if (!connections?.length) return;

            const friendIds = connections
              .filter(c => {
                // Friends who should see my data (they requested me, OR it's mutual)
                if (c.requester_id === user.id) return true; // I requested → they see me
                if (c.recipient_id === user.id && c.is_mutual) return true;
                return false;
              })
              .map(c => c.requester_id === user.id ? c.recipient_id : c.requester_id);

            const userName = user.user_metadata?.full_name || user.email || 'A friend';

            for (const friendId of friendIds) {
              fetch('/api/push/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: friendId,
                  title: `${userName} just logged a workout 💪`,
                  body: 'Check the Arena to see how you compare!',
                  data: { url: '/squads' },
                }),
              }).catch(() => {}); // fire-and-forget
            }
          } catch {
            // Push to friends is best-effort
          }
        })();
      }
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
      patch: Partial<Pick<WorkoutLog, 'pushup_reps' | 'plank_seconds' | 'run_distance' | 'squat_reps' | 'notes' | 'photo_url'>>;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Recalculate session score if any metric field changed
      let sessionScore: number | undefined;
      if ('pushup_reps' in patch || 'plank_seconds' in patch || 'run_distance' in patch || 'squat_reps' in patch) {
        const { data: currentLog } = await supabase
          .from('workout_logs')
          .select('pushup_reps, plank_seconds, run_distance, squat_reps, run_duration')
          .eq('id', logId)
          .single();
        if (currentLog) {
          const merged = { ...currentLog, ...patch };
          const { totalPts } = calculateSessionScore(
            merged.pushup_reps || 0,
            merged.plank_seconds || 0,
            Number(merged.run_distance || 0),
            merged.squat_reps || 0,
            merged.run_duration || 0
          );
          sessionScore = totalPts;
        }
      }

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

      // Write session_score separately (non-blocking)
      if (sessionScore !== undefined) {
        try {
          await supabase
            .from('workout_logs')
            .update({ session_score: sessionScore } as Record<string, unknown>)
            .eq('id', logId);
        } catch {
          console.warn('session_score update deferred');
        }
      }

      return data as WorkoutLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-logs'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-volume'] });
      queryClient.invalidateQueries({ queryKey: ['stamina'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['recent-workout-logs'] });
      queryClient.invalidateQueries({ queryKey: ['alltime-stats'] });
      queryClient.invalidateQueries({ queryKey: ['user-milestone-unlocks'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
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

    let channel: any;

    const createChannel = async () => {
      if (channel) {
        await supabase.removeChannel(channel);
        channel = undefined;
      }

      const channelId = `shared-logs-realtime-${user.id}-${crypto.randomUUID()}`;
      channel = supabase
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
        .subscribe((status) => {
          if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
            void createChannel();
          }
        });
    };

    void createChannel();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void createChannel();
        queryClient.invalidateQueries({ queryKey: ['shared-workout-logs'] });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    const handleReconnect = () => {
      void createChannel();
      queryClient.invalidateQueries({ queryKey: ['shared-workout-logs'] });
    };
    window.addEventListener('kinetic-reconnect', handleReconnect);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('kinetic-reconnect', handleReconnect);
      if (channel) supabase.removeChannel(channel);
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
