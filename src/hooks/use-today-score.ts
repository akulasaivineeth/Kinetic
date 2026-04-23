'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';

export interface SessionDetail {
  value: number;
  score: number;
  loggedAt: string;
}

export interface TodayScoreData {
  score: number;
  sessions: number;
  exercises: Array<{
    slug: string;
    name: string;
    value: number;
    score: number;
    unit: string;
    sessions: SessionDetail[];
  }>;
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
        .select('logged_at, pushup_reps, plank_seconds, run_distance, squat_reps, session_score, pushup_score, squat_score, plank_score, run_score')
        .eq('user_id', user.id)
        .not('submitted_at', 'is', null)
        .gte('logged_at', `${today}T00:00:00`);

      if (error) throw error;
      if (!logs?.length) return { score: 0, sessions: 0, exercises: [] };

      let totalScore = 0;
      const categories: Record<string, { name: string; unit: string; value: number; score: number; sessions: SessionDetail[] }> = {
        pushups: { name: 'Push-ups', unit: 'reps', value: 0, score: 0, sessions: [] },
        squats: { name: 'Squats', unit: 'reps', value: 0, score: 0, sessions: [] },
        plank: { name: 'Plank', unit: 'sec', value: 0, score: 0, sessions: [] },
        run: { name: 'Run', unit: 'km', value: 0, score: 0, sessions: [] },
      };

      for (const log of logs) {
        totalScore += log.session_score || 0;

        if (log.pushup_reps > 0) {
          categories.pushups.value += log.pushup_reps;
          categories.pushups.score += log.pushup_score || 0;
          categories.pushups.sessions.push({ value: log.pushup_reps, score: log.pushup_score || 0, loggedAt: log.logged_at });
        }
        if (log.squat_reps > 0) {
          categories.squats.value += log.squat_reps;
          categories.squats.score += log.squat_score || 0;
          categories.squats.sessions.push({ value: log.squat_reps, score: log.squat_score || 0, loggedAt: log.logged_at });
        }
        if (log.plank_seconds > 0) {
          categories.plank.value += log.plank_seconds;
          categories.plank.score += log.plank_score || 0;
          categories.plank.sessions.push({ value: log.plank_seconds, score: log.plank_score || 0, loggedAt: log.logged_at });
        }
        if (Number(log.run_distance) > 0) {
          categories.run.value += Number(log.run_distance);
          categories.run.score += log.run_score || 0;
          categories.run.sessions.push({ value: Number(log.run_distance), score: log.run_score || 0, loggedAt: log.logged_at });
        }
      }

      const exercises = Object.entries(categories)
        .filter(([_, data]) => data.value > 0)
        .map(([slug, data]) => ({
          slug,
          ...data,
          score: Math.round(data.score),
          sessions: data.sessions.sort((a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime())
        }));

      return {
        score: Math.round(totalScore),
        sessions: logs.length,
        exercises,
      };
    },
    enabled: !!user,
  });
}
