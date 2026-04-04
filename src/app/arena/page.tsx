'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { AppShell } from '@/components/layout/app-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { TogglePills } from '@/components/ui/toggle-pills';
import { DateRangeTabs } from '@/components/ui/date-range-tabs';
import { useLeaderboard } from '@/hooks/use-leaderboard';
import { useWorkoutLogs, useSharedLogs, type DateRange } from '@/hooks/use-workout-logs';
import { useAuth } from '@/providers/auth-provider';
import { formatPercentage, getInitials } from '@/lib/utils';
import type { LeaderboardEntry } from '@/types/database';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';

export default function ArenaPage() {
  const { profile } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange>('week');
  const [metric, setMetric] = useState<'volume' | 'peak'>('volume');
  const [mode, setMode] = useState<'raw' | 'percent'>('raw');
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();

  const { data: leaderboardRaw = [] } = useLeaderboard(dateRange, metric, mode, customFrom, customTo);
  const leaderboard = leaderboardRaw as LeaderboardEntry[];
  const { data: myLogs = [] } = useWorkoutLogs(dateRange, customFrom, customTo);
  const { data: sharedLogs = [] } = useSharedLogs(dateRange, customFrom, customTo);

  // Podium (top 3)
  const top3 = leaderboard.slice(0, 3);
  const podiumOrder = top3.length >= 3
    ? [top3[1], top3[0], top3[2]] // 2nd, 1st, 3rd
    : top3;

  // Process chart data for OVERLAID comparison
  const chartData = useMemo(() => {
    const dataMap: Record<string, any> = {};

    // 1. Add user logs
    myLogs.forEach((log) => {
      const dateKey = format(new Date(log.logged_at), 'EEE').toUpperCase();
      if (!dataMap[dateKey]) dataMap[dateKey] = { date: dateKey };
      
      const val = metric === 'volume'
        ? log.pushup_reps + log.plank_seconds + Number(log.run_distance) * 100
        : Math.max(log.pushup_reps, log.plank_seconds, Number(log.run_distance) * 100);
      
      dataMap[dateKey].you = (dataMap[dateKey].you || 0) + val;
    });

    // 2. Add shared logs (overlaid)
    sharedLogs.forEach((log: any) => {
      const dateKey = format(new Date(log.logged_at), 'EEE').toUpperCase();
      if (!dataMap[dateKey]) dataMap[dateKey] = { date: dateKey };
      
      const val = metric === 'volume'
        ? log.pushup_reps + log.plank_seconds + Number(log.run_distance) * 100
        : Math.max(log.pushup_reps, log.plank_seconds, Number(log.run_distance) * 100);
      
      const userName = log.profiles?.full_name?.split(' ')[0]?.toUpperCase() || 'FRIEND';
      dataMap[dateKey][userName] = (dataMap[dateKey][userName] || 0) + val;
    });

    return Object.values(dataMap);
  }, [myLogs, sharedLogs, metric]);

  // Identify comparison users for the legend
  const comparisonUsers = useMemo(() => {
    const users = new Set<string>();
    sharedLogs.forEach((l: any) => users.add(l.profiles?.full_name?.split(' ')[0]?.toUpperCase() || 'FRIEND'));
    return Array.from(users);
  }, [sharedLogs]);

  return (
    <AppShell>
      <div className="space-y-5 pt-2">
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
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-dark-elevated border border-dark-border">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-500 text-[10px] font-bold tracking-wider">LIVE</span>
          </div>
        </motion.div>

        {/* Filters */}
        <div className="space-y-2">
          <div className="flex gap-3">
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
          <DateRangeTabs
            selected={dateRange}
            onChange={setDateRange}
            onCustomDates={(from, to) => { setCustomFrom(from); setCustomTo(to); }}
          />
        </div>

        {/* Podium */}
        <GlassCard className="py-8 px-4 relative overflow-hidden bg-gradient-to-b from-emerald-900/20 to-transparent" delay={0.1}>
          {podiumOrder.length > 0 ? (
            <div className="flex items-end justify-center gap-4">
              {podiumOrder.map((entry, idx) => {
                if (!entry) return null;
                const isFirst = idx === 1;
                const rank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
                const isYou = entry.user_id === profile?.id;

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
                          <span className="text-emerald-500">⭐</span>
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
                      {Math.round(entry.total_score).toLocaleString()}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-dark-muted">Log sessions to start the competition</p>
            </div>
          )}
        </GlassCard>

        {/* OVERLAID Intensity Velocity Chart */}
        <GlassCard delay={0.3}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold tracking-wider text-dark-muted uppercase">
              INTENSITY VELOCITY
            </p>
            <div className="flex gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-semibold text-dark-muted uppercase">YOU</span>
              </div>
              {comparisonUsers.slice(0, 2).map((name) => (
                <div key={name} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-white/20" />
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
                  />
                  <Line
                    type="monotone"
                    dataKey="you"
                    stroke="#10B981"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  {comparisonUsers.map((name, i) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
                      stroke={`rgba(255,255,255,${0.4 - i * 0.1})`}
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center border border-dashed border-dark-border rounded-xl">
                <p className="text-[10px] font-bold text-dark-muted uppercase tracking-widest">NO LIVE DATA</p>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Standings */}
        <div>
          <h3 className="text-sm font-black tracking-wider uppercase mb-3">
            DETAILED STANDINGS
          </h3>
          <div className="space-y-2 pb-6">
            {leaderboard.map((entry, idx) => {
              const isYou = entry.user_id === profile?.id;
              const rank = idx + 1;

              return (
                <motion.div
                  key={entry.user_id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * idx }}
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
                      </p>
                      <p className="text-[10px] text-dark-muted">
                        💪 {Math.round(entry.pushup_value)} • 🧘 {Math.round(entry.plank_value / 60)}m • 🏃 {Number(entry.run_value).toFixed(1)}km
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-emerald-500 text-sm">
                        {Math.round(entry.total_score).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-dark-muted uppercase">
                        {mode === 'raw' ? 'SCORE' : '% IMP.'}
                      </p>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
