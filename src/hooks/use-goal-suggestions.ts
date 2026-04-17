'use client';

import { useMemo } from 'react';
import { useGoals } from './use-goals';
import { useWeeklyVolume } from './use-workout-logs';

export interface GoalSuggestion {
  metric: string;
  current: number;
  suggested: number;
  direction: 'up' | 'down';
  reason: string;
}

export function useGoalSuggestions(): GoalSuggestion[] {
  const { data: goals } = useGoals();
  const { data: vol } = useWeeklyVolume();

  return useMemo(() => {
    if (!goals || !vol) return [];
    const suggestions: GoalSuggestion[] = [];

    const check = (
      metric: string,
      actual: number,
      goal: number
    ) => {
      if (goal <= 0) return;
      const pct = actual / goal;
      if (pct > 1.3) {
        suggestions.push({
          metric,
          current: goal,
          suggested: Math.round(actual * 1.1),
          direction: 'up',
          reason: `You're exceeding your ${metric.toLowerCase()} goal by ${Math.round((pct - 1) * 100)}%. Time to level up.`,
        });
      } else if (pct < 0.4 && actual > 0) {
        suggestions.push({
          metric,
          current: goal,
          suggested: Math.round(actual * 1.5),
          direction: 'down',
          reason: `You're at ${Math.round(pct * 100)}% of your ${metric.toLowerCase()} goal. Lowering it keeps you motivated.`,
        });
      }
    };

    check('Push-ups', vol.total_pushups, goals.pushup_weekly_goal);
    check('Plank', vol.total_plank_seconds, goals.plank_weekly_goal);
    check('Run', Number(vol.total_run_distance), goals.run_weekly_goal);
    check('Squats', vol.total_squats, goals.squat_weekly_goal);

    return suggestions;
  }, [goals, vol]);
}
