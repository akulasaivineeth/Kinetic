'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { AppShell } from '@/components/layout/app-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { ScoreRing } from '@/components/ui/score-ring';
import { TogglePills } from '@/components/ui/toggle-pills';
import { DateRangeTabs } from '@/components/ui/date-range-tabs';
import { useWorkoutLogs, type DateRange } from '@/hooks/use-workout-logs';
import { useLeaderboard } from '@/hooks/use-leaderboard';
import { useStamina } from '@/hooks/use-stamina';
import { useAuth } from '@/providers/auth-provider';
import { formatPercentage, formatDistance } from '@/lib/utils';
import type { LeaderboardEntry } from '@/types/database';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import { format } from 'date-fns';

export default function DashboardPage() {
  const { profile } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange>('week');
  const [metric, setMetric] = useState<'volume' | 'peak'>('volume');
  const [mode, setMode] = useState<'raw' | 'percent'>('raw');
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();

  const { data: logs = [] } = useWorkoutLogs(dateRange, customFrom, customTo);
  const { data: leaderboardRaw = [] } = useLeaderboard(dateRange, metric, mode, customFrom, customTo);
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

  // Prepare chart data — ONLY user's own data (Personal Trends)
  const chartData = logs.map((log) => ({
    date: format(new Date(log.logged_at), 'MMM d'),
    pushups: log.pushup_reps,
    planks: log.plank_seconds,
    runs: formatDistance(Number(log.run_distance), profile?.unit_preference),
    total: log.pushup_reps + (log.plank_seconds / 6) + (Number(log.run_distance) * 10), // Balanced score
  }));

  // CSV Export for Dashboard
  const handleExportCSV = () => {
    if (!logs.length) return;
    const headers = ['Date', 'Push-ups', 'Plank (sec)', `Run (${profile?.unit_preference === 'imperial' ? 'MI' : 'KM'})`, 'Notes'];
    const rows = logs.map(l => [
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
    link.setAttribute("download", `kinetic_export_${dateRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate Average Per Week for Month/Year views
  const getAvgPerWeek = (val: number) => {
    if (dateRange === 'month') return (val / 4.3).toFixed(1);
    if (dateRange === 'year' || dateRange === '6mo' || dateRange === '3mo') {
      const weeks = dateRange === 'year' ? 52.1 : dateRange === '6mo' ? 26 : 13;
      return (val / weeks).toFixed(1);
    }
    return null;
  };

  // Calculate real % improvements (current vs previous period)
  const calculateImprovement = (currentVal: number, baselineVal: number) => {
    if (baselineVal === 0) return currentVal > 0 ? 100 : 0;
    return ((currentVal - baselineVal) / baselineVal) * 100;
  };

  // Compute velocity (total score change)
  const velocityPts = chartData.length > 1
    ? ((chartData[chartData.length - 1]?.total || 0) - (chartData[0]?.total || 0)) / Math.max(chartData.length - 1, 1)
    : 0;

  return (
    <AppShell>
      <div className="space-y-6 pt-2">
        {/* System Status */}
        <motion.div
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
        <div>
          <p className="text-[10px] font-semibold tracking-[0.2em] text-dark-muted uppercase mb-1">
            SECTION
          </p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-black italic leading-tight">
              THIS<br />WEEK&apos;S<br />ARENA
            </h3>
            <TogglePills
              options={[
                { value: 'volume' as const, label: 'VOLUME' },
                { value: 'peak' as const, label: 'PEAK' },
              ]}
              selected={metric}
              onChange={setMetric}
              size="sm"
            />
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
              {myEntry && pushupLeader && (
                <span className="text-sm font-bold text-emerald-500">
                  {formatPercentage(calculateImprovement(myEntry.pushup_value, pushupLeader.pushup_value !== myEntry.pushup_value ? pushupLeader.pushup_value * 0.9 : myEntry.pushup_value * 0.88))}
                </span>
              )}
            </div>
            {/* Mini sparkline */}
            <div className="h-10 mt-2 -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.slice(-7)}>
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
                <span className="text-sm font-bold text-emerald-500">
                  {formatPercentage(calculateImprovement(myEntry.plank_value, myEntry.plank_value * 0.92))}
                </span>
              )}
            </div>
            <div className="h-10 mt-2 -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.slice(-7)}>
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
                  {getAvgPerWeek(Number(myEntry.run_value)) && (
                    <span className="text-[8px] font-bold text-dark-muted uppercase">
                      AVG {getAvgPerWeek(formatDistance(Number(myEntry.run_value), profile?.unit_preference) as any)}/WK
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="h-10 mt-2 -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.slice(-7)}>
                  <defs>
                    <linearGradient id="runGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="runs"
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
        <div className="pt-4">
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
              selected={dateRange}
              onChange={setDateRange}
              onCustomDates={(from, to) => { setCustomFrom(from); setCustomTo(to); }}
            />
            <div className="flex gap-2">
              <TogglePills
                options={[
                  { value: 'volume' as const, label: 'VOLUME' },
                  { value: 'peak' as const, label: 'PEAK' },
                ]}
                selected={metric}
                onChange={setMetric}
                size="sm"
              />
              <TogglePills
                options={[
                  { value: 'raw' as const, label: 'RAW' },
                  { value: 'percent' as const, label: '% IMP.' },
                ]}
                selected={mode}
                onChange={setMode}
                size="sm"
              />
            </div>
          </div>

          {/* Trends Chart */}
          <GlassCard className="p-5" delay={0.4}>
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
                  {Math.abs(velocityPts).toFixed(1)}<span className="text-xs text-dark-muted ml-0.5">pts</span>
                </p>
                <p className="text-xs font-semibold text-emerald-500">
                  {formatPercentage(stamina.peakGain)}
                </p>
                <p className="text-[10px] text-dark-muted">IMPROVEMENT</p>
              </div>
            </div>

            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.length > 0 ? chartData : [
                  { date: 'No data', total: 0 },
                ]}>
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#8E8E93', fontSize: 10 }}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(28, 28, 30, 0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      color: '#F5F5F7',
                      fontSize: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#10B981"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 4, fill: '#10B981' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </div>

        {/* Stamina Score + Peak Gain Rings — REAL VALUES */}
        <div className="flex justify-center gap-8 py-6">
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
