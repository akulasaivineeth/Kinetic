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
    queryKey: [
      'stamina',
      user?.id,
      goals?.pushup_weekly_goal ?? 500,
      goals?.plank_weekly_goal ?? 600,
      goals?.run_weekly_goal ?? 15,
      goals?.squat_weekly_goal ?? 300,
      weeklyVolume?.total_pushups ?? 0,
      weeklyVolume?.total_plank_seconds ?? 0,
      Number(weeklyVolume?.total_run_distance ?? 0),
      weeklyVolume?.total_squats ?? 0,
    ],
    queryFn: async (): Promise<StaminaData> => {
      if (!user) return defaultStamina();

      // --- 1. Goal Consistency (30%) ---
      const pushupGoal = goals?.pushup_weekly_goal || 500;
      const plankGoal = goals?.plank_weekly_goal || 600;
      const runGoal = goals?.run_weekly_goal || 15;
      const squatGoal = goals?.squat_weekly_goal || 300;

      const currentPushups = weeklyVolume?.total_pushups || 0;
      const currentPlank = weeklyVolume?.total_plank_seconds || 0;
      const currentRun = Number(weeklyVolume?.total_run_distance || 0);
      const currentSquats = weeklyVolume?.total_squats || 0;

      const pushupProgress = Math.min(currentPushups / pushupGoal, 1);
      const plankProgress = Math.min(currentPlank / plankGoal, 1);
      const runProgress = Math.min(currentRun / runGoal, 1);
      const squatProgress = Math.min(currentSquats / squatGoal, 1);
      const goalConsistency = Math.round(((pushupProgress + plankProgress + runProgress + squatProgress) / 4) * 100);

      // --- 2. Whoop Recovery (40%) ---
      let whoopRecovery = 70; // Default fallback
      try {
        const fourWeeksAgoIso = subWeeks(new Date(), 4).toISOString();
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
        } else {
          // Graceful fallback: use 4-week average if latest snapshot is unavailable.
          const { data: fallbackRecovery } = await supabase
            .from('whoop_events')
            .select('payload')
            .eq('user_id', user.id)
            .eq('event_type', 'recovery.updated')
            .gte('created_at', fourWeeksAgoIso)
            .order('created_at', { ascending: false })
            .limit(20);

          if (fallbackRecovery?.length) {
            const scores = fallbackRecovery
              .map((row) => {
                const payload = row.payload as Record<string, unknown>;
                const recovery = payload?.recovery as Record<string, unknown> | undefined;
                const score = recovery?.score as Record<string, unknown> | undefined;
                return score?.recovery_score as number | undefined;
              })
              .filter((v): v is number => typeof v === 'number');
            if (scores.length) {
              whoopRecovery = Math.round(scores.reduce((sum, val) => sum + val, 0) / scores.length);
            }
          }
        }
      } catch {
        // Silently use default
      }

      // --- 3. Lean Mass Stability (30%) ---
      let leanMassStability = 95;
      let latestLeanMass: number | null = null;
      try {
        const fourWeeksAgoIso = subWeeks(new Date(), 4).toISOString();
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
        } else if (latestLeanMass) {
          // Graceful fallback: compare latest with 4-week average when no direct baseline sample exists.
          const { data: baselineEvents } = await supabase
            .from('whoop_events')
            .select('payload')
            .eq('user_id', user.id)
            .eq('event_type', 'body_measurement.updated')
            .gte('created_at', fourWeeksAgoIso)
            .order('created_at', { ascending: false })
            .limit(20);

          const leanSamples = (baselineEvents ?? [])
            .map((row) => (row.payload as Record<string, unknown>)?.lean_mass as number | undefined)
            .filter((v): v is number => typeof v === 'number' && v > 0);

          if (leanSamples.length) {
            const baselineAvg = leanSamples.reduce((sum, val) => sum + val, 0) / leanSamples.length;
            const pctChange = baselineAvg > 0 ? Math.abs((latestLeanMass - baselineAvg) / baselineAvg) * 100 : 0;
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

  const { data: currentLogs } = await supabase
    .from('workout_logs')
    .select('pushup_reps, plank_seconds, run_distance, squat_reps')
    .eq('user_id', userId)
    .not('submitted_at', 'is', null)
    .gte('logged_at', fourWeeksAgo.toISOString())
    .lte('logged_at', now.toISOString());

  const { data: baselineLogs } = await supabase
    .from('workout_logs')
    .select('pushup_reps, plank_seconds, run_distance, squat_reps')
    .eq('user_id', userId)
    .not('submitted_at', 'is', null)
    .gte('logged_at', eightWeeksAgo.toISOString())
    .lt('logged_at', fourWeeksAgo.toISOString());

  if (!currentLogs?.length || !baselineLogs?.length) return 0;

  // Body-weight normalization factor
  // If lean mass available, normalize push-up and plank values per kg of lean mass
  // Using the latest lean mass for both current and baseline to compare pure performance delta per KG.
  const bwFactor = leanMassKg && leanMassKg > 0 ? leanMassKg : 75; // kg default
  const normalize = (val: number, isBodyweight: boolean) =>
    isBodyweight ? val / bwFactor : val;

  const curVolPush = normalize(currentLogs.reduce((s: number, l: { pushup_reps: number }) => s + (l.pushup_reps || 0), 0), true);
  const curVolPlank = normalize(currentLogs.reduce((s: number, l: { plank_seconds: number }) => s + (l.plank_seconds || 0), 0), true);
  const curVolRun = currentLogs.reduce((s: number, l: { run_distance: number }) => s + Number(l.run_distance || 0), 0);
  const curVolSquat = normalize(currentLogs.reduce((s: number, l: { squat_reps: number }) => s + (l.squat_reps || 0), 0), true);

  const baseVolPush = normalize(baselineLogs.reduce((s: number, l: { pushup_reps: number }) => s + (l.pushup_reps || 0), 0), true);
  const baseVolPlank = normalize(baselineLogs.reduce((s: number, l: { plank_seconds: number }) => s + (l.plank_seconds || 0), 0), true);
  const baseVolRun = baselineLogs.reduce((s: number, l: { run_distance: number }) => s + Number(l.run_distance || 0), 0);
  const baseVolSquat = normalize(baselineLogs.reduce((s: number, l: { squat_reps: number }) => s + (l.squat_reps || 0), 0), true);

  const curPeakPush = normalize(Math.max(...currentLogs.map((l: { pushup_reps: number }) => l.pushup_reps || 0)), true);
  const curPeakPlank = normalize(Math.max(...currentLogs.map((l: { plank_seconds: number }) => l.plank_seconds || 0)), true);
  const curPeakRun = Math.max(...currentLogs.map((l: { run_distance: number }) => Number(l.run_distance || 0)));
  const curPeakSquat = normalize(Math.max(...currentLogs.map((l: { squat_reps: number }) => l.squat_reps || 0)), true);

  const basePeakPush = normalize(Math.max(...baselineLogs.map((l: { pushup_reps: number }) => l.pushup_reps || 0)), true);
  const basePeakPlank = normalize(Math.max(...baselineLogs.map((l: { plank_seconds: number }) => l.plank_seconds || 0)), true);
  const basePeakRun = Math.max(...baselineLogs.map((l: { run_distance: number }) => Number(l.run_distance || 0)));
  const basePeakSquat = normalize(Math.max(...baselineLogs.map((l: { squat_reps: number }) => l.squat_reps || 0)), true);

  const pct = (cur: number, base: number) => {
    if (base === 0) return cur > 0 ? 100 : 0;
    return ((cur - base) / base) * 100;
  };

  const improvements = [
    pct(curVolPush, baseVolPush), pct(curVolPlank, baseVolPlank), pct(curVolRun, baseVolRun), pct(curVolSquat, baseVolSquat),
    pct(curPeakPush, basePeakPush), pct(curPeakPlank, basePeakPlank), pct(curPeakRun, basePeakRun), pct(curPeakSquat, basePeakSquat),
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
