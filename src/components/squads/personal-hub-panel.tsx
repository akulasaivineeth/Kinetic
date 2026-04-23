'use client';

import { useMemo, useState, useEffect } from 'react';
import { addDays, endOfWeek, startOfWeek, subWeeks, subDays, startOfDay, endOfDay } from 'date-fns';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  Dot,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { KCard, KEyebrow } from '@/components/ui/k-primitives';
import { useAllTimeStats } from '@/hooks/use-alltime-stats';
import { useWorkoutLogs } from '@/hooks/use-workout-logs';
import { useAuth } from '@/providers/auth-provider';
import {
  buildWeekLineChart,
  type PersonalTrendCategory,
} from '@/lib/personal-trends-chart';
import { K } from '@/lib/design-tokens';
import type { WorkoutLog } from '@/types/database';

const BASE_CATEGORIES: { id: PersonalTrendCategory; label: string }[] = [
  { id: 'pushups', label: 'Push-ups' },
  { id: 'plank', label: 'Plank' },
  { id: 'run', label: 'Run' },
  { id: 'squats', label: 'Squats' },
];

function sumForCat(logs: WorkoutLog[], cat: PersonalTrendCategory): number {
  let s = 0;
  for (const log of logs) {
    if (cat === 'overall') s += log.session_score || 0;
    else if (cat === 'pushups') s += log.pushup_reps || 0;
    else if (cat === 'plank') s += log.plank_seconds || 0;
    else if (cat === 'squats') s += log.squat_reps || 0;
    else s += Number(log.run_distance) || 0;
  }
  return s;
}

function fmtVolume(cat: PersonalTrendCategory, v: number, unitPref: 'metric' | 'imperial') {
  if (cat === 'overall') return `${Math.round(v).toLocaleString()} pts`;
  if (cat === 'plank') return `${(v / 60).toFixed(1)} min`;
  if (cat === 'run') {
    if (unitPref === 'imperial') return `${(v * 0.621371).toFixed(1)} mi`;
    return `${v.toFixed(1)} km`;
  }
  return `${Math.round(v).toLocaleString()} reps`;
}

