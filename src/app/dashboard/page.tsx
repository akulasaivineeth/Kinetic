'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AppShell } from '@/components/layout/app-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { ScoreRing } from '@/components/ui/score-ring';
import { TogglePills } from '@/components/ui/toggle-pills';
import { DateRangeTabs } from '@/components/ui/date-range-tabs';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { DashboardCardSkeleton, ChartSkeleton } from '@/components/ui/skeleton';
import { useWorkoutLogs, type DateRange, getDateRange } from '@/hooks/use-workout-logs';
import {
  isWeekLineMode,
  shouldUseMonthBars,
  getChartLogFetchRange,
  buildWeekLineChart,
  buildMultiWeekBars,
  buildMonthlyBars,
  type PersonalTrendCategory,
  type WeekLinePoint,
  type WeekBarRow,
} from '@/lib/personal-trends-chart';
import { useAllTimeStats } from '@/hooks/use-alltime-stats';
import { useRecentWeeks } from '@/hooks/use-recent-weeks';
import { useWeeklyVolume } from '@/hooks/use-workout-logs';
import { useGoals } from '@/hooks/use-goals';
import { useStreak } from '@/hooks/use-streak';
import { useGoalSuggestions } from '@/hooks/use-goal-suggestions';
import { useAuth } from '@/providers/auth-provider';
import { formatDistance, formatPlankTime } from '@/lib/utils';
import { generateInsights } from '@/lib/insights';
import { getEarnedMilestones } from '@/lib/milestones';
import { TrendingUp, TrendingDown, Lightbulb, AlertTriangle, Award } from 'lucide-react';
import { Onboarding } from '@/components/ui/onboarding';
import type { WorkoutLog } from '@/types/database';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
  ReferenceDot,
} from 'recharts';
import { format, startOfWeek, endOfWeek } from 'date-fns';

function PersonalTrendTooltip({
  active,
  payload,
  heading,
  category,
  metric,
  mode,
  unitPref,
}: {
  active?: boolean;
  heading?: string;
  // Recharts Payload<ValueType, NameType> — value may be an array for some chart types
  payload?: ReadonlyArray<{
    name?: string | number;
    value?: unknown;
    dataKey?: string | number;
    color?: string;
  }>;
  category: PersonalTrendCategory;
  metric: 'volume' | 'peak';
  mode: 'raw' | 'percent';
  unitPref: 'metric' | 'imperial' | undefined;
}) {
  if (!active || !payload?.length) return null;
  const fmt = (v: unknown, seriesName?: string) => {
    if (v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v))) {
      const s = String(seriesName ?? '');
      if (mode === 'raw' && s.startsWith('This week')) return 'Rest day';
      return '—';
    }
    const n = typeof v === 'number' ? v : Number(v);
    if (mode === 'percent') return `${Number(n).toFixed(1)}%`;
    if (category === 'plank') return `${Number(n).toFixed(1)} min`;
    if (category === 'run') {
      const d = formatDistance(Number(n), unitPref);
      return `${d} ${unitPref === 'imperial' ? 'mi' : 'km'}`;
    }
    return `${Math.round(n)}`;
  };
  const catLabel =
    category === 'pushups' ? 'Push-ups' : category === 'plank' ? 'Plank' : 'Run';
  const subtitle = `${metric === 'volume' ? 'Volume' : 'Peak'} · ${mode === 'raw' ? 'Raw' : '% impr.'}`;
  return (
    <div
      style={{
        background: 'rgba(28, 28, 30, 0.95)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
        color: '#F5F5F7',
        fontSize: 12,
        padding: '10px 12px',
      }}
    >
      {heading ? (
        <p className="text-[11px] font-bold text-dark-text mb-1">{heading}</p>
      ) : null}
      <p className="text-[10px] font-semibold uppercase mb-1 opacity-80">
        {catLabel} · {subtitle}
      </p>
      {payload.map((p) => (
        <p key={String(p.dataKey)} className="font-semibold" style={{ color: p.color }}>
          {String(p.name ?? '')}: {fmt(p.value, String(p.name ?? ''))}
        </p>
      ))}
    </div>
  );
}

