import type { WorkoutLog } from '@/types/database';
import type { PerformanceGoals } from '@/types/database';
import { startOfWeek, subWeeks, isWithinInterval } from 'date-fns';

export interface Insight {
  type: 'positive' | 'suggestion' | 'warning';
  text: string;
}

export function generateInsights(
  logs: WorkoutLog[],
  goals: PerformanceGoals | null,
  streak: number
): Insight[] {
  const insights: Insight[] = [];
  const now = new Date();
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const lastWeekStart = subWeeks(thisWeekStart, 1);

  const thisWeekLogs = logs.filter((l) =>
    isWithinInterval(new Date(l.logged_at), { start: thisWeekStart, end: now })
  );
  const lastWeekLogs = logs.filter((l) =>
    isWithinInterval(new Date(l.logged_at), { start: lastWeekStart, end: thisWeekStart })
  );

  const sum = (arr: WorkoutLog[], key: 'pushup_reps' | 'plank_seconds' | 'squat_reps') =>
    arr.reduce((s, l) => s + (l[key] || 0), 0);
  const sumRun = (arr: WorkoutLog[]) =>
    arr.reduce((s, l) => s + (Number(l.run_distance) || 0), 0);

  const twPush = sum(thisWeekLogs, 'pushup_reps');
  const lwPush = sum(lastWeekLogs, 'pushup_reps');
  const twPlank = sum(thisWeekLogs, 'plank_seconds');
  const lwPlank = sum(lastWeekLogs, 'plank_seconds');
  const twRun = sumRun(thisWeekLogs);
  const lwRun = sumRun(lastWeekLogs);
  const twSquat = sum(thisWeekLogs, 'squat_reps');
  const lwSquat = sum(lastWeekLogs, 'squat_reps');

  if (twPush > lwPush * 1.2 && lwPush > 0) {
    insights.push({ type: 'positive', text: `Push-ups are up ${Math.round(((twPush - lwPush) / lwPush) * 100)}% from last week. Keep it up!` });
  }
  if (twPlank > lwPlank * 1.2 && lwPlank > 0) {
    insights.push({ type: 'positive', text: `Plank time is up ${Math.round(((twPlank - lwPlank) / lwPlank) * 100)}% from last week. Strong hold!` });
  }
  if (twRun > lwRun * 1.2 && lwRun > 0) {
    insights.push({ type: 'positive', text: `Running is up ${Math.round(((twRun - lwRun) / lwRun) * 100)}% from last week. Nice pace!` });
  }
  if (twSquat > lwSquat * 1.2 && lwSquat > 0) {
    insights.push({ type: 'positive', text: `Squats are up ${Math.round(((twSquat - lwSquat) / lwSquat) * 100)}% from last week. Leg day pays off!` });
  }

  if (twPush === 0 && thisWeekLogs.length > 0) {
    insights.push({ type: 'suggestion', text: 'No push-ups logged this week. Try adding a quick set to your next session.' });
  }
  if (twRun === 0 && thisWeekLogs.length > 0) {
    insights.push({ type: 'suggestion', text: 'No running this week. Even a short 2km jog helps maintain your streak.' });
  }
  if (twPlank === 0 && thisWeekLogs.length > 0) {
    insights.push({ type: 'suggestion', text: 'No plank this week. A 60-second hold goes a long way.' });
  }
  if (twSquat === 0 && thisWeekLogs.length > 0) {
    insights.push({ type: 'suggestion', text: 'No squats this week. Add a set of bodyweight squats to round out your training.' });
  }

  if (goals) {
    const pushPct = goals.pushup_weekly_goal ? (twPush / goals.pushup_weekly_goal) * 100 : 0;
    const plankPct = goals.plank_weekly_goal ? (twPlank / goals.plank_weekly_goal) * 100 : 0;
    const runPct = goals.run_weekly_goal ? (twRun / goals.run_weekly_goal) * 100 : 0;

    if (pushPct > 120 && plankPct > 120 && runPct > 120) {
      insights.push({ type: 'positive', text: 'You\'re exceeding all 3 goals by 20%+. Consider raising your targets in Profile.' });
    }
    if (pushPct < 50 && plankPct < 50 && runPct < 50 && thisWeekLogs.length > 0) {
      insights.push({ type: 'warning', text: 'Below 50% on all goals. Lower your targets to stay motivated, or push harder this week.' });
    }
  }

  if (streak >= 4) {
    insights.push({ type: 'positive', text: `${streak}-week streak! Consistency is the ultimate cheat code.` });
  }

  if (thisWeekLogs.length >= 5) {
    insights.push({ type: 'warning', text: `${thisWeekLogs.length} sessions this week. Consider a recovery day to prevent overtraining.` });
  }

  return insights.slice(0, 3);
}
