'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { AppShell } from '@/components/layout/app-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { TogglePills } from '@/components/ui/toggle-pills';
import { DateRangeTabs } from '@/components/ui/date-range-tabs';
import { useLeaderboard } from '@/hooks/use-leaderboard';
import { useWorkoutLogs, type DateRange } from '@/hooks/use-workout-logs';
import { useAuth } from '@/providers/auth-provider';
import { formatPercentage, getInitials } from '@/lib/utils';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { format } from 'date-fns';

export default function ArenaPage() {
  const { profile } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange>('week');
  const [metric, setMetric] = useState<'volume' | 'peak'>('volume');
  const [mode, setMode] = useState<'raw' | 'percent'>('raw');

  const { data: leaderboard = [] } = useLeaderboard(dateRange, metric, mode);
  const { data: logs = [] } = useWorkoutLogs(dateRange);

  // Podium (top 3)
  const top3 = leaderboard.slice(0, 3);
  const podiumOrder = top3.length >= 3
    ? [top3[1], top3[0], top3[2]] // 2nd, 1st, 3rd
    : top3;

  // Chart data from logs
  const chartData = logs.map((log) => ({
    date: format(new Date(log.logged_at), 'EEE').toUpperCase(),
    you: metric === 'volume'
      ? log.pushup_reps + log.plank_seconds + Number(log.run_distance) * 100
      : Math.max(log.pushup_reps, log.plank_seconds, Number(log.run_distance) * 100),
  }));

  // Placeholder chart data when no logs
  const defaultChart = [
    { date: 'MON', you: 30, shared: 25 },
    { date: 'TUE', you: 28, shared: 30 },
    { date: 'WED', you: 35, shared: 28 },
    { date: 'THU', you: 40, shared: 35 },
    { date: 'FRI', you: 45, shared: 42 },
    { date: 'SAT', you: 50, shared: 48 },
    { date: 'SUN', you: 55, shared: 45 },
  ];

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
          <button className="w-10 h-10 rounded-xl bg-dark-elevated border border-dark-border flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="21" x2="4" y2="14" />
              <line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" />
              <line x1="20" y1="12" x2="20" y2="3" />
              <line x1="1" y1="14" x2="7" y2="14" />
              <line x1="9" y1="8" x2="15" y2="8" />
              <line x1="17" y1="16" x2="23" y2="16" />
            </svg>
          </button>
        </motion.div>

        {/* Toggles */}
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
          <DateRangeTabs selected={dateRange} onChange={setDateRange} />
        </div>

        {/* Podium */}
        <GlassCard className="py-8 px-4 relative overflow-hidden bg-gradient-to-b from-emerald-900/20 to-transparent" delay={0.1}>
          <div className="flex items-end justify-center gap-4">
            {podiumOrder.map((entry, idx) => {
              if (!entry) return null;
              const isFirst = idx === 1; // Center position = 1st place
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
                    {mode === 'percent'
                      ? formatPercentage(entry.total_score)
                      : `${Math.round(entry.total_score).toLocaleString()}`
                    }
                  </p>
                </motion.div>
              );
            })}
          </div>
        </GlassCard>

        {/* Intensity Velocity Chart */}
        <GlassCard delay={0.3}>
          <p className="text-xs font-bold tracking-wider text-dark-muted uppercase mb-1">
            INTENSITY VELOCITY
          </p>
          <div className="flex gap-4 mb-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-semibold text-dark-muted">YOU</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-dark-muted/50" />
              <span className="text-[10px] font-semibold text-dark-muted">
                {leaderboard[0]?.full_name?.split(' ')[0]?.toUpperCase() || 'FRIEND'}
              </span>
            </div>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData.length > 0 ? chartData : defaultChart}>
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
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="shared"
                  stroke="rgba(142,142,147,0.4)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Detailed Standings */}
        <div>
          <h3 className="text-sm font-black tracking-wider uppercase mb-3">
            DETAILED STANDINGS
          </h3>
          <div className="space-y-2">
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
                    } ${rank <= 3 ? 'border-emerald-500/20' : ''}`}
                    animate={false}
                  >
                    {/* Rank */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                        rank === 1
                          ? 'bg-emerald-500/20 text-emerald-500'
                          : rank <= 3
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-dark-elevated text-dark-muted'
                      }`}
                    >
                      {rank}
                    </div>

                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-dark-elevated flex-shrink-0">
                      {entry.avatar_url ? (
                        <Image
                          src={entry.avatar_url}
                          alt={entry.full_name || ''}
                          width={40}
                          height={40}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-emerald-500">
                          {getInitials(entry.full_name || 'U')}
                        </div>
                      )}
                    </div>

                    {/* Name & stats */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-dark-text truncate">
                        {isYou ? `YOU (${entry.full_name?.split(' ')[0] || ''})` : entry.full_name?.toUpperCase() || 'USER'}
                      </p>
                      <p className="text-[10px] text-dark-muted">
                        {mode === 'raw'
                          ? `${(entry.total_score / 1000).toFixed(1)}k ${metric === 'volume' ? 'total' : 'peak'}`
                          : `${formatPercentage(entry.total_score)} improvement`
                        }
                      </p>
                    </div>

                    {/* Score */}
                    <div className="text-right">
                      <p className="font-bold text-emerald-500 text-sm">
                        {mode === 'percent'
                          ? formatPercentage(entry.total_score)
                          : Math.round(entry.total_score).toLocaleString()
                        }
                      </p>
                      <p className="text-[10px] text-dark-muted uppercase">
                        {rank <= 3 ? 'UP' : 'MAINTAINED'}
                      </p>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}

            {leaderboard.length === 0 && (
              <GlassCard className="text-center py-8">
                <p className="text-dark-muted text-sm">
                  No data yet. Submit workouts to see rankings!
                </p>
              </GlassCard>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