export function PersonalHubPanel() {
  const { profile } = useAuth();
  const unitPreference = profile?.unit_preference ?? 'metric';
  const [exercise, setExercise] = useState<PersonalTrendCategory>('overall');
  const [isOpen, setIsOpen] = useState(false);

  const { thisWeekStart, thisWeekEnd, lastWeekStart, lastWeekEnd, chartFrom, chartTo } = useMemo(() => {
    const now = new Date();
    const twEnd = endOfDay(now);
    const twStart = startOfDay(subDays(now, 6));
    
    const lwEnd = endOfDay(subDays(twStart, 1));
    const lwStart = startOfDay(subDays(lwEnd, 6));

    return {
      thisWeekStart: twStart,
      thisWeekEnd: twEnd,
      lastWeekStart: lwStart,
      lastWeekEnd: lwEnd,
      chartFrom: lwStart,
      chartTo: twEnd,
    };
  }, []);

  const { data: allLogs = [] } = useWorkoutLogs('custom', chartFrom, chartTo);

  const categories = useMemo(() => {
    const active = new Set<string>();
    active.add('overall');
    
    for (const log of allLogs) {
      if (log.pushup_reps && log.pushup_reps > 0) active.add('pushups');
      if (log.plank_seconds && log.plank_seconds > 0) active.add('plank');
      if (log.run_distance && Number(log.run_distance) > 0) active.add('run');
      if (log.squat_reps && log.squat_reps > 0) active.add('squats');
    }

    const filtered = BASE_CATEGORIES.filter(c => active.has(c.id));
    return [{ id: 'overall' as const, label: 'Overall' }, ...filtered];
  }, [allLogs]);

  useEffect(() => {
    if (!categories.find(c => c.id === exercise)) {
      setExercise('overall');
    }
  }, [categories, exercise]);

  const { data: allTime, isLoading: loadAt } = useAllTimeStats();
  const { data: thisWeekLogs = [], isLoading: loadTw } = useWorkoutLogs('custom', thisWeekStart, thisWeekEnd);
  const { data: lastWeekLogs = [], isLoading: loadLw } = useWorkoutLogs('custom', lastWeekStart, lastWeekEnd);
  const { data: chartLogs = [], isLoading: loadCh } = useWorkoutLogs('custom', chartFrom, chartTo);

  const weekCompare = useMemo(() => {
    return categories.map(({ id }) => {
      const tw = sumForCat(thisWeekLogs, id);
      const lw = sumForCat(lastWeekLogs, id);
      const deltaPct = lw > 0 ? Math.round(((tw - lw) / lw) * 100) : tw > 0 ? 100 : 0;
      return { id, tw, lw, deltaPct };
    });
  }, [thisWeekLogs, lastWeekLogs, categories]);

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
        score: p.score ?? 0,
        lastWeekScore: p.overlayScore ?? 0,
        fullLabel: p.tooltipLabel,
      })),
    [linePoints],
  );

  const catLabel = categories.find((c) => c.id === exercise)?.label ?? exercise;
  const selectedCompare = weekCompare.find((r) => r.id === exercise);

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
            main={fmtVolume('run', allTime?.totalRunDistance ?? 0, unitPreference)}
            sub={`Peak ${fmtVolume('run', allTime?.peakRunDistance ?? 0, unitPreference)}`}
          />
          <AllTimeCell label="Squats" main={allTime?.totalSquats ?? 0} sub={`Peak ${allTime?.peakSquats ?? 0}`} />
        </div>
      )}

      <div>
        <KEyebrow className="mb-2">This week vs last week</KEyebrow>
        {loadTw || loadLw ? (
          <div className="h-24 rounded-k-lg bg-k-card animate-pulse" />
        ) : (
          <KCard
            pad={14}
            className="border border-white/[0.06] bg-k-card/80 shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:bg-k-card/60"
          >
            <div className="relative mb-4" style={{ isolation: 'isolate' }}>
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full items-center justify-between rounded-[16px] border border-k-line-strong/80 bg-white dark:bg-[#1C1C1E] py-3.5 pl-5 pr-5 text-[15px] font-black text-k-ink shadow-sm outline-none transition-all focus:ring-4 focus:ring-emerald-500/10"
              >
                <span>{catLabel}</span>
                <motion.div
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-k-muted-soft">
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                </motion.div>
              </button>

              <AnimatePresence>
                {isOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-[190]" 
                      onClick={() => setIsOpen(false)} 
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 4, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="absolute left-0 right-0 z-[200] overflow-hidden rounded-[24px] border border-white/20 shadow-2xl dark:border-white/10"
                    >
                      {/* Dedicated High-Intensity Glass Layer */}
                      <div 
                        className="absolute inset-0 z-[-1] bg-white/40 dark:bg-black/40"
                        style={{ 
                          backdropFilter: 'blur(100px) saturate(210%) contrast(110%)', 
                          WebkitBackdropFilter: 'blur(100px) saturate(210%) contrast(110%)',
                        }}
                      />
                      
                      <div className="max-h-[300px] overflow-y-auto py-1">
                        {categories.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => {
                              setExercise(cat.id);
                              setIsOpen(false);
                            }}
                            className={`flex w-full items-center px-5 py-3 text-[15px] font-black transition-colors ${
                              exercise === cat.id
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'text-k-ink hover:bg-k-ink/5'
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            {selectedCompare && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px]">
                <span className="text-k-muted-soft tabular-nums">
                  {fmtVolume(exercise, selectedCompare.tw, unitPreference)}
                  <span className="text-k-muted-soft/70"> vs </span>
                  {fmtVolume(exercise, selectedCompare.lw, unitPreference)}
                </span>
                <span
                  className={`font-bold tabular-nums ${
                    selectedCompare.deltaPct > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : selectedCompare.deltaPct < 0
                        ? 'text-red-500'
                        : 'text-k-muted-soft'
                  }`}
                >
                  {selectedCompare.deltaPct > 0 ? '+' : ''}
                  {selectedCompare.deltaPct}%
                </span>
              </div>
            )}
          </KCard>
        )}
      </div>

      <div>
        <div className="flex justify-between items-baseline mb-2 gap-2 flex-wrap">
          <KEyebrow>Trends · this week</KEyebrow>
          <span className="text-[11px] text-k-muted-soft">vs last week (line)</span>
        </div>

        {loadCh ? (
          <div className="h-[220px] rounded-k-lg bg-k-card animate-pulse" />
        ) : (
          <KCard pad={12}>
            <p className="text-[11px] font-semibold text-k-muted-soft uppercase tracking-wide mb-2">{catLabel}</p>
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 4, left: -6, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: K.mutedSoft }} axisLine={false} tickLine={false} />
                  <YAxis 
                    tick={{ fontSize: 10, fill: K.mutedSoft }} 
                    axisLine={false} 
                    tickLine={false} 
                    width={42} 
                    domain={[
                      0, 
                      (dataMax: number) => {
                        // Category-specific minimum ceilings
                        const minCeil = exercise === 'overall' ? 1000 : 
                                       exercise === 'run' ? 10 : 
                                       exercise === 'plank' ? 5 : 
                                       50;
                        return Math.max(minCeil, Math.ceil(dataMax * 1.15));
                      }
                    ]}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload;
                      const thisWeekVal = data.thisWeek;
                      const lastWeekVal = data.lastWeek;
                      
                      return (
                        <div className="rounded-[18px] border border-k-line-strong bg-white dark:bg-[#1C1C1E] shadow-2xl p-4 min-w-[160px]">
                          <p className="text-[12px] font-black text-k-ink uppercase tracking-[0.12em] mb-3 border-b border-k-line/10 pb-2">
                            {data.fullLabel}
                          </p>
                          <div className="space-y-3">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-k-muted font-bold tracking-wider uppercase opacity-80">THIS WEEK</span>
                              <div className="flex items-baseline justify-between gap-4">
                                <span className="text-[15px] font-black text-k-ink">
                                  {thisWeekVal !== null ? fmtVolume(exercise, thisWeekVal, unitPreference) : '—'}
                                </span>
                                {exercise !== 'overall' && data.score > 0 && (
                                  <span className="text-[11px] font-bold text-k-ink opacity-60">
                                    +{Math.round(data.score).toLocaleString()} pts
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col pt-1">
                              <span className="text-[10px] text-k-muted font-bold tracking-wider uppercase opacity-60">LAST WEEK</span>
                              <div className="flex items-baseline justify-between gap-4">
                                <span className="text-[13px] font-semibold text-k-muted">
                                  {lastWeekVal !== null ? fmtVolume(exercise, lastWeekVal, unitPreference) : '—'}
                                </span>
                                {exercise !== 'overall' && data.lastWeekScore > 0 && (
                                  <span className="text-[10px] font-medium text-k-muted opacity-50">
                                    +{Math.round(data.lastWeekScore).toLocaleString()} pts
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
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
                    connectNulls={true}
                  />
                  <Line
                    type="monotone"
                    dataKey="thisWeek"
                    name="This week"
                    stroke={K.green}
                    strokeWidth={2.5}
                    connectNulls={false}
                    dot={(props: {
                      cx?: number;
                      cy?: number;
                      index?: number;
                      payload?: { peak?: boolean; name?: string };
                    }) => {
                      const { cx, cy, payload, index } = props;
                      const key = `pt-${payload?.name ?? index ?? 0}-${cx ?? 0}-${cy ?? 0}`;
                      if (payload?.peak && typeof cx === 'number' && typeof cy === 'number') {
                        return (
                          <circle key={key} cx={cx} cy={cy} r={5} fill={K.gold} stroke={K.ink} strokeWidth={1} />
                        );
                      }
                      if (typeof cx === 'number' && typeof cy === 'number') {
                        return <circle key={key} cx={cx} cy={cy} r={2} fill={K.green} />;
                      }
                      return <g key={key} />;
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
