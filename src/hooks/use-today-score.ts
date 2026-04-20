'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';

export interface TodayScoreData {
  score: number;
  sessions: number;
  exercises: Array<{ slug: string; name: string; value: number; score: number; unit: string }>;
}

export function useTodayScore() {
  const { user } = useAuth();
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['today-score', user?.id, today],
    queryFn: async (): Promise<TodayScoreData> => {
      if (!user) return { score: 0, sessions: 0, exercises: [] };

      const { data: logs, error } = await supabase
        .from('workout_logs')
        .select('pushup_reps, plank_seconds, run_distance, squat_reps, session_score')
        .eq('user_id', user.id)
        .not('submitted_at', 'is', null)
        .gte('logged_at', `${today}T00:00:00`);

      if (error) throw error;
      if (!logs?.length) return { score: 0, sessions: 0, exercises: [] };

      let totalPush = 0, totalPlank = 0, totalRun = 0, totalSquat = 0, totalScore = 0;
      for (const log of logs) {
        totalPush += log.pushup_reps || 0;
        totalPlank += log.plank_seconds || 0;
        totalRun += Number(log.run_distance) || 0;
        totalSquat += log.squat_reps || 0;
        totalScore += log.session_score || 0;
      }

      const exercises: TodayScoreData['exercises'] = [];
      if (totalPush > 0) exercises.push({ slug: 'pushups', name: 'Push-ups', value: totalPush, score: Math.round(totalPush * 2.6), unit: 'reps' });
      if (totalSquat > 0) exercises.push({ slug: 'squats', name: 'Squats', value: totalSquat, score: Math.round(totalSquat * 2.6), unit: 'reps' });
      if (totalPlank > 0) exercises.push({ slug: 'plank', name: 'Plank', value: totalPlank, score: Math.round(totalPlank * 0.8), unit: 'sec' });
      if (totalRun > 0) exercises.push({ slug: 'run', name: 'Run', value: totalRun, score: Math.round(totalRun * 36), unit: 'km' });

      return {
        score: totalScore || exercises.reduce((s, e) => s + e.score, 0),
        sessions: logs.length,
        exercises,
      };
    },
    enabled: !!user,
  });
}
