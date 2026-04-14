'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { AppShell } from '@/components/layout/app-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { TogglePills } from '@/components/ui/toggle-pills';
import { DateRangeTabs } from '@/components/ui/date-range-tabs';
import { useLeaderboard } from '@/hooks/use-leaderboard';
import { useWorkoutLogs, useSharedLogs, type DateRange } from '@/hooks/use-workout-logs';
import { useAuth } from '@/providers/auth-provider';
import { useStreak } from '@/hooks/use-streak';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { StandingsSkeleton } from '@/components/ui/skeleton';
import { getInitials, formatDistance } from '@/lib/utils';
import type { LeaderboardEntry } from '@/types/database';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot,
} from 'recharts';
import { format } from 'date-fns';
import { Dumbbell, Timer, Route, Trophy } from 'lucide-react';
import { calculateSessionScore } from '@/lib/scoring';

type ArenaMetric = 'overall' | 'pushups' | 'plank' | 'run';

const FRIEND_LINE_COLORS = ['#38BDF8', '#FBBF24', '#A78BFA', '#FB7185'] as const;
const MAX_CHART_FRIENDS = 4;

const METRIC_CONFIG: Record<ArenaMetric, { label: string; unit: string; icon: typeof Trophy }> = {
  overall: { label: 'OVERALL', unit: 'score', icon: Trophy },
  pushups: { label: 'PUSH-UPS', unit: 'reps', icon: Dumbbell },
  plank: { label: 'PLANK', unit: 'min', icon: Timer },
  run: { label: 'RUN', unit: 'km', icon: Route },
};

function getEntryValue(entry: LeaderboardEntry, metric: ArenaMetric): number {
  switch (metric) {
    case 'pushups': return entry.pushup_value;
    case 'plank': return entry.plank_value / 60;
    case 'run': return Number(entry.run_value);
    case 'overall': return entry.total_score;
  }
}

function formatVal(v: number, metric: ArenaMetric, unitPref?: string, isFair?: boolean): string {
  if (metric === 'overall') {
    if (isFair) return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
    return Math.round(v).toLocaleString();
  }
  if (metric === 'plank') return `${v.toFixed(1)}m`;
  if (metric === 'run') {
    const d = unitPref === 'imperial' ? v * 0.621371 : v;
    return `${d.toFixed(1)}${unitPref === 'imperial' ? 'mi' : 'km'}`;
  }
  return `${Math.round(v)}`;
}

