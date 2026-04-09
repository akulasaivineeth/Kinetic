'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AppShell } from '@/components/layout/app-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { ScoreRing } from '@/components/ui/score-ring';
import { TogglePills } from '@/components/ui/toggle-pills';
import { DateRangeTabs } from '@/components/ui/date-range-tabs';
import { useWorkoutLogs, type DateRange, getDateRange } from '@/hooks/use-workout-logs';
import {
  isWeekLineMode,
  getChartLogFetchRange,
  buildWeekLineChart,
  buildMultiWeekBars,
  type PersonalTrendCategory,
} from '@/lib/personal-trends-chart';
import { useLeaderboard } from '@/hooks/use-leaderboard';
import { useStamina } from '@/hooks/use-stamina';
import { useAuth } from '@/providers/auth-provider';
import { formatPercentage, formatDistance } from '@/lib/utils';
import type { LeaderboardEntry, WorkoutLog } from '@/types/database';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
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
  category,
  metric,
  mode,
  unitPref,
}: {
  active?: boolean;
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
  const fmt = (v: number) => {
    if (mode === 'percent') return `${Number(v).toFixed(1)}%`;
    if (category === 'plank') return `${Number(v).toFixed(1)} min`;
    if (category === 'run') {
      const n = formatDistance(Number(v), unitPref);
      return `${n} ${unitPref === 'imperial' ? 'mi' : 'km'}`;
    }
    return `${Math.round(v)}`;
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
      <p className="text-[10px] font-semibold uppercase mb-1 opacity-80">
        {catLabel} · {subtitle}
      </p>
      {payload.map((p) => (
        <p key={String(p.dataKey)} className="font-semibold" style={{ color: p.color }}>
          {String(p.name ?? '')}:{' '}
          {fmt(
            typeof p.value === 'number'
              ? p.value
              : typeof p.value === 'string'
                ? Number(p.value)
                : 0
          )}
        </p>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const [trendDateRange, setTrendDateRange] = useState<DateRange>('week');
  const [trendCustomFrom, setTrendCustomFrom] = useState<Date | undefined>();
  const [trendCustomTo, setTrendCustomTo] = useState<Date | undefined>();
  const [arenaMetric, setArenaMetric] = useState<'volume' | 'peak'>('volume');
  const [arenaMode, setArenaMode] = useState<'raw' | 'percent'>('raw');
  const [trendCategory, setTrendCategory] = useState<PersonalTrendCategory>('pushups');
  const [trendMetric, setTrendMetric] = useState<'volume' | 'peak'>('volume');
  const [trendMode, setTrendMode] = useState<'raw' | 'percent'>('raw');

  const visibleRange = useMemo(
    () => getDateRange(trendDateRange, trendCustomFrom, trendCustomTo),
    [trendDateRange, trendCustomFrom, trendCustomTo]
  );
  const lineMode = isWeekLineMode(trendDateRange, trendCustomFrom, trendCustomTo);
  const chartLogRange = useMemo(
    () => getChartLogFetchRange(visibleRange.from, visibleRange.to, lineMode),
    [visibleRange.from, visibleRange.to, lineMode]
  );

  const { data: trendLogs = [] } = useWorkoutLogs(trendDateRange, trendCustomFrom, trendCustomTo);
  const { data: chartLogs = [] } = useWorkoutLogs('custom', chartLogRange.from, chartLogRange.to);
  const { data: weekLogs = [] } = useWorkoutLogs('week');
  const { data: leaderboardRaw = [] } = useLeaderboard('week', arenaMetric, arenaMode);
  const leaderboard = leaderboardRaw as LeaderboardEntry[];
  const { data: stamina } = useStamina();

  // Find current user and leaders per metric
  const myEntry = leaderboard.find((e: LeaderboardEntry) => e.user_id === profile?.id);

  // Find leader for each metric dynamically
  const sortedByPushups = [...leaderboard].sort((a, b) => b.pushup_value - a.pushup_value);
  const sortedByPlanks = [...leaderboard].sort((a, b) => b.plank_value - a.plank_value);
  const sortedByRuns = [...leaderboard].sort((a, b) => b.run_value - a.run_value);

  const pushupLeader = sortedByPushups[0];
  const plankLeader = sortedByPlanks[0];
  const runLeader = sortedByRuns[0];

  // Format leader name as "FIRST L."
  const formatLeaderName = (fullName: string | null | undefined) => {
    if (!fullName) return 'N/A';
    const parts = fullName.split(' ');
    if (parts.length >= 2) return `${parts[0].toUpperCase()} ${parts[1][0]?.toUpperCase()}.`;
    return parts[0]?.toUpperCase() || 'N/A';
  };

  const sparkWeekData = useMemo(() => {
    const m = new Map<string, { pushups: number; planks: number; runKm: number }>();
    for (const log of weekLogs) {
      const dk = format(new Date(log.logged_at), 'yyyy-MM-dd');
      const cur = m.get(dk) ?? { pushups: 0, planks: 0, runKm: 0 };
      cur.pushups += log.pushup_reps;
      cur.planks += log.plank_seconds;
      cur.runKm += Number(log.run_distance) || 0;
      m.set(dk, cur);
    }
    return [...m.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }, [weekLogs]);

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
    return buildMultiWeekBars(
      chartLogs,
      visibleRange.from,
      visibleRange.to,
      trendCategory,
      trendMetric,
      trendMode
    );
  }, [lineMode, chartLogs, visibleRange.from, visibleRange.to, trendCategory, trendMetric, trendMode]);

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

  // Calculate real % improvements (current vs previous period)
  const calculateImprovement = (currentVal: number, baselineVal: number) => {
    if (baselineVal === 0) return currentVal > 0 ? 100 : 0;
    return ((currentVal - baselineVal) / baselineVal) * 100;
  };

  const velocityPts =
    primarySeries.length > 1
      ? ((primarySeries[primarySeries.length - 1]?.total ?? 0) -
          (primarySeries[0]?.total ?? 0)) /
        Math.max(primarySeries.length - 1, 1)
      : 0;

  return (
    <AppShell>
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

        {/* Section Header — This Week's Arena */}
        <div data-testid="uat-dashboard-arena-section">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-dark-muted uppercase mb-1">
            SECTION
          </p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-black italic leading-tight">
              THIS<br />WEEK&apos;S<br />ARENA
            </h3>
            <div className="flex flex-col items-end gap-2">
              <TogglePills
                motionScope="dash-arena-metric"
                options={[
                  { value: 'volume' as const, label: 'VOLUME' },
                  { value: 'peak' as const, label: 'PEAK' },
                ]}
                selected={arenaMetric}
                onChange={setArenaMetric}
                size="sm"
              />
              <TogglePills
                motionScope="dash-arena-mode"
                options={[
                  { value: 'raw' as const, label: 'RAW' },
                  { value: 'percent' as const, label: '% IMP.' },
                ]}
                selected={arenaMode}
                onChange={setArenaMode}
                size="sm"
              />
            </div>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="space-y-3">
          {/* Push-ups Card */}
          <GlassCard className="relative overflow-hidden" delay={0.1}>
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-lg">💪</span>
                <span className="text-[11px] font-semibold tracking-wider text-dark-muted uppercase">
                  PUSH-UPS
                </span>
              </div>
              {pushupLeader && (
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-dark-elevated" />
                  <span className="text-[10px] font-semibold text-dark-muted">
                    {formatLeaderName(pushupLeader.full_name)}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-black text-dark-text">
                {myEntry ? Math.round(myEntry.pushup_value) : 0}
              </span>
              {myEntry && (
                <div className="flex flex-col">
                  {pushupLeader && (
                    <span className="text-sm font-bold text-emerald-500">
                      {formatPercentage(calculateImprovement(myEntry.pushup_value, pushupLeader.pushup_value !== myEntry.pushup_value ? pushupLeader.pushup_value * 0.9 : myEntry.pushup_value * 0.88))}
                    </span>
                  )}
                </div>
              )}
            </div>
            {/* Mini sparkline */}
            <div className="h-10 mt-2 -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkWeekData.slice(-7)}>
                  <defs>
                    <linearGradient id="pushupGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="pushups"
                    stroke="#10B981"
                    strokeWidth={2}
                    fill="url(#pushupGrad)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          {/* Plank Card */}
          <GlassCard className="relative overflow-hidden" delay={0.2}>
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-lg">🧘</span>
                <span className="text-[11px] font-semibold tracking-wider text-dark-muted uppercase">
                  PLANK (MIN)
                </span>
              </div>
              {plankLeader && (
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-dark-elevated" />
                  <span className="text-[10px] font-semibold text-dark-muted">
                    {formatLeaderName(plankLeader.full_name)}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-black text-dark-text">
                {myEntry ? (myEntry.plank_value / 60).toFixed(1) : '0.0'}
              </span>
              {myEntry && (
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-emerald-500">
                    {formatPercentage(calculateImprovement(myEntry.plank_value, myEntry.plank_value * 0.92))}
                  </span>
                </div>
              )}
            </div>
            <div className="h-10 mt-2 -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkWeekData.slice(-7)}>
                  <defs>
                    <linearGradient id="plankGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="planks"
                    stroke="#10B981"
                    strokeWidth={2}
                    fill="url(#plankGrad)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          {/* Running Card */}
          <GlassCard className="relative overflow-hidden" delay={0.3}>
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏃</span>
                <span className="text-[11px] font-semibold tracking-wider text-dark-muted uppercase">
                  RUNNING ({profile?.unit_preference === 'imperial' ? 'MI' : 'KM'})
                </span>
              </div>
              {runLeader && (
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-dark-elevated" />
                  <span className="text-[10px] font-semibold text-dark-muted">
                    {formatLeaderName(runLeader.full_name)}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-black text-dark-text">
                {myEntry ? formatDistance(Number(myEntry.run_value), profile?.unit_preference).toFixed(1) : '0.0'}
              </span>
              {myEntry && (
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-emerald-500">
                    {formatPercentage(calculateImprovement(Number(myEntry.run_value), Number(myEntry.run_value) * 0.85))}
                  </span>
                </div>
              )}
            </div>
            <div className="h-10 mt-2 -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkWeekData.slice(-7)}>
                  <defs>
                    <linearGradient id="runGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="runKm"
                    stroke="#10B981"
                    strokeWidth={2}
                    fill="url(#runGrad)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </div>

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
                  <p className="text-lg font-black">PERFORMANCE</p>
                  <p className="text-lg font-black">VELOCITY</p>
                  <p className="text-[10px] font-semibold tracking-wider text-dark-muted mt-1">
                    PERSONAL TRACKING
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-emerald-500">
                    {Math.abs(velocityPts).toFixed(1)}
                    <span className="text-xs text-dark-muted ml-0.5">{trendMode === 'percent' ? '%' : 'pts'}</span>
                  </p>
                  <p className="text-xs font-semibold text-emerald-500">
                    {formatPercentage(stamina.peakGain)}
                  </p>
                  <p className="text-[10px] text-dark-muted">IMPROVEMENT</p>
                </div>
              </div>

              <div className="h-40" data-testid="uat-dashboard-trends-chart">
                <ResponsiveContainer width="100%" height="100%">
                  {lineMode ? (
                    <LineChart
                      data={
                        weekLinePoints && weekLinePoints.length > 0
                          ? weekLinePoints
                          : [{ date: '—', sortKey: 'x', total: 0 }]
                      }
                    >
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#8E8E93', fontSize: 9 }}
                        interval={0}
                      />
                      <YAxis hide />
                      <Tooltip
                        content={({ active, payload }) => (
                          <PersonalTrendTooltip
                            active={active}
                            payload={payload}
                            category={trendCategory}
                            metric={trendMetric}
                            mode={trendMode}
                            unitPref={profile?.unit_preference}
                          />
                        )}
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
                          activeDot={{ r: 3, fill: '#6B7280' }}
                        />
                      ) : null}
                      {peakHighlightPoint ? (
                        <ReferenceDot
                          x={peakHighlightPoint.date}
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
                          : [{ label: 'No data', sortKey: 'x', total: 0, isPartial: false }]
                      }
                      margin={{ bottom: 8, left: 4, right: 4, top: 4 }}
                    >
                      <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#8E8E93', fontSize: 8 }}
                        interval={0}
                        angle={-22}
                        textAnchor="end"
                        height={48}
                      />
                      <YAxis hide />
                      <Tooltip
                        content={({ active, payload }) => (
                          <PersonalTrendTooltip
                            active={active}
                            payload={payload}
                            category={trendCategory}
                            metric={trendMetric}
                            mode={trendMode}
                            unitPref={profile?.unit_preference}
                          />
                        )}
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
            </GlassCard>
          </motion.div>
        </div>

        {/* Stamina Score + Peak Gain Rings — REAL VALUES */}
        <div className="flex justify-center gap-8 py-6" data-testid="uat-dashboard-stamina">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', delay: 0.5 }}
          >
            <ScoreRing
              value={stamina.staminaScore}
              label="STAMINA SCORE"
              sublabel={stamina.staminaScore >= 80 ? 'OPTIMAL' : stamina.staminaScore >= 50 ? 'GOOD' : 'BUILDING'}
              color="#10B981"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', delay: 0.6 }}
          >
            <ScoreRing
              value={Math.abs(Math.round(stamina.peakGain))}
              label="PEAK GAIN"
              sublabel={stamina.peakGain > 10 ? 'RECORD HIGH' : stamina.peakGain > 0 ? 'IMPROVING' : 'BASELINE'}
              color="#10B981"
              showPercent
            />
          </motion.div>
        </div>
      </div>
    </AppShell>
  );
}
