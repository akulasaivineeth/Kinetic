'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import { useGoals } from './use-goals';
import { useWeeklyVolume } from './use-workout-logs';
import { subWeeks } from 'date-fns';

/**
 * Stamina Score = 40% Whoop Recovery + 30% Goal Consistency + 30% Lean Mass Stability
 * Peak Gain = avg % improvement across Volume+Peak for all 3 metrics vs 4-week baseline,
 *             body-weight normalized using latest lean mass from Whoop.
 */

interface StaminaData {
  staminaScore: number;
  peakGain: number;
  goalConsistency: number;
  whoopRecovery: number;
  leanMassStability: number;
}

export function useStamina(): { data: StaminaData; isLoading: boolean } {
  const { user } = useAuth();
  const { data: goals } = useGoals();
  const { data: weeklyVolume } = useWeeklyVolume();
  const supabase = createClient();

  const query = useQuery({
    queryKey: ['stamina', user?.id, goals, weeklyVolume],
    queryFn: async (): Promise<StaminaData> => {
      if (!user) return defaultStamina();

      // --- 1. Goal Consistency (30%) ---
      const pushupGoal = goals?.pushup_weekly_goal || 500;
      const plankGoal = goals?.plank_weekly_goal || 600;
      const runGoal = goals?.run_weekly_goal || 15;

      const currentPushups = weeklyVolume?.total_pushups || 0;
      const currentPlank = weeklyVolume?.total_plank_seconds || 0;
      const currentRun = Number(weeklyVolume?.total_run_distance || 0);

      // Scale 0-100: partial credit for progress toward each goal
      const pushupProgress = Math.min(currentPushups / pushupGoal, 1);
      const plankProgress = Math.min(currentPlank / plankGoal, 1);
      const runProgress = Math.min(currentRun / runGoal, 1);
      const goalConsistency = Math.round(((pushupProgress + plankProgress + runProgress) / 3) * 100);

      // --- 2. Whoop Recovery (40%) ---
      let whoopRecovery = 70; // Default fallback
      try {
        const { data: latestRecovery } = await supabase
          .from('whoop_events')
          .select('payload')
          .eq('user_id', user.id)
          .eq('event_type', 'recovery.updated')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestRecovery?.payload) {
          const payload = latestRecovery.payload as Record<string, unknown>;
          const recovery = payload?.recovery as Record<string, unknown> | undefined;
          const score = recovery?.score as Record<string, unknown> | undefined;
          const recoveryScore = score?.recovery_score as number | undefined;
          if (recoveryScore !== undefined) {
            whoopRecovery = Math.round(recoveryScore);
          }
        }
      } catch {
        // Silently use default
      }

      // --- 3. Lean Mass Stability (30%) ---
      let leanMassStability = 95;
      let latestLeanMass: number | null = null;
      try {
        const { data: bodyEvents } = await supabase
          .from('whoop_events')
          .select('payload, created_at')
          .eq('user_id', user.id)
          .eq('event_type', 'body_measurement.updated')
          .order('created_at', { ascending: false })
          .limit(5);

        if (bodyEvents && bodyEvents.length >= 1) {
          latestLeanMass = (bodyEvents[0].payload as Record<string, unknown>)?.lean_mass as number | null;
        }

        if (bodyEvents && bodyEvents.length >= 2 && latestLeanMass) {
          const baseline = (bodyEvents[bodyEvents.length - 1].payload as Record<string, unknown>)?.lean_mass as number | undefined;
          if (baseline && baseline > 0) {
            const pctChange = Math.abs((latestLeanMass - baseline) / baseline) * 100;
            leanMassStability = Math.max(0, Math.round(100 - pctChange * 10));
          }
        }
      } catch {
        // Silently use default
      }

      // --- Final Stamina Score ---
      const staminaScore = Math.round(
        0.4 * whoopRecovery + 0.3 * goalConsistency + 0.3 * leanMassStability
      );

      // --- Peak Performance Gain ---
      // Body-weight-normalized using latest lean mass from Whoop
      const peakGain = await calculatePeakGain(supabase, user.id, latestLeanMass);

      return {
        staminaScore: Math.min(staminaScore, 100),
        peakGain,
        goalConsistency,
        whoopRecovery,
        leanMassStability,
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  return {
    data: query.data || defaultStamina(),
    isLoading: query.isLoading,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function calculatePeakGain(supabase: any, userId: string, leanMassKg: number | null): Promise<number> {
  const now = new Date();
  const fourWeeksAgo = subWeeks(now, 4);
  const eightWeeksAgo = subWeeks(now, 8);

  // Current period: last 4 weeks
  const { data: currentLogs } = await supabase
    .from('workout_logs')
    .select('pushup_reps, plank_seconds, run_distance')
    .eq('user_id', userId)
    .not('submitted_at', 'is', null)
    .gte('logged_at', fourWeeksAgo.toISOString())
    .lte('logged_at', now.toISOString());

  // Baseline period: 4-8 weeks ago
  const { data: baselineLogs } = await supabase
    .from('workout_logs')
    .select('pushup_reps, plank_seconds, run_distance')
    .eq('user_id', userId)
    .not('submitted_at', 'is', null)
    .gte('logged_at', eightWeeksAgo.toISOString())
    .lt('logged_at', fourWeeksAgo.toISOString());

  if (!currentLogs?.length || !baselineLogs?.length) return 0;

  // Body-weight normalization factor
  // If lean mass available, normalize push-up and plank values per kg of lean mass
  const bwFactor = leanMassKg && leanMassKg > 0 ? leanMassKg : 1; // kg, or 1 = no normalization
  const normalize = (val: number, isBodyweight: boolean) =>
    isBodyweight && leanMassKg ? val / bwFactor : val;

  // Volume: sum of all
  const curVolPush = normalize(currentLogs.reduce((s: number, l: { pushup_reps: number }) => s + (l.pushup_reps || 0), 0), true);
  const curVolPlank = normalize(currentLogs.reduce((s: number, l: { plank_seconds: number }) => s + (l.plank_seconds || 0), 0), true);
  const curVolRun = currentLogs.reduce((s: number, l: { run_distance: number }) => s + Number(l.run_distance || 0), 0);

  const baseVolPush = normalize(baselineLogs.reduce((s: number, l: { pushup_reps: number }) => s + (l.pushup_reps || 0), 0), true);
  const baseVolPlank = normalize(baselineLogs.reduce((s: number, l: { plank_seconds: number }) => s + (l.plank_seconds || 0), 0), true);
  const baseVolRun = baselineLogs.reduce((s: number, l: { run_distance: number }) => s + Number(l.run_distance || 0), 0);

  // Peak: max of each
  const curPeakPush = normalize(Math.max(...currentLogs.map((l: { pushup_reps: number }) => l.pushup_reps || 0)), true);
  const curPeakPlank = normalize(Math.max(...currentLogs.map((l: { plank_seconds: number }) => l.plank_seconds || 0)), true);
  const curPeakRun = Math.max(...currentLogs.map((l: { run_distance: number }) => Number(l.run_distance || 0)));

  const basePeakPush = normalize(Math.max(...baselineLogs.map((l: { pushup_reps: number }) => l.pushup_reps || 0)), true);
  const basePeakPlank = normalize(Math.max(...baselineLogs.map((l: { plank_seconds: number }) => l.plank_seconds || 0)), true);
  const basePeakRun = Math.max(...baselineLogs.map((l: { run_distance: number }) => Number(l.run_distance || 0)));

  // % improvements
  const pct = (cur: number, base: number) => {
    if (base === 0) return cur > 0 ? 100 : 0;
    return ((cur - base) / base) * 100;
  };

  const improvements = [
    pct(curVolPush, baseVolPush), pct(curVolPlank, baseVolPlank), pct(curVolRun, baseVolRun),
    pct(curPeakPush, basePeakPush), pct(curPeakPlank, basePeakPlank), pct(curPeakRun, basePeakRun),
  ];

  const avg = improvements.reduce((s, v) => s + v, 0) / improvements.length;
  return Math.round(avg * 10) / 10;
}

function defaultStamina(): StaminaData {
  return {
    staminaScore: 0,
    peakGain: 0,
    goalConsistency: 0,
    whoopRecovery: 70,
    leanMassStability: 95,
  };
}
