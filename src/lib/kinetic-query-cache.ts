import type { QueryClient } from '@tanstack/react-query';

/**
 * Invalidate workout / dashboard caches only — avoids refetching the entire app
 * (which `invalidateQueries()` with no filter does and can freeze the UI on PWA).
 */
export function invalidateWorkoutRelatedQueries(queryClient: QueryClient) {
  const prefixes = [
    'leaderboard',
    'weekly-volume',
    'workout-logs',
    'month-logs',
    'recent-workout-logs',
    'alltime-stats',
    'recent-weeks',
    'stamina',
    'user-milestone-unlocks',
    'shared-workout-logs',
    'today-score',
    'streak',
    'today-activities',
    'goals',
    'notifications',
    'draft-log',
    'activity-logs',
    'user-teams',
    'global-squads-week',
  ] as const;

  for (const key of prefixes) {
    void queryClient.invalidateQueries({ queryKey: [key] });
  }
}
