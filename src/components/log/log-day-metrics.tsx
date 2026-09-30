'use client';

import { exerciseIcon } from '@/components/ui/k-icons';
import { formatPlankTime } from '@/lib/utils';

export function LogDayMetrics({
  log,
  runLabel,
}: {
  log: {
    pushup_reps?: number | null;
    squat_reps?: number | null;
    plank_seconds?: number | null;
    run_distance?: number | string | null;
  };
  runLabel?: string;
}) {
  const chips: { key: string; slug: string; text: string }[] = [];
  if ((log.pushup_reps ?? 0) > 0) chips.push({ key: 'pu', slug: 'pushups', text: String(log.pushup_reps) });
  if ((log.squat_reps ?? 0) > 0) chips.push({ key: 'sq', slug: 'squats', text: String(log.squat_reps) });
  if ((log.plank_seconds ?? 0) > 0) chips.push({ key: 'pl', slug: 'plank', text: formatPlankTime(log.plank_seconds ?? 0) });
  if (Number(log.run_distance ?? 0) > 0) {
    chips.push({ key: 'rn', slug: 'run', text: runLabel ?? `${Number(log.run_distance)}km` });
  }

  return (
    <div className="flex flex-wrap gap-3 items-center font-bold text-sm tracking-wide text-dark-text">
      {chips.map(({ key, slug, text }) => {
        const Icon = exerciseIcon(slug);
        return (
          <span key={key} className="inline-flex items-center gap-1.5">
            <Icon size={16} color="#10B981" />
            <span>{text}</span>
          </span>
        );
      })}
    </div>
  );
}