function PersonalTrendLineTick({
  x,
  y,
  payload,
  points,
}: {
  x: number;
  y: number;
  payload: { value: string };
  points: WeekLinePoint[];
}) {
  const pt = points.find((p) => p.sortKey === payload.value);
  if (!pt) return null;
  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="middle" fill="#8E8E93" fontSize={9} dy={10}>
        {pt.weekday}
      </text>
      <text textAnchor="middle" fill="#8E8E93" fontSize={8} dy={22}>
        {pt.datePart}
      </text>
    </g>
  );
}

function PersonalTrendBarTick({
  x,
  y,
  payload,
  bars,
}: {
  x: number;
  y: number;
  payload: { value: string };
  bars: WeekBarRow[];
}) {
  const row = bars.find((b) => b.sortKey === payload.value);
  if (!row) return null;
  return (
    <g transform={`translate(${x},${y}) rotate(-32)`}>
      <text textAnchor="end" fill="#8E8E93" fontSize={8} x={0} y={0} dy={4}>
        {row.tickTop}
      </text>
      <text textAnchor="end" fill="#8E8E93" fontSize={7} x={0} y={0} dy={14}>
        {row.tickBottom}
      </text>
    </g>
  );
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !localStorage.getItem('kinetic-onboarded');
  });
  const [trendDateRange, setTrendDateRange] = useState<DateRange>('week');
  const [trendCustomFrom, setTrendCustomFrom] = useState<Date | undefined>();
  const [trendCustomTo, setTrendCustomTo] = useState<Date | undefined>();
  const [trendCategory, setTrendCategory] = useState<PersonalTrendCategory>('pushups');
  const [trendMetric, setTrendMetric] = useState<'volume' | 'peak'>('volume');
  const [trendMode, setTrendMode] = useState<'raw' | 'percent'>('raw');

  const visibleRange = useMemo(
    () => getDateRange(trendDateRange, trendCustomFrom, trendCustomTo),
    [trendDateRange, trendCustomFrom, trendCustomTo]
  );
  const lineMode = isWeekLineMode(trendDateRange, trendCustomFrom, trendCustomTo);
  const monthBarBuckets = useMemo(
    () => shouldUseMonthBars(trendDateRange, trendCustomFrom, trendCustomTo),
    [trendDateRange, trendCustomFrom, trendCustomTo]
  );
  const chartLogRange = useMemo(
    () =>
      getChartLogFetchRange(visibleRange.from, visibleRange.to, lineMode, monthBarBuckets),
    [visibleRange.from, visibleRange.to, lineMode, monthBarBuckets]
  );

  const { data: trendLogs = [] } = useWorkoutLogs(trendDateRange, trendCustomFrom, trendCustomTo);
  const { data: chartLogs = [] } = useWorkoutLogs('custom', chartLogRange.from, chartLogRange.to);

  const { data: allTimeStats } = useAllTimeStats();
  const { data: recentWeeks = [] } = useRecentWeeks(4);
  const { data: weeklyVolume } = useWeeklyVolume();
  const { data: goals } = useGoals();
  const { data: streak = 0 } = useStreak();

  const weeklyGoalPct = useMemo(() => {
    const pushGoal = goals?.pushup_weekly_goal || 500;
    const plankGoal = goals?.plank_weekly_goal || 600;
    const runGoal = goals?.run_weekly_goal || 15;
    const pushProg = Math.min((weeklyVolume?.total_pushups || 0) / pushGoal, 1);
    const plankProg = Math.min((weeklyVolume?.total_plank_seconds || 0) / plankGoal, 1);
    const runProg = Math.min(Number(weeklyVolume?.total_run_distance || 0) / runGoal, 1);
    return Math.round(((pushProg + plankProg + runProg) / 3) * 100);
  }, [weeklyVolume, goals]);

  const weekLinePoints = useMemo(() => {
    if (!lineMode) return null;
    const wkStart = startOfWeek(visibleRange.from, { weekStartsOn: 1 });
    const wkEnd = endOfWeek(visibleRange.from, { weekStartsOn: 1 });
    return buildWeekLineChart(
      chartLogs,
      wkStart,
      wkEnd,
      trendCategory,
      trendMetric,
      trendMode
    );
  }, [lineMode, chartLogs, visibleRange.from, trendCategory, trendMetric, trendMode]);

  const barBundle = useMemo(() => {
    if (lineMode) return null;
    if (monthBarBuckets) {
      return buildMonthlyBars(
        chartLogs,
        visibleRange.from,
        visibleRange.to,
        trendCategory,
        trendMetric,
        trendMode
      );
    }
    return buildMultiWeekBars(
      chartLogs,
      visibleRange.from,
      visibleRange.to,
      trendCategory,
      trendMetric,
      trendMode
    );
  }, [
    lineMode,
    monthBarBuckets,
    chartLogs,
    visibleRange.from,
    visibleRange.to,
    trendCategory,
    trendMetric,
    trendMode,
  ]);

  const primarySeries = lineMode ? weekLinePoints ?? [] : barBundle?.bars ?? [];
  const showTrendOverlayLine =
    lineMode && !(trendMetric === 'peak' && trendMode === 'raw');
  const peakHighlightPoint = weekLinePoints?.find((p) => p.peakHighlight);

  // CSV Export for Dashboard (matches Personal Trends range)
  const handleExportCSV = () => {
    if (!trendLogs.length) return;
    const headers = ['Date', 'Push-ups', 'Plank (sec)', `Run (${profile?.unit_preference === 'imperial' ? 'MI' : 'KM'})`, 'Notes'];
    const rows = trendLogs.map(l => [
      format(new Date(l.logged_at), 'yyyy-MM-dd'),
      l.pushup_reps,
      l.plank_seconds,
      formatDistance(Number(l.run_distance), profile?.unit_preference),
      (l.notes || '').replace(/,/g, ';')
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `kinetic_export_${trendDateRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const weekComparison = useMemo(() => {
    if (!lineMode || !weekLinePoints) return { thisWeek: 0, lastWeek: 0 };
    const thisWeekNums = weekLinePoints
      .map((p) => p.total)
      .filter((t): t is number => typeof t === 'number' && !Number.isNaN(t));
    const lastWeekNums = weekLinePoints
      .map((p) => p.overlay)
      .filter((t): t is number => typeof t === 'number' && !Number.isNaN(t));
    const thisWeek = thisWeekNums.reduce((a, b) => a + b, 0);
    const lastWeek = lastWeekNums.reduce((a, b) => a + b, 0);
    return { thisWeek, lastWeek };
  }, [lineMode, weekLinePoints]);

  return (
    <AppShell>
      {showOnboarding && <Onboarding onComplete={() => setShowOnboarding(false)} />}
      <div className="max-w-md mx-auto px-6 space-y-6 pt-2 pb-32">
        {/* System Status */}
        <motion.div
          data-testid="uat-dashboard-pulse"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <p className="text-[10px] font-semibold tracking-[0.2em] text-emerald-500 uppercase">
            SYSTEM STATUS
          </p>
          <h2 className="text-3xl font-black tracking-tight mt-1">
            PULSE MODE
          </h2>
        </motion.div>

        {/* Section Header — All-Time Stats */}
        <div data-testid="uat-dashboard-arena-section">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-dark-muted uppercase mb-1">
            ALL-TIME ROLL-UP
          </p>
          <h3 className="text-2xl font-black italic leading-tight">
            YOUR<br />TOTALS
          </h3>
        </div>

        {/* Metric Cards — All-Time Total + Peak */}
        {!allTimeStats ? (
          <div className="space-y-3">
            <DashboardCardSkeleton />
            <DashboardCardSkeleton />
            <DashboardCardSkeleton />
          </div>
        ) : (
        <div className="space-y-3">
          {/* Push-ups Card */}
          <GlassCard className="relative overflow-hidden" delay={0.1}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">💪</span>
              <span className="text-[11px] font-semibold tracking-wider text-dark-muted uppercase">
                PUSH-UPS
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[9px] font-semibold tracking-wider text-dark-muted uppercase">TOTAL</p>
                <span className="text-4xl font-black text-dark-text">
                  {allTimeStats ? Math.round(allTimeStats.totalPushups).toLocaleString() : '0'}
                </span>
                <span className="text-sm text-dark-muted ml-1">reps</span>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-semibold tracking-wider text-dark-muted uppercase">PEAK</p>
                <span className="text-2xl font-black text-emerald-500">
                  {allTimeStats ? Math.round(allTimeStats.peakPushups) : 0}
                </span>
                <span className="text-xs text-dark-muted ml-1">reps</span>
              </div>
            </div>
            {recentWeeks.length > 0 && (
              <div className="h-10 mt-3 -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={recentWeeks}>
                    <defs>
                      <linearGradient id="pushupGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="pushups" stroke="#10B981" strokeWidth={2} fill="url(#pushupGrad)" dot={{ r: 3, fill: '#10B981' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </GlassCard>

          {/* Plank Card */}
          <GlassCard className="relative overflow-hidden" delay={0.2}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🧘</span>
              <span className="text-[11px] font-semibold tracking-wider text-dark-muted uppercase">
                PLANK
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[9px] font-semibold tracking-wider text-dark-muted uppercase">TOTAL</p>
                <span className="text-4xl font-black text-dark-text">
                  {allTimeStats ? (allTimeStats.totalPlankSeconds / 60).toFixed(1) : '0.0'}
                </span>
                <span className="text-sm text-dark-muted ml-1">min</span>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-semibold tracking-wider text-dark-muted uppercase">PEAK</p>
                <span className="text-2xl font-black text-emerald-500">
                  {allTimeStats ? formatPlankTime(allTimeStats.peakPlankSeconds) : '0:00'}
                </span>
              </div>
            </div>
            {recentWeeks.length > 0 && (
              <div className="h-10 mt-3 -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={recentWeeks}>
                    <defs>
                      <linearGradient id="plankGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="plankMin" stroke="#10B981" strokeWidth={2} fill="url(#plankGrad)" dot={{ r: 3, fill: '#10B981' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </GlassCard>

          {/* Running Card */}
          <GlassCard className="relative overflow-hidden" delay={0.3}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🏃</span>
              <span className="text-[11px] font-semibold tracking-wider text-dark-muted uppercase">
                RUNNING ({profile?.unit_preference === 'imperial' ? 'MI' : 'KM'})
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[9px] font-semibold tracking-wider text-dark-muted uppercase">TOTAL</p>
                <span className="text-4xl font-black text-dark-text">
                  {allTimeStats ? formatDistance(allTimeStats.totalRunDistance, profile?.unit_preference).toFixed(1) : '0.0'}
                </span>
                <span className="text-sm text-dark-muted ml-1">{profile?.unit_preference === 'imperial' ? 'mi' : 'km'}</span>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-semibold tracking-wider text-dark-muted uppercase">PEAK</p>
                <span className="text-2xl font-black text-emerald-500">
                  {allTimeStats ? formatDistance(allTimeStats.peakRunDistance, profile?.unit_preference).toFixed(1) : '0.0'}
                </span>
                <span className="text-xs text-dark-muted ml-1">{profile?.unit_preference === 'imperial' ? 'mi' : 'km'}</span>
              </div>
            </div>
            {recentWeeks.length > 0 && (
              <div className="h-10 mt-3 -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={recentWeeks}>
                    <defs>
                      <linearGradient id="runGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="runKm" stroke="#10B981" strokeWidth={2} fill="url(#runGrad)" dot={{ r: 3, fill: '#10B981' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </GlassCard>
        </div>
        )}

        {/* Personal Trends Section */}
        <div className="pt-4" data-testid="uat-dashboard-trends">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-dark-muted uppercase mb-1">
            DATA CLUSTER
          </p>
          <div className="flex items-end justify-between mb-4">
            <h3 className="text-2xl font-black italic">
              PERSONAL TRENDS
            </h3>
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-xl bg-dark-elevated border border-dark-border text-[10px] font-bold tracking-wider text-dark-muted hover:text-emerald-500 hover:border-emerald-500/30 transition-all uppercase"
            >
              CSV EXPORT
            </button>
          </div>

          {/* Date Range + Metric Toggles */}
          <div className="space-y-2 mb-4">
            <DateRangeTabs
              motionScope="dash-trends-tabs"
              selected={trendDateRange}
              onChange={setTrendDateRange}
              onCustomDates={(from, to) => {
                setTrendCustomFrom(from);
                setTrendCustomTo(to);
              }}
            />
            <p className="text-[9px] font-semibold tracking-[0.15em] text-dark-muted uppercase">
              Exercise
            </p>
            <TogglePills
              motionScope="dash-trends-cat"
              options={[
                { value: 'pushups' as const, label: 'PUSH-UPS' },
                { value: 'plank' as const, label: 'PLANK' },
                { value: 'run' as const, label: 'RUN' },
              ]}
              selected={trendCategory}
              onChange={setTrendCategory}
              size="sm"
            />
            <div className="flex flex-wrap gap-2">
              <TogglePills
                motionScope="dash-trends-metric"
                options={[
                  { value: 'volume' as const, label: 'VOLUME' },
                  { value: 'peak' as const, label: 'PEAK' },
                ]}
                selected={trendMetric}
                onChange={setTrendMetric}
                size="sm"
              />
              <TogglePills
                motionScope="dash-trends-mode"
                options={[
                  { value: 'raw' as const, label: 'RAW' },
                  { value: 'percent' as const, label: '% IMP.' },
                ]}
                selected={trendMode}
                onChange={setTrendMode}
                size="sm"
              />
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.4 }}
          >
            <GlassCard className="p-5" animate={false}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-lg font-black">PROGRESS</p>
                  <p className="text-lg font-black">TRACKER</p>
                  <p className="text-[10px] font-semibold tracking-wider text-dark-muted mt-1">
                    {lineMode ? 'THIS WEEK vs LAST WEEK' : trendDateRange === 'month' ? 'WEEKLY TOTALS' : 'MONTHLY TOTALS'}
                  </p>
                </div>
                {lineMode ? (
                  <div className="text-right">
                    <p className="text-[9px] font-semibold tracking-wider text-dark-muted">THIS WEEK</p>
                    <p className="text-xl font-black text-emerald-500">
                      {trendMode === 'percent' ? `${weekComparison.thisWeek.toFixed(1)}%` : Math.round(weekComparison.thisWeek).toLocaleString()}
                    </p>
                    <p className="text-[9px] font-semibold tracking-wider text-dark-muted mt-1">LAST WEEK</p>
                    <p className="text-base font-bold text-gray-400">
                      {trendMode === 'percent' ? `${weekComparison.lastWeek.toFixed(1)}%` : Math.round(weekComparison.lastWeek).toLocaleString()}
                    </p>
                  </div>
                ) : (
                  <div className="text-right">
                    {barBundle?.avgLine != null && (
                      <>
                        <p className="text-[9px] font-semibold tracking-wider text-dark-muted">ROLLING AVG</p>
                        <p className="text-xl font-black text-emerald-500">
                          {trendMode === 'percent' ? `${barBundle.avgLine.toFixed(1)}%` : Math.round(barBundle.avgLine).toLocaleString()}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="h-40" data-testid="uat-dashboard-trends-chart">
                <ResponsiveContainer width="100%" height="100%">
                  {lineMode ? (
                    <LineChart
                      margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
                      data={
                        weekLinePoints && weekLinePoints.length > 0
                          ? weekLinePoints
                          : [
                              {
                                sortKey: '_',
                                weekday: '—',
                                datePart: '',
                                tooltipLabel: 'No data',
                                total: 0,
                              },
                            ]
                      }
                    >
                      <XAxis
                        dataKey="sortKey"
                        type="category"
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                        height={36}
                        tick={(tickProps) => {
                          const p = tickProps as {
                            x: number;
                            y: number;
                            payload: { value: string };
                          };
                          const pts: WeekLinePoint[] =
                            weekLinePoints && weekLinePoints.length > 0
                              ? weekLinePoints
                              : [
                                  {
                                    sortKey: '_',
                                    weekday: '—',
                                    datePart: '',
                                    tooltipLabel: 'No data',
                                    total: 0,
                                  },
                                ];
                          return (
                            <PersonalTrendLineTick
                              x={p.x}
                              y={p.y}
                              payload={p.payload}
                              points={pts}
                            />
                          );
                        }}
                      />
                      <YAxis hide />
                      <Tooltip
                        content={({ active, payload }) => {
                          const row = payload?.[0]?.payload as WeekLinePoint | undefined;
                          return (
                            <PersonalTrendTooltip
                              active={active}
                              payload={payload}
                              heading={row?.tooltipLabel}
                              category={trendCategory}
                              metric={trendMetric}
                              mode={trendMode}
                              unitPref={profile?.unit_preference}
                            />
                          );
                        }}
                      />
                      <Line
                        type="monotone"
                        name={
                          trendMode === 'percent'
                            ? 'This week (%)'
                            : 'This week'
                        }
                        dataKey="total"
                        stroke="#10B981"
                        strokeWidth={3}
                        dot={false}
                        connectNulls={false}
                        activeDot={{ r: 4, fill: '#10B981' }}
                      />
                      {showTrendOverlayLine ? (
                        <Line
                          type="monotone"
                          name={
                            trendMode === 'percent'
                              ? 'Prior week (%)'
                              : 'Prior week (same weekday)'
                          }
                          dataKey="overlay"
                          stroke="#6B7280"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          dot={false}
                          connectNulls={false}
                          activeDot={{ r: 3, fill: '#6B7280' }}
                        />
                      ) : null}
                      {peakHighlightPoint &&
                      typeof peakHighlightPoint.total === 'number' ? (
                        <ReferenceDot
                          x={peakHighlightPoint.sortKey}
                          y={peakHighlightPoint.total}
                          r={5}
                          fill="#10B981"
                          stroke="#F5F5F7"
                          strokeWidth={2}
                        />
                      ) : null}
                    </LineChart>
                  ) : (
                    <BarChart
                      data={
                        barBundle && barBundle.bars.length > 0
                          ? barBundle.bars
                          : [
                              {
                                label: 'No data',
                                sortKey: 'x',
                                total: 0,
                                isPartial: false,
                                tickTop: '—',
                                tickBottom: '',
                              },
                            ]
                      }
                      margin={{ bottom: 36, left: 4, right: 4, top: 4 }}
                    >
                      <XAxis
                        dataKey="sortKey"
                        type="category"
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                        height={44}
                        tick={(tickProps) => {
                          const p = tickProps as {
                            x: number;
                            y: number;
                            payload: { value: string };
                          };
                          const rows: WeekBarRow[] =
                            barBundle && barBundle.bars.length > 0
                              ? barBundle.bars
                              : [
                                  {
                                    label: 'No data',
                                    sortKey: 'x',
                                    total: 0,
                                    isPartial: false,
                                    tickTop: '—',
                                    tickBottom: '',
                                  },
                                ];
                          return (
                            <PersonalTrendBarTick
                              x={p.x}
                              y={p.y}
                              payload={p.payload}
                              bars={rows}
                            />
                          );
                        }}
                      />
                      <YAxis hide />
                      <Tooltip
                        content={({ active, payload }) => {
                          const row = payload?.[0]?.payload as WeekBarRow | undefined;
                          return (
                            <PersonalTrendTooltip
                              active={active}
                              payload={payload}
                              heading={row?.label}
                              category={trendCategory}
                              metric={trendMetric}
                              mode={trendMode}
                              unitPref={profile?.unit_preference}
                            />
                          );
                        }}
                      />
                      {barBundle?.avgLine != null ? (
                        <ReferenceLine
                          y={barBundle.avgLine}
                          stroke="#9CA3AF"
                          strokeDasharray="5 5"
                          label={{
                            value: 'AVG.',
                            position: 'insideTopRight',
                            fill: '#9CA3AF',
                            fontSize: 9,
                          }}
                        />
                      ) : null}
                      <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                        {(barBundle && barBundle.bars.length > 0
                          ? barBundle.bars
                          : [{ label: 'No data', sortKey: 'x', total: 0, isPartial: false }]
                        ).map((entry, i) => (
                          <Cell
                            key={entry.sortKey || `b-${i}`}
                            fill={
                              entry.isPartial
                                ? 'rgba(16, 185, 129, 0.38)'
                                : '#10B981'
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
              <p className="text-[9px] text-dark-muted mt-3 leading-relaxed">
                {lineMode
                  ? "Green = this week's daily totals. Dashed gray = last week (same weekday). Gaps = rest days."
                  : monthBarBuckets
                    ? 'Each bar = one calendar month. Dashed line = rolling 4-month average.'
                    : 'Each bar = one week (Mon–Sun). Dashed line = rolling 4-week average.'}
              </p>
            </GlassCard>
          </motion.div>
        </div>

        {/* Weekly Goal % + Streak Rings */}
        <div className="flex justify-center gap-8 py-6" data-testid="uat-dashboard-stamina">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', delay: 0.5 }}
          >
            <ScoreRing
              value={weeklyGoalPct}
              label="WEEKLY GOAL"
              sublabel={weeklyGoalPct >= 100 ? 'CRUSHED IT' : weeklyGoalPct >= 75 ? 'ALMOST THERE' : weeklyGoalPct >= 50 ? 'ON TRACK' : 'KEEP GOING'}
              color="#10B981"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', delay: 0.6 }}
          >
            <ScoreRing
              value={streak}
              max={52}
              label="STREAK"
              sublabel={streak >= 12 ? 'ON FIRE' : streak >= 4 ? 'CONSISTENT' : streak >= 1 ? 'BUILDING' : 'START NOW'}
              color="#10B981"
            />
          </motion.div>
        </div>
        <div className="space-y-2 px-2 -mt-2 pb-2">
          <p className="text-[9px] text-dark-muted text-center leading-relaxed">
            <span className="font-semibold text-emerald-500/70">WEEKLY GOAL</span> — Average progress across your push-up, plank, and run targets. Set goals in Profile.
          </p>
          <p className="text-[9px] text-dark-muted text-center leading-relaxed">
            <span className="font-semibold text-emerald-500/70">STREAK</span> — Consecutive weeks with 4+ logged workouts. Miss a week and it resets.
          </p>
        </div>

        {/* Insights */}
        <ErrorBoundary fallbackTitle="Insights unavailable">
          <InsightsSection logs={trendLogs} goals={goals ?? null} streak={streak} />
        </ErrorBoundary>

        {/* Goal Suggestions */}
        <ErrorBoundary fallbackTitle="Goal suggestions unavailable">
          <GoalSuggestionsSection />
        </ErrorBoundary>

        {/* Milestones */}
        <ErrorBoundary fallbackTitle="Milestones unavailable">
          <MilestonesSection allTimeStats={allTimeStats ?? null} />
        </ErrorBoundary>
      </div>
    </AppShell>
  );
}

function InsightsSection({ logs, goals, streak }: { logs: WorkoutLog[]; goals: import('@/types/database').PerformanceGoals | null; streak: number }) {
  const insights = useMemo(() => generateInsights(logs, goals, streak), [logs, goals, streak]);
  if (insights.length === 0) return null;

  const iconMap = { positive: TrendingUp, suggestion: Lightbulb, warning: AlertTriangle };
  const colorMap = { positive: 'text-emerald-500', suggestion: 'text-amber-400', warning: 'text-red-400' };

  return (
    <div className="pt-2">
      <p className="text-[10px] font-semibold tracking-[0.2em] text-dark-muted uppercase mb-2">INSIGHTS</p>
      <div className="space-y-2">
        {insights.map((insight, i) => {
          const Icon = iconMap[insight.type];
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/[0.06]"
            >
              <Icon size={14} className={`${colorMap[insight.type]} mt-0.5 shrink-0`} />
              <p className="text-[11px] text-dark-text leading-relaxed">{insight.text}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function GoalSuggestionsSection() {
  const suggestions = useGoalSuggestions();
  if (suggestions.length === 0) return null;

  return (
    <div className="pt-2">
      <p className="text-[10px] font-semibold tracking-[0.2em] text-dark-muted uppercase mb-2">GOAL ADJUSTMENT</p>
      <div className="space-y-2">
        {suggestions.map((s, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
            {s.direction === 'up' ? (
              <TrendingUp size={14} className="text-emerald-500 mt-0.5 shrink-0" />
            ) : (
              <TrendingDown size={14} className="text-amber-400 mt-0.5 shrink-0" />
            )}
            <div>
              <p className="text-[11px] text-dark-text leading-relaxed">{s.reason}</p>
              <p className="text-[10px] text-dark-muted mt-1">
                {s.current} → <span className="text-emerald-500 font-bold">{s.suggested}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MilestonesSection({ allTimeStats }: { allTimeStats: import('@/hooks/use-alltime-stats').AllTimeStats | null }) {
  const milestones = useMemo(() => {
    if (!allTimeStats) return [];
    return getEarnedMilestones(allTimeStats.totalPushups, allTimeStats.totalPlankSeconds, allTimeStats.totalRunDistance);
  }, [allTimeStats]);

  if (milestones.length === 0) return null;

  return (
    <div className="pt-2 pb-4">
      <p className="text-[10px] font-semibold tracking-[0.2em] text-dark-muted uppercase mb-2">MILESTONES EARNED</p>
      <div className="flex flex-wrap gap-2">
        {milestones.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20"
          >
            <Award size={12} className="text-emerald-500" />
            <span className="text-[10px] font-bold text-emerald-400 tracking-wider">{m.emoji} {m.label}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
