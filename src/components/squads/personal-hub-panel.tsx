'use client';

import { useMemo, useState } from 'react';
import { addDays, endOfWeek, startOfWeek, subWeeks } from 'date-fns';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import { KCard, KEyebrow, KPill } from '@/components/ui/k-primitives';
import { useAllTimeStats } from '@/hooks/use-alltime-stats';
import { useWorkoutLogs } from '@/hooks/use-workout-logs';
import { useAuth } from '@/providers/auth-provider';
import {
  buildWeekLineChart,
  type PersonalTrendCategory,
} from '@/lib/personal-trends-chart';
import { K } from '@/lib/design-tokens';
import type { WorkoutLog } from '@/types/database';

const CATEGORIES: { id: PersonalTrendCategory; label: string }[] = [
  { id: 'pushups', label: 'Push-ups' },
  { id: 'plank', label: 'Plank' },
  { id: 'run', label: 'Run' },
  { id: 'squats', label: 'Squats' },
];

function sumForCat(logs: WorkoutLog[], cat: PersonalTrendCategory): number {
  let s = 0;
  for (const log of logs) {
    if (cat === 'pushups') s += log.pushup_reps || 0;
    else if (cat === 'plank') s += log.plank_seconds || 0;
    else if (cat === 'squats') s += log.squat_reps || 0;
    else s += Number(log.run_distance) || 0;
  }
  return s;
}

function fmtVolume(cat: PersonalTrendCategory, v: number, unitPref: 'metric' | 'imperial') {
  if (cat === 'plank') return `${(v / 60).toFixed(1)} min`;
  if (cat === 'run') {
    if (unitPref === 'imperial') return `${(v * 0.621371).toFixed(1)} mi`;
    return `${v.toFixed(1)} km`;
  }
  return `${Math.round(v).toLocaleString()} reps`;
}

