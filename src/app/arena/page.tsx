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
  const { data: logs = [] } = useWorkoutLogs(dateRange, customFrom, customTo);

  // Find current user entry
  const myEntry = leaderboard.find((e) => e.user_id === profile?.id);

  // Podium (top 3)
  const top3 = leaderboard.slice(0, 3);
  const podiumOrder = top3.length >= 3
    ? [top3[1], top3[0], top3[2]] // 2nd, 1st, 3rd
    : top3;

  // Chart data — user's own line from real logs (no placeholders)
  const chartData = logs.map((log) => ({
    date: format(new Date(log.logged_at), 'EEE').toUpperCase(),
    you: metric === 'volume'
      ? log.pushup_reps + log.plank_seconds + Number(log.run_distance) * 100
      : Math.max(log.pushup_reps, log.plank_seconds, Number(log.run_distance) * 100),
  }));

  // Leader's name for chart legend
  const leader = leaderboard[0];
  const leaderName = leader && leader.user_id !== profile?.id
    ? leader.full_name?.split(' ')[0]?.toUpperCase() || 'LEADER'
    : leaderboard[1]?.full_name?.split(' ')[0]?.toUpperCase() || 'FRIEND';

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

        {/* Toggles — these update BOTH podium/table AND chart */}
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
                    {/* Show % improvement alongside raw */}
                    <p className="text-[10px] text-dark-muted">
                      {formatPercentage(((entry.total_score / Math.max(leaderboard[leaderboard.length - 1]?.total_score || 1, 1)) - 1) * 100)}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-dark-muted">Submit workouts to see the podium!</p>
            </div>
          )}
        </GlassCard>

        {/* Intensity Velocity Chart — Real data only */}
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
              <span className="text-[10px] font-semibold text-dark-muted">{leaderName}</span>
            </div>
          </div>
          <div className="h-44">
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
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4 }}
                    name="YOU"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-dark-muted">Log workouts to see your trend line</p>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Detailed Standings — shows raw + % improvement side-by-side */}
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

                    {/* Name + individual metrics */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-dark-text truncate">
                        {isYou ? `YOU (${entry.full_name?.split(' ')[0] || ''})` : entry.full_name?.toUpperCase() || 'USER'}
                      </p>
                      <p className="text-[10px] text-dark-muted">
                        💪 {Math.round(entry.pushup_value)} • 🧘 {Math.round(entry.plank_value / 60)}m • 🏃 {Number(entry.run_value).toFixed(1)}km
                      </p>
                    </div>

                    {/* Raw score + % improvement side-by-side */}
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-emerald-500 text-sm">
                        {Math.round(entry.total_score).toLocaleString()}
                      </p>
                      <p className="text-[10px] font-semibold text-emerald-400">
                        {formatPercentage(
                          ((entry.total_score / Math.max(leaderboard[leaderboard.length - 1]?.total_score || 1, 1)) - 1) * 100
                        )}
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
