import { createClient } from '@/lib/supabase/client';
import { getDateRange } from '@/hooks/use-workout-logs';
import type { LeaderboardEntry } from '@/types/database';

/** Weekly arena rank (volume / raw) for score reveal and log preview. */
export async function fetchWeeklyVolumeRank(userId: string): Promise<number | null> {
  const supabase = createClient();
  const { from, to } = getDateRange('week');
  const { data, error } = await supabase.rpc('get_leaderboard', {
    p_user_id: userId,
    p_date_from: from.toISOString(),
    p_date_to: to.toISOString(),
    p_metric: 'volume',
    p_mode: 'raw',
  });
  if (error || !data) return null;
  const idx = (data as LeaderboardEntry[]).findIndex((e) => e.user_id === userId);
  return idx >= 0 ? idx + 1 : null;
}
