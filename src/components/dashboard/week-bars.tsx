'use client';

import { useMemo } from 'react';
import type { WorkoutLog } from '@/types/database';
import { cn } from '@/lib/utils';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

function dailySessionScores(logs: WorkoutLog[]): number[] {
  const scores = [0, 0, 0, 0, 0, 0, 0];
  for (const log of logs) {
    const idx = (new Date(log.logged_at).getDay() + 6) % 7;
    scores[idx] += log.session_score || 0;
  }
  return scores;
}

export type WeekBarsProps = {
  thisWeekLogs: WorkoutLog[];
  lastWeekLogs: WorkoutLog[];
  /** Defaults to now — used to highlight today's column (Mon=0 … Sun=6). */
  now?: Date;
  className?: string;
  /** Show header with total pts and week-over-week delta. */
  showHeader?: boolean;
};

export function WeekBars({
  thisWeekLogs,
  lastWeekLogs,
  now = new Date(),
  className,
  showHeader = true,
}: WeekBarsProps) {
  const thisWeekScores = useMemo(() => dailySessionScores(thisWeekLogs), [thisWeekLogs]);
  const lastWeekScores = useMemo(() => dailySessionScores(lastWeekLogs), [lastWeekLogs]);

  const thisWeekTotal = thisWeekScores.reduce((a, b) => a + b, 0);
  const lastWeekTotal = lastWeekScores.reduce((a, b) => a + b, 0);
  const weekDelta =
    lastWeekTotal > 0 ? Math.round(((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100) : 0;
  const barMax = Math.max(...thisWeekScores, ...lastWeekScores, 1);
  const todayIdx = (now.getDay() + 6) % 7;

  return (
    <div className={cn('w-full', className)}>
      {showHeader && (
        <div className="flex justify-between items-baseline mb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-dark-muted">This week</p>
            <p className="text-xl font-black text-dark-text mt-1 tabular-nums">
              {thisWeekTotal.toLocaleString()} pts
            </p>
          </div>
          {weekDelta !== 0 && (
            <span className="text-[11px] font-bold text-emerald-500 tracking-wide">
              {weekDelta > 0 ? '+' : ''}
              {weekDelta}% vs last
            </span>
          )}
        </div>
      )}

      <div className="flex items-end gap-2.5 h-[120px]">
        {thisWeekScores.map((v, i) => {
          const last = lastWeekScores[i];
          const isToday = i === todayIdx;
          return (
            <div key={DAY_LABELS[i]} className="flex-1 flex flex-col items-center gap-1 min-w-0">
              <div
                className={cn(
                  'font-bold text-[9px] h-3 tabular-nums',
                  isToday ? 'text-emerald-500' : 'text-dark-muted/70',
                )}
              >
                {v > 0 ? v : ''}
              </div>
              <div className="flex-1 w-full flex items-end justify-center gap-0.5">
                <div
                  className="w-1.5 rounded-sm bg-dark-border/80 min-h-0 transition-[height]"
                  style={{
                    height: `${(last / barMax) * 100}%`,
                    minHeight: last > 0 ? 3 : 0,
                  }}
                />
                <div
                  className={cn(
                    'w-3.5 rounded transition-[height]',
                    isToday ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.45)]' : 'bg-emerald-600',
                    v === 0 && 'opacity-20',
                  )}
                  style={{
                    height: `${(v / barMax) * 100}%`,
                    minHeight: v > 0 ? 3 : 0,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2.5 mt-2">
        {DAY_LABELS.map((d, i) => (
          <div
            key={d}
            className={cn(
              'flex-1 text-center uppercase text-[10px] tracking-wide',
              i === todayIdx ? 'font-bold text-emerald-500' : 'font-medium text-dark-muted/70',
            )}
          >
            {d}
          </div>
        ))}
      </div>
    </div>
  );
}