export function PersonalHubPanel() {
  const { profile } = useAuth();
  const unitPref = profile?.unit_preference ?? 'metric';
  const [exercise, setExercise] = useState<PersonalTrendCategory>('pushups');

  const { thisWeekStart, thisWeekEnd, lastWeekStart, lastWeekEnd, chartFrom, chartTo } = useMemo(() => {
    const now = new Date();
    const tws = startOfWeek(now, { weekStartsOn: 1 });
    const twe = endOfWeek(now, { weekStartsOn: 1 });
    const lws = subWeeks(tws, 1);
    const lwe = endOfWeek(lws, { weekStartsOn: 1 });
    return {
      thisWeekStart: tws,
      thisWeekEnd: twe,
      lastWeekStart: lws,
      lastWeekEnd: lwe,
      chartFrom: addDays(tws, -14),
      chartTo: twe,
    };
  }, []);

  const { data: allTime, isLoading: loadAt } = useAllTimeStats();
  const { data: thisWeekLogs = [], isLoading: loadTw } = useWorkoutLogs('week');
  const { data: lastWeekLogs = [], isLoading: loadLw } = useWorkoutLogs('custom', lastWeekStart, lastWeekEnd);
  const { data: chartLogs = [], isLoading: loadCh } = useWorkoutLogs('custom', chartFrom, chartTo);

  const weekCompare = useMemo(() => {
    return CATEGORIES.map(({ id }) => {
      const tw = sumForCat(thisWeekLogs, id);
      const lw = sumForCat(lastWeekLogs, id);
      const deltaPct = lw > 0 ? Math.round(((tw - lw) / lw) * 100) : tw > 0 ? 100 : 0;
      return { id, tw, lw, deltaPct };
    });
  }, [thisWeekLogs, lastWeekLogs]);

  const linePoints = useMemo(
    () =>
      buildWeekLineChart(
        chartLogs,
        thisWeekStart,
        thisWeekEnd,
        exercise,
        'volume',
        'raw',
      ),
    [chartLogs, thisWeekStart, thisWeekEnd, exercise],
  );

  const chartData = useMemo(
    () =>
      linePoints.map((p) => ({
        name: p.weekday,
        thisWeek: p.total,
        lastWeek: p.overlay,
        peak: p.peakHighlight,
      })),
    [linePoints],
  );

  const catLabel = CATEGORIES.find((c) => c.id === exercise)?.label ?? exercise;

  return (
    <div className="space-y-4">
      <KEyebrow>All-time roll-up</KEyebrow>
      {loadAt ? (
        <div className="h-40 rounded-k-lg bg-k-card animate-pulse" />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <AllTimeCell label="Push-ups" main={allTime?.totalPushups ?? 0} sub={`Peak ${allTime?.peakPushups ?? 0}`} />
          <AllTimeCell
            label="Plank"
            main={`${((allTime?.totalPlankSeconds ?? 0) / 3600).toFixed(1)}h`}
            sub={`Peak ${((allTime?.peakPlankSeconds ?? 0) / 60).toFixed(0)} min`}
          />
          <AllTimeCell
            label="Run"
            main={fmtVolume('run', allTime?.totalRunDistance ?? 0, unitPref)}
            sub={`Peak ${fmtVolume('run', allTime?.peakRunDistance ?? 0, unitPref)}`}
          />
          <AllTimeCell label="Squats" main={allTime?.totalSquats ?? 0} sub={`Peak ${allTime?.peakSquats ?? 0}`} />
        </div>
      )}

      <div>
        <KEyebrow className="mb-2">This week vs last week</KEyebrow>
        {loadTw || loadLw ? (
          <div className="h-32 rounded-k-lg bg-k-card animate-pulse" />
        ) : (
          <KCard pad={14} className="space-y-2.5">
            {weekCompare.map((row) => {
              const { id } = row;
              const label = CATEGORIES.find((c) => c.id === id)?.label ?? id;
              return (
                <div
                  key={id}
                  className="flex items-center justify-between gap-2 text-[12px] border-b border-k-line last:border-0 pb-2 last:pb-0"
                >
                  <span className="font-bold text-k-ink shrink-0">{label}</span>
                  <div className="flex items-center gap-2 min-w-0 flex-wrap justify-end">
                    <span className="text-k-muted-soft tabular-nums">
                      {fmtVolume(id, row.tw, unitPref)}
                      <span className="text-k-muted-soft/70"> vs </span>
                      {fmtVolume(id, row.lw, unitPref)}
                    </span>
                    <span
                      className={`font-bold tabular-nums shrink-0 ${
                        row.deltaPct > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : row.deltaPct < 0
                            ? 'text-red-500'
                            : 'text-k-muted-soft'
                      }`}
                    >
                      {row.deltaPct > 0 ? '+' : ''}
                      {row.deltaPct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </KCard>
        )}
      </div>

      <div>
        <div className="flex justify-between items-baseline mb-2 gap-2 flex-wrap">
          <KEyebrow>Trends · this week</KEyebrow>
          <span className="text-[11px] text-k-muted-soft">vs last week (line)</span>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {CATEGORIES.map(({ id, label }) => (
            <KPill key={id} size="sm" active={exercise === id} onClick={() => setExercise(id)}>
              {label}
            </KPill>
          ))}
        </div>

        {loadCh ? (
          <div className="h-[220px] rounded-k-lg bg-k-card animate-pulse" />
        ) : (
          <KCard pad={12}>
            <p className="text-[11px] font-semibold text-k-muted-soft uppercase tracking-wide mb-2">{catLabel}</p>
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: K.mutedSoft }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: K.mutedSoft }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip
                    contentStyle={{
                      background: K.card,
                      border: `1px solid ${K.lineStrong}`,
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(value: unknown) => {
                      const v = typeof value === 'number' && !Number.isNaN(value) ? value : null;
                      if (v === null) return ['—'];
                      if (exercise === 'plank') return [`${v.toFixed(1)} min`];
                      if (exercise === 'run') {
                        return unitPref === 'imperial'
                          ? [`${(v * 0.621371).toFixed(1)} mi`]
                          : [`${v.toFixed(1)} km`];
                      }
                      return [`${Math.round(v).toLocaleString()} reps`];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line
                    type="monotone"
                    dataKey="lastWeek"
                    name="Last week"
                    stroke={K.mutedSoft}
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="thisWeek"
                    name="This week"
                    stroke={K.green}
                    strokeWidth={2.5}
                    connectNulls={false}
                    dot={(props: { cx?: number; cy?: number; payload?: { peak?: boolean } }) => {
                      const { cx, cy, payload } = props;
                      if (payload?.peak && typeof cx === 'number' && typeof cy === 'number') {
                        return <circle cx={cx} cy={cy} r={5} fill={K.gold} stroke={K.ink} strokeWidth={1} />;
                      }
                      if (typeof cx === 'number' && typeof cy === 'number') {
                        return <circle cx={cx} cy={cy} r={2} fill={K.green} />;
                      }
                      return <g />;
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-k-muted-soft mt-2 leading-snug">
              Plank and run use the same units as your log. Gold dot marks peak set this week (volume view).
            </p>
          </KCard>
        )}
      </div>
    </div>
  );
}

function AllTimeCell({ label, main, sub }: { label: string; main: string | number; sub: string }) {
  return (
    <KCard pad={14} className="!py-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-k-muted-soft">{label}</p>
      <p className="text-lg font-display text-k-ink tabular-nums mt-0.5 leading-tight">
        {typeof main === 'number' ? main.toLocaleString() : main}
      </p>
      <p className="text-[10px] text-k-muted-soft mt-1">{sub}</p>
    </KCard>
  );
}
