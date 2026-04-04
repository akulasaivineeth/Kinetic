'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import { useGoals } from './use-goals';
import { useWeeklyVolume } from './use-workout-logs';
import { subWeeks, startOfWeek } from 'date-fns';

const supabase = createClient();

/**
 * Stamina Score = 40% Whoop Recovery + 30% Goal Consistency + 30% Lean Mass Stability
 * Peak Gain = avg % improvement across Volume+Peak for all 3 metrics vs 4-week baseline
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

  const query = useQuery({
    queryKey: ['stamina', user?.id, goals, weeklyVolume],
    queryFn: async (): Promise<StaminaData> => {
      if (!user) return defaultStamina();

      // --- 1. Goal Consistency (30%) ---
      // How many of the 3 weekly goals have been met this week?
      const pushupGoal = goals?.pushup_weekly_goal || 500;
      const plankGoal = goals?.plank_weekly_goal || 600;
      const runGoal = goals?.run_weekly_goal || 15;

      const currentPushups = weeklyVolume?.total_pushups || 0;
      const currentPlank = weeklyVolume?.total_plank_seconds || 0;
      const currentRun = Number(weeklyVolume?.total_run_distance || 0);

      let goalsHit = 0;
      if (currentPushups >= pushupGoal) goalsHit++;
      if (currentPlank >= plankGoal) goalsHit++;
      if (currentRun >= runGoal) goalsHit++;

      // Scale 0-100: partial credit for progress toward each goal
      const pushupProgress = Math.min(currentPushups / pushupGoal, 1);
      const plankProgress = Math.min(currentPlank / plankGoal, 1);
      const runProgress = Math.min(currentRun / runGoal, 1);
      const goalConsistency = Math.round(((pushupProgress + plankProgress + runProgress) / 3) * 100);

      // --- 2. Whoop Recovery (40%) ---
      // Try to get latest recovery score from whoop_events
      let whoopRecovery = 70; // Default fallback when no Whoop connected
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
      // % stability from 4-week baseline (100 = perfectly stable, lower = losing/gaining too fast)
      // Falls back to 95 if no Whoop body measurement data
      let leanMassStability = 95;
      try {
        const { data: bodyEvents } = await supabase
          .from('whoop_events')
          .select('payload, created_at')
          .eq('user_id', user.id)
          .eq('event_type', 'body_measurement.updated')
          .order('created_at', { ascending: false })
          .limit(5);

        if (bodyEvents && bodyEvents.length >= 2) {
          const latest = (bodyEvents[0].payload as Record<string, unknown>)?.lean_mass as number | undefined;
          const baseline = (bodyEvents[bodyEvents.length - 1].payload as Record<string, unknown>)?.lean_mass as number | undefined;
          if (latest && baseline && baseline > 0) {
            const pctChange = Math.abs((latest - baseline) / baseline) * 100;
            leanMassStability = Math.max(0, Math.round(100 - pctChange * 10)); // 1% change = -10 pts
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
      // Average % improvement across Volume+Peak for all 3 metrics vs 4-week baseline
      const peakGain = await calculatePeakGain(user.id);

      return {
        staminaScore: Math.min(staminaScore, 100),
        peakGain,
        goalConsistency,
        whoopRecovery,
        leanMassStability,
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return {
    data: query.data || defaultStamina(),
    isLoading: query.isLoading,
  };
}

async function calculatePeakGain(userId: string): Promise<number> {
  const now = new Date();
  const fourWeeksAgo = subWeeks(now, 4);
  const eightWeeksAgo = subWeeks(now, 8);
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });

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

  // Volume: sum of all
  const currentVolPushups = currentLogs.reduce((s, l) => s + (l.pushup_reps || 0), 0);
  const currentVolPlank = currentLogs.reduce((s, l) => s + (l.plank_seconds || 0), 0);
  const currentVolRun = currentLogs.reduce((s, l) => s + Number(l.run_distance || 0), 0);

  const baselineVolPushups = baselineLogs.reduce((s, l) => s + (l.pushup_reps || 0), 0);
  const baselineVolPlank = baselineLogs.reduce((s, l) => s + (l.plank_seconds || 0), 0);
  const baselineVolRun = baselineLogs.reduce((s, l) => s + Number(l.run_distance || 0), 0);

  // Peak: max of each
  const currentPeakPushups = Math.max(...currentLogs.map(l => l.pushup_reps || 0));
  const currentPeakPlank = Math.max(...currentLogs.map(l => l.plank_seconds || 0));
  const currentPeakRun = Math.max(...currentLogs.map(l => Number(l.run_distance || 0)));

  const baselinePeakPushups = Math.max(...baselineLogs.map(l => l.pushup_reps || 0));
  const baselinePeakPlank = Math.max(...baselineLogs.map(l => l.plank_seconds || 0));
  const baselinePeakRun = Math.max(...baselineLogs.map(l => Number(l.run_distance || 0)));

  // Calculate % improvements (avoid divide by zero)
  const improvements: number[] = [];
  const calcPct = (current: number, baseline: number) => {
    if (baseline === 0) return current > 0 ? 100 : 0;
    return ((current - baseline) / baseline) * 100;
  };

  improvements.push(calcPct(currentVolPushups, baselineVolPushups));
  improvements.push(calcPct(currentVolPlank, baselineVolPlank));
  improvements.push(calcPct(currentVolRun, baselineVolRun));
  improvements.push(calcPct(currentPeakPushups, baselinePeakPushups));
  improvements.push(calcPct(currentPeakPlank, baselinePeakPlank));
  improvements.push(calcPct(currentPeakRun, baselinePeakRun));

  const avgImprovement = improvements.reduce((s, v) => s + v, 0) / improvements.length;
  return Math.round(avgImprovement * 10) / 10;
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