export default function ArenaPage() {
  const { profile } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange>('week');
  const [arenaMetric, setArenaMetric] = useState<ArenaMetric>('overall');
  const [fairMode, setFairMode] = useState(false);
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();

  // Peek functionality
  const [peekUser, setPeekUser] = useState<any>(null);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);

  const startPress = (entry: any) => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => {
      setPeekUser(entry);
    }, 400); // 400ms long press to peek //
  };

  const clearPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  useEffect(() => {
    // block scrolling when peeking
    if (peekUser) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; }
  }, [peekUser]);

  const isOverall = arenaMetric === 'overall';
  const rpcMetric = 'volume';
  const rpcMode = isOverall && fairMode ? 'percent' : 'raw';

  const { data: leaderboardRaw = [] } = useLeaderboard(dateRange, rpcMetric, rpcMode, customFrom, customTo);
  const leaderboard = useMemo(() => {
    const entries = leaderboardRaw as LeaderboardEntry[];
    if (isOverall) return entries;
    return [...entries].sort((a, b) => getEntryValue(b, arenaMetric) - getEntryValue(a, arenaMetric));
  }, [leaderboardRaw, arenaMetric, isOverall]);

  const { data: myLogs = [] } = useWorkoutLogs(dateRange, customFrom, customTo);
  const { data: sharedLogs = [] } = useSharedLogs(dateRange, customFrom, customTo);
  const { data: streak = 0 } = useStreak();


  const top3 = leaderboard.slice(0, 3);
  const podiumOrder = top3.length >= 3
    ? [top3[1], top3[0], top3[2]]
    : top3;

  const logMetricVal = (log: { pushup_reps: number; plank_seconds: number; run_distance: number | string | null }, m: ArenaMetric) => {
    switch (m) {
      case 'pushups': return log.pushup_reps || 0;
      case 'plank': return (log.plank_seconds || 0) / 60;
      case 'run': return Number(log.run_distance) || 0;
      case 'overall': {
        const { totalPts } = calculateSessionScore(
          log.pushup_reps || 0,
          log.plank_seconds || 0,
          Number(log.run_distance) || 0
        );
        return totalPts;
      }
    }
  };

  const chartData = useMemo(() => {
    type Row = Record<string, number | string> & { sortKey: string };
    const dataMap = new Map<string, Row>();

    const daySortKey = (log: { logged_at: string }) =>
      format(new Date(log.logged_at), 'yyyy-MM-dd');
    const dayLabel = (log: { logged_at: string }) =>
      format(new Date(log.logged_at), 'MMM d');

    const touch = (log: { logged_at: string }) => {
      const sk = daySortKey(log);
      let row = dataMap.get(sk);
      if (!row) {
        row = { sortKey: sk, date: dayLabel(log), you: 0 };
        dataMap.set(sk, row);
      }
      return row;
    };

    myLogs.forEach((log) => {
      const row = touch(log);
      row.you = (Number(row.you) || 0) + logMetricVal(log, arenaMetric);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sharedLogs.forEach((log: any) => {
      const row = touch(log);
      const userName = log.profiles?.full_name?.split(' ')[0]?.toUpperCase() || 'FRIEND';
      row[userName] = (Number(row[userName]) || 0) + logMetricVal(log, arenaMetric);
    });

    return [...dataMap.values()]
      .sort((a, b) => String(a.sortKey).localeCompare(String(b.sortKey)))
      .map(({ sortKey: _s, ...rest }) => rest);
  }, [myLogs, sharedLogs, arenaMetric]);

  const comparisonUsers = useMemo(() => {
    const users = new Set<string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sharedLogs.forEach((l: any) => users.add(l.profiles?.full_name?.split(' ')[0]?.toUpperCase() || 'FRIEND'));
    return Array.from(users).slice(0, MAX_CHART_FRIENDS);
  }, [sharedLogs]);

  const lastYouPoint = useMemo(() => {
    for (let i = chartData.length - 1; i >= 0; i--) {
      const v = chartData[i].you;
      if (typeof v === 'number' && v > 0) return { idx: i, value: v };
    }
    return null;
  }, [chartData]);

  const mc = METRIC_CONFIG[arenaMetric];
  const MetricIcon = mc.icon;

  return (
    <AppShell>
      <div className="max-w-md mx-auto px-6 space-y-6 pt-2 pb-32" data-testid="uat-arena-page">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between"
        >
          <div>
            <h2 className="text-4xl font-black tracking-tight">ARENA</h2>
            <p className="text-[10px] font-semibold tracking-[0.2em] text-dark-muted uppercase">
              LIVE RANKINGS
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-dark-elevated border border-dark-border">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-500 text-[10px] font-bold tracking-wider">LIVE</span>
            </div>
          </div>
        </motion.div>

        {/* Metric Filter + Date Range */}
        <div className="space-y-2" data-testid="uat-arena-filters">
          <TogglePills
            motionScope="arena-metric-filter"
            options={[
              { value: 'overall' as const, label: 'OVERALL' },
              { value: 'pushups' as const, label: 'PUSH-UPS' },
              { value: 'plank' as const, label: 'PLANK' },
              { value: 'run' as const, label: 'RUN' },
            ]}
            selected={arenaMetric}
            onChange={setArenaMetric}
            size="sm"
          />
          {isOverall && (
            <button
              onClick={() => setFairMode((p) => !p)}
              className={`px-3 py-1.5 rounded-full text-[9px] font-black tracking-widest uppercase transition-all ${
                fairMode
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                  : 'bg-dark-elevated border border-dark-border text-dark-muted hover:text-emerald-500 hover:border-emerald-500/30'
              }`}
            >
              {fairMode ? '⚖ FAIR MODE ON' : '⚖ FAIR MODE'}
            </button>
          )}
          <DateRangeTabs
            motionScope="arena-date-tabs"
            selected={dateRange}
            onChange={setDateRange}
            onCustomDates={(from, to) => { setCustomFrom(from); setCustomTo(to); }}
          />
        </div>

        {/* Podium */}
        <GlassCard className="py-8 px-4 relative overflow-hidden bg-gradient-to-b from-emerald-900/20 to-transparent" delay={0.1}>
          {podiumOrder.length > 0 ? (
            <>
              <div className="flex items-end justify-center gap-4">
                {podiumOrder.map((entry, idx) => {
                  if (!entry) return null;
                  const isFirst = idx === 1;
                  const rank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
                  const isYou = entry.user_id === profile?.id;
                  const val = getEntryValue(entry, arenaMetric);

                  return (
                    <motion.div
                      key={entry.user_id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + idx * 0.1 }}
                      className="flex flex-col items-center"
                    >
                      <div className={`relative ${isFirst ? 'mb-2' : ''}`}>
                        {isFirst && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                            <Trophy size={16} className="text-emerald-500" />
                          </div>
                        )}
                        <div
                          className={`rounded-full overflow-hidden border-2 ${
                            isFirst
                              ? 'w-20 h-20 border-emerald-500'
                              : 'w-14 h-14 border-dark-border'
                          }`}
                        >
                          {entry.avatar_url ? (
                            <Image
                              src={entry.avatar_url}
                              alt={entry.full_name || ''}
                              width={isFirst ? 80 : 56}
                              height={isFirst ? 80 : 56}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <div className="w-full h-full bg-dark-elevated flex items-center justify-center text-xs font-bold text-emerald-500">
                              {getInitials(entry.full_name || 'U')}
                            </div>
                          )}
                        </div>
                        {!isFirst && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-dark-elevated border border-dark-border flex items-center justify-center">
                            <span className="text-[10px] font-bold text-emerald-500">{rank}</span>
                          </div>
                        )}
                      </div>
                      <p className={`font-bold mt-2 ${isFirst ? 'text-sm' : 'text-xs'} text-dark-text`}>
                        {isYou ? 'YOU' : entry.full_name?.split(' ')[0]?.toUpperCase() || 'USER'}
                      </p>
                      <p className="text-emerald-500 font-bold text-xs">
                        {formatVal(val, arenaMetric, profile?.unit_preference, fairMode)}
                      </p>
                    </motion.div>
                  );
                })}
              </div>
              {isOverall && (
                <p className="text-[8px] text-dark-muted text-center mt-4 leading-relaxed">
                  {fairMode
                    ? 'FAIR MODE: Ranked by % improvement vs prior period. A beginner who doubles their output outranks a veteran who improves by 10%.'
                    : 'OVERALL score = sum of session points. Each session earns tiered points per push-up rep, plank second, and run km — harder efforts earn more per unit. See FAQ in Profile.'}
                </p>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <MetricIcon size={32} className="text-dark-muted mx-auto mb-3 opacity-40" />
              <p className="text-sm font-bold text-dark-text mb-1">No data yet</p>
              <p className="text-[11px] text-dark-muted max-w-[200px] mx-auto">
                Log your first workout to see how you stack up against friends in the Arena.
              </p>
            </div>
          )}
        </GlassCard>

        {/* Head to Head Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.3 }}
        >
          <GlassCard animate={false}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MetricIcon size={14} className="text-emerald-500" />
                <p className="text-xs font-bold tracking-wider text-dark-muted uppercase">
                  HEAD TO HEAD
                </p>
              </div>
              <div className="flex gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-semibold text-dark-muted uppercase">YOU</span>
                </div>
                {comparisonUsers.map((name, i) => (
                  <div key={name} className="flex items-center gap-1.5">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: FRIEND_LINE_COLORS[i % FRIEND_LINE_COLORS.length] }}
                    />
                    <span className="text-[10px] font-semibold text-dark-muted uppercase">{name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-48">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
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
                      formatter={(value: number) => [
                        arenaMetric === 'plank' ? `${value.toFixed(1)} min`
                          : arenaMetric === 'run' ? `${value.toFixed(1)} km`
                          : `${Math.round(value)}`,
                        undefined,
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="you"
                      stroke="#10B981"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    {lastYouPoint && (
                      <ReferenceDot
                        x={chartData[lastYouPoint.idx]?.date as string}
                        y={lastYouPoint.value}
                        r={5}
                        fill="#10B981"
                        stroke="#F5F5F7"
                        strokeWidth={2}
                      />
                    )}
                    {comparisonUsers.map((name, i) => (
                      <Line
                        key={name}
                        type="monotone"
                        dataKey={name}
                        stroke={FRIEND_LINE_COLORS[i % FRIEND_LINE_COLORS.length]}
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center border border-dashed border-dark-border rounded-xl">
                  <div className="text-center">
                    <MetricIcon size={20} className="text-dark-muted mx-auto mb-2 opacity-40" />
                    <p className="text-[10px] font-bold text-dark-muted uppercase tracking-widest">NO DATA YET</p>
                    <p className="text-[9px] text-dark-muted mt-1">Share with friends to compare</p>
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>

        {/* Standings */}
        <div>
          <h3 className="text-sm font-black tracking-wider uppercase mb-3">
            STANDINGS
          </h3>
          <div className="space-y-2 pb-6">
            {leaderboard.length > 0 ? leaderboard.map((entry, idx) => {
              const isYou = entry.user_id === profile?.id;
              const rank = idx + 1;
              const val = getEntryValue(entry, arenaMetric);
              const unitPref = profile?.unit_preference;

              return (
                <motion.div
                  key={entry.user_id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * idx }}
                  onPointerDown={() => startPress(entry)}
                  onPointerUp={clearPress}
                  onPointerLeave={clearPress}
                  onPointerCancel={clearPress}
                  className="touch-manipulation"
                >
                  <GlassCard
                    className={`flex items-center gap-3 py-3 px-4 ${
                      isYou ? 'border-emerald-500/30 bg-emerald-500/5' : ''
                    }`}
                    animate={false}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                      rank === 1 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-dark-elevated text-dark-muted'
                    }`}>
                      {rank}
                    </div>

                    <div className="w-10 h-10 rounded-full overflow-hidden bg-dark-elevated">
                      {entry.avatar_url ? (
                        <Image src={entry.avatar_url} alt="" width={40} height={40} className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-emerald-500">
                          {getInitials(entry.full_name)}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-dark-text truncate">
                        {isYou ? `YOU (${entry.full_name?.split(' ')[0]})` : entry.full_name?.toUpperCase()}
                        {isYou && streak >= 1 && (
                          <span className="ml-1.5 text-[10px] text-amber-400 font-bold" title={`${streak}-week streak`}>🔥{streak}</span>
                        )}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-dark-muted mt-0.5">
                        <span className="flex items-center gap-0.5"><Dumbbell size={10} className="text-emerald-500/50" /> {Math.round(entry.pushup_value)}</span>
                        <span className="flex items-center gap-0.5"><Timer size={10} className="text-emerald-500/50" /> {Math.round(entry.plank_value / 60)}m</span>
                        <span className="flex items-center gap-0.5"><Route size={10} className="text-emerald-500/50" /> {formatDistance(Number(entry.run_value), unitPref)}{unitPref === 'imperial' ? 'mi' : 'km'}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-emerald-500 text-sm">
                        {formatVal(val, arenaMetric, profile?.unit_preference, fairMode)}
                      </p>
                      <p className="text-[9px] text-dark-muted uppercase">
                        {isOverall && fairMode ? '% imp.' : mc.unit}
                      </p>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            }) : (
              <GlassCard className="py-8" animate={false}>
                <div className="text-center">
                  <Trophy size={28} className="text-dark-muted mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-bold text-dark-text mb-1">No competitors yet</p>
                  <p className="text-[11px] text-dark-muted max-w-[220px] mx-auto">
                    Connect with friends in your Profile to see how you compare. Log workouts to climb the ranks.
                  </p>
                </div>
              </GlassCard>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {peekUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm touch-none"
            onClick={() => setPeekUser(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-sm rounded-[32px] glass-card-elevated border border-dark-border p-6 shadow-2xl relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/10 to-transparent pointer-events-none" />
              <div className="relative flex flex-col items-center">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-emerald-500 mb-4 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  {peekUser.avatar_url ? (
                    <Image src={peekUser.avatar_url} alt="" width={96} height={96} className="object-cover w-full h-full" />
                  ) : (
                    <div className="w-full h-full bg-dark-elevated flex items-center justify-center text-3xl font-black text-emerald-500">
                      {getInitials(peekUser.full_name)}
                    </div>
                  )}
                </div>
                <h3 className="text-2xl font-black text-white px-2 text-center mb-1 drop-shadow-sm">
                  {peekUser.full_name?.toUpperCase()}
                </h3>
                <p className="text-xs font-bold text-emerald-500 tracking-[0.2em] uppercase mb-6 drop-shadow-sm">
                  {isOverall ? 'TOTAL SESSION POINTS' : `${mc.label} SCORE`} • {formatVal(getEntryValue(peekUser, arenaMetric), arenaMetric, profile?.unit_preference, fairMode)}
                </p>

                <div className="w-full grid grid-cols-3 gap-2">
                  <div className="flex flex-col items-center justify-center py-4 px-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                    <Dumbbell size={18} className="text-emerald-400 mb-2" />
                    <span className="text-lg font-black text-white">{Math.round(peekUser.pushup_value)}</span>
                    <span className="text-[9px] font-bold tracking-wider text-dark-muted mt-1 uppercase">REPS</span>
                  </div>
                  <div className="flex flex-col items-center justify-center py-4 px-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                    <Timer size={18} className="text-emerald-400 mb-2" />
                    <span className="text-lg font-black text-white">{Math.round(peekUser.plank_value / 60)}</span>
                    <span className="text-[9px] font-bold tracking-wider text-dark-muted mt-1 uppercase">MINS</span>
                  </div>
                  <div className="flex flex-col items-center justify-center py-4 px-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                    <Route size={18} className="text-emerald-400 mb-2" />
                    <span className="text-lg font-black text-white">{formatDistance(Number(peekUser.run_value), profile?.unit_preference)}</span>
                    <span className="text-[9px] font-bold tracking-wider text-dark-muted mt-1 uppercase">{profile?.unit_preference === 'imperial' ? 'MI' : 'KM'}</span>
                  </div>
                </div>

                <button 
                  onClick={() => setPeekUser(null)}
                  className="mt-6 px-6 py-3 rounded-full bg-white/10 hover:bg-white/15 text-sm font-bold text-white transition-colors"
                >
                  CLOSE
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </AppShell>
  );
}
