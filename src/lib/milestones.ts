export interface Milestone {
  metric: 'pushups' | 'plank' | 'run';
  threshold: number;
  label: string;
  emoji: string;
}

const MILESTONES: Milestone[] = [
  { metric: 'pushups', threshold: 1000, label: '1K PUSH-UPS', emoji: '💪' },
  { metric: 'pushups', threshold: 5000, label: '5K PUSH-UPS', emoji: '🔥' },
  { metric: 'pushups', threshold: 10000, label: '10K PUSH-UPS', emoji: '⚡' },
  { metric: 'pushups', threshold: 25000, label: '25K PUSH-UPS', emoji: '🏆' },
  { metric: 'pushups', threshold: 50000, label: '50K PUSH-UPS', emoji: '👑' },
  { metric: 'plank', threshold: 3600, label: '1 HOUR PLANK', emoji: '🧘' },
  { metric: 'plank', threshold: 18000, label: '5 HOURS PLANK', emoji: '🔥' },
  { metric: 'plank', threshold: 36000, label: '10 HOURS PLANK', emoji: '⚡' },
  { metric: 'run', threshold: 50, label: '50 KM RUN', emoji: '🏃' },
  { metric: 'run', threshold: 100, label: '100 KM RUN', emoji: '🔥' },
  { metric: 'run', threshold: 500, label: '500 KM RUN', emoji: '⚡' },
  { metric: 'run', threshold: 1000, label: '1000 KM RUN', emoji: '🏆' },
];

export function checkNewMilestones(
  prevPushups: number,
  prevPlank: number,
  prevRun: number,
  newPushups: number,
  newPlank: number,
  newRun: number
): Milestone[] {
  const crossed: Milestone[] = [];
  for (const m of MILESTONES) {
    const prev = m.metric === 'pushups' ? prevPushups : m.metric === 'plank' ? prevPlank : prevRun;
    const curr = m.metric === 'pushups' ? newPushups : m.metric === 'plank' ? newPlank : newRun;
    if (prev < m.threshold && curr >= m.threshold) {
      crossed.push(m);
    }
  }
  return crossed;
}

export function getEarnedMilestones(pushups: number, plank: number, run: number): Milestone[] {
  return MILESTONES.filter((m) => {
    const val = m.metric === 'pushups' ? pushups : m.metric === 'plank' ? plank : run;
    return val >= m.threshold;
  });
}
