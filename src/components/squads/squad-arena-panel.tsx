'use client';

import { useState, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfYear, endOfYear, subDays, format,
} from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { KCard, KEyebrow, KDisplay, KAvatar } from '@/components/ui/k-primitives';
import { ActivityEmojiIcon } from '@/components/ui/activity-emoji-icon';
import { useTeamLeaderboard } from '@/hooks/use-teams';
import { useAuth } from '@/providers/auth-provider';
import type { TeamActivity, TeamLeaderboardEntry } from '@/types/database';

type Period = 'wk' | 'mo' | 'yr' | 'custom';

interface SquadArenaPanelProps {
  teamId: string;
  activities: TeamActivity[];
  memberIds: string[];
}

function periodBounds(period: Period, customFrom?: string, customTo?: string) {
  const now = new Date();
  switch (period) {
    case 'wk':
      return {
        from: startOfWeek(now, { weekStartsOn: 1 }).toISOString(),
        to: endOfWeek(now, { weekStartsOn: 1 }).toISOString(),
      };
    case 'mo':
      return { from: startOfMonth(now).toISOString(), to: endOfMonth(now).toISOString() };
    case 'yr':
      return { from: startOfYear(now).toISOString(), to: endOfYear(now).toISOString() };
    case 'custom':
      return {
        from: customFrom ? new Date(customFrom).toISOString() : subDays(now, 14).toISOString(),
        to: customTo ? new Date(customTo).toISOString() : now.toISOString(),
      };
  }
}

function useHeatmap(memberIds: string[]) {
  const supabase = createClient();
  return useQuery({
    queryKey: ['team-heatmap', ...memberIds],
    queryFn: async (): Promise<Record<string, boolean[]>> => {
      if (!memberIds.length) return {};
      const from = subDays(new Date(), 6).toISOString().slice(0, 10);
      const { data } = await supabase
        .from('workout_logs')
        .select('user_id, logged_at')
        .in('user_id', memberIds)
        .not('submitted_at', 'is', null)
        .gte('logged_at', from);

      const map: Record<string, boolean[]> = {};
      for (const uid of memberIds) map[uid] = [false, false, false, false, false, false, false];
      for (const log of data ?? []) {
        const today = new Date();
        const logDate = new Date(log.logged_at.slice(0, 10));
        const diffDays = Math.floor((today.getTime() - logDate.getTime()) / 86400000);
        if (diffDays >= 0 && diffDays <= 6 && map[log.user_id]) {
          map[log.user_id][6 - diffDays] = true;
        }
      }
      return map;
    },
    enabled: memberIds.length > 0,
  });
}

function useMemberWeekLogs(userId: string | null) {
  const supabase = createClient();
  return useQuery({
    queryKey: ['member-week-logs', userId],
    queryFn: async () => {
      if (!userId) return [];
      const from = subDays(new Date(), 6).toISOString().slice(0, 10);
      const { data } = await supabase
        .from('workout_logs')
        .select('logged_at, pushup_reps, plank_seconds, run_distance, squat_reps, session_score')
        .eq('user_id', userId)
        .not('submitted_at', 'is', null)
        .gte('logged_at', from)
        .order('logged_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!userId,
  });
}

// ── Peek Card ──────────────────────────────────────────────────────────────────
function PeekCard({ member, onClose }: { member: TeamLeaderboardEntry; onClose: () => void }) {
  const { data: logs = [] } = useMemberWeekLogs(member.user_id);

  const days = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = subDays(today, i);
      return { date: format(d, 'd'), short: format(d, 'EEE').toUpperCase(), key: format(d, 'yyyy-MM-dd') };
    });
  }, []);

  const logByDay = useMemo(() => {
    const map = new Map<string, typeof logs>();
    for (const log of logs) {
      const key = log.logged_at.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(log);
    }
    return map;
  }, [logs]);

  const totalPts = useMemo(() => logs.reduce((s, l) => s + (l.session_score || 0), 0), [logs]);
  const activeDays = useMemo(() => days.filter(d => (logByDay.get(d.key)?.length ?? 0) > 0).length, [days, logByDay]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(11,13,12,0.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="w-full rounded-t-[28px] overflow-y-auto"
        style={{ background: '#EEF0F0', maxHeight: '92dvh', boxShadow: '0 20px 50px rgba(15,17,16,0.18)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3">
          <div className="w-11 h-1 rounded-full" style={{ background: 'rgba(15,17,16,0.14)' }} />
        </div>

        <div className="flex items-center gap-3.5 px-5 pt-4 pb-3.5">
          <KAvatar name={member.full_name} src={member.avatar_url} size={56} />
          <div className="flex-1 min-w-0">
            <div className="font-display italic font-black text-[20px] text-k-ink uppercase" style={{ letterSpacing: -0.3 }}>
              {member.full_name || 'Athlete'}
            </div>
            <KEyebrow className="mt-1">Rolling 7 days</KEyebrow>
          </div>
          <div className="text-right">
            <div className="font-display italic font-black text-[26px] text-emerald-600 dark:text-emerald-400" style={{ letterSpacing: -1, lineHeight: 1 }}>
              {totalPts.toLocaleString()}
            </div>
            <div className="text-[9px] text-k-muted font-bold tracking-[1px] uppercase mt-1">total pts</div>
          </div>
        </div>

        <div className="px-4 space-y-1.5 pb-2">
          {days.map(day => {
            const dayLogs = logByDay.get(day.key) ?? [];
            const isRest = dayLogs.length === 0;
            const dayScore = dayLogs.reduce((s, l) => s + (l.session_score || 0), 0);
            return (
              <div
                key={day.key}
                className="rounded-k-md px-3.5"
                style={{
                  background: '#fff',
                  boxShadow: '0 1px 2px rgba(15,17,16,0.04)',
                  opacity: isRest ? 0.55 : 1,
                  paddingTop: 10,
                  paddingBottom: 10,
                }}
              >
                <div className="flex items-center justify-between" style={{ marginBottom: isRest ? 0 : 8 }}>
                  <span className="text-[11px] font-bold tracking-[1px] uppercase text-k-muted">
                    {day.date} {day.short}
                  </span>
                  {isRest ? (
                    <span className="text-[11px] font-semibold text-k-muted-soft">Rest</span>
                  ) : (
                    <span className="font-display italic font-black text-[15px] text-emerald-600 dark:text-emerald-400" style={{ letterSpacing: -0.3 }}>
                      {dayScore.toLocaleString()} pts
                    </span>
                  )}
                </div>
                {!isRest && dayLogs.map((log, li) => (
                  <div key={li} className="flex gap-3.5 flex-wrap">
                    {(log.pushup_reps ?? 0) > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-[13px] font-extrabold text-k-ink">{log.pushup_reps}</span>
                        <span className="text-[11px] text-k-muted font-semibold">push-ups</span>
                      </div>
                    )}
                    {(log.plank_seconds ?? 0) > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-[13px] font-extrabold text-k-ink">
                          {Math.floor((log.plank_seconds ?? 0) / 60)}:{String((log.plank_seconds ?? 0) % 60).padStart(2, '0')}
                        </span>
                        <span className="text-[11px] text-k-muted font-semibold">plank</span>
                      </div>
                    )}
                    {Number(log.run_distance ?? 0) > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-[13px] font-extrabold text-k-ink">{Number(log.run_distance).toFixed(1)}</span>
                        <span className="text-[11px] text-k-muted font-semibold">km</span>
                      </div>
                    )}
                    {(log.squat_reps ?? 0) > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-[13px] font-extrabold text-k-ink">{log.squat_reps}</span>
                        <span className="text-[11px] text-k-muted font-semibold">squats</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <div className="mx-4 my-3">
          <div
            className="rounded-k-lg px-3.5 py-3 flex items-center justify-between"
            style={{ background: '#EAF6EF', border: '1px solid #D7F0E2' }}
          >
            <span className="text-[12px] font-extrabold text-emerald-700 dark:text-emerald-300 tracking-[1px] uppercase">
              {activeDays} active days
            </span>
            <div className="flex items-baseline gap-1">
              <span className="font-display italic font-black text-[24px] text-emerald-600 dark:text-emerald-400" style={{ letterSpacing: -0.8 }}>
                {totalPts.toLocaleString()}
              </span>
              <span className="text-[12px] font-bold text-k-muted">pts</span>
            </div>
          </div>
        </div>

        <div className="px-4 pb-8 pt-1">
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-k-lg text-[12px] font-extrabold tracking-[2px] uppercase text-k-muted border border-k-line-strong bg-white shadow-k-card"
          >
            CLOSE
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Mini Podium ────────────────────────────────────────────────────────────────
function MiniPodium({
  member, rank, height, isMe, big = false,
}: {
  member: TeamLeaderboardEntry | null;
  rank: number;
  height: number;
  isMe: boolean;
  big?: boolean;
}) {
  const firstName = member?.full_name?.split(' ')[0] ?? '—';
  return (
    <div className="flex-1 flex flex-col items-center gap-1.5">
      {rank === 1 && <span className="text-[18px] leading-none">👑</span>}
      {!member ? (
        <div
          className="rounded-full flex items-center justify-center text-k-muted-soft text-xs"
          style={{ width: big ? 48 : 36, height: big ? 48 : 36, background: '#EDEEEC' }}
        >—</div>
      ) : (
        <KAvatar name={member.full_name} src={member.avatar_url} size={big ? 48 : 36} ring={isMe ? '#1FB37A' : undefined} />
      )}
      <div className="text-center">
        <div
          className={`font-extrabold text-k-ink overflow-hidden text-ellipsis whitespace-nowrap ${big ? 'text-[12px]' : 'text-[10px]'}`}
          style={{ maxWidth: big ? 72 : 60 }}
        >
          {isMe ? 'You' : firstName}
        </div>
        {member && (
          <div
            className={`font-display italic font-black text-emerald-600 dark:text-emerald-400 mt-0.5 ${big ? 'text-[18px]' : 'text-[13px]'}`}
            style={{ letterSpacing: -0.5 }}
          >
            {member.total_score.toLocaleString()}
          </div>
        )}
      </div>
      <div
        className="w-[85%] flex items-start justify-center pt-2 font-display italic font-black"
        style={{
          height,
          background: rank === 1 ? 'linear-gradient(180deg, #1FB37A, #158A5D)' : '#EAF6EF',
          borderRadius: '10px 10px 0 0',
          fontSize: big ? 28 : 20,
          color: rank === 1 ? '#fff' : '#9AA2A9',
          letterSpacing: -1,
        }}
      >
        {rank}
      </div>
    </div>
  );
}

// ── Custom Range Picker ────────────────────────────────────────────────────────
function CustomRangePicker({ from, to, onFrom, onTo }: {
  from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void;
}) {
  const today = new Date();
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
  const presets = [
    { label: '2 wks', days: 14 },
    { label: '3 mo', days: 90 },
    { label: '6 mo', days: 180 },
    { label: 'All time', days: 365 },
  ];

  return (
    <div className="rounded-k-md p-3.5 shadow-k-card bg-k-card">
      <div className="flex gap-1.5 mb-3">
        {presets.map(p => (
          <button
            key={p.label}
            type="button"
            onClick={() => { onFrom(fmt(subDays(today, p.days))); onTo(fmt(today)); }}
            className="flex-1 rounded-k-pill py-1.5 border-none text-[9px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-[0.3px]"
            style={{ background: '#EAF6EF' }}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2.5 items-end">
        <div className="flex-1">
          <div className="text-[9px] text-k-muted font-bold tracking-[1px] uppercase mb-1">From</div>
          <input
            type="date"
            value={from}
            onChange={e => onFrom(e.target.value)}
            className="w-full border border-k-line-strong rounded-k-sm px-2.5 py-2 text-[12px] text-k-ink bg-k-bg outline-none"
          />
        </div>
        <span className="text-[12px] text-k-muted font-bold pb-2">→</span>
        <div className="flex-1">
          <div className="text-[9px] text-k-muted font-bold tracking-[1px] uppercase mb-1">To</div>
          <input
            type="date"
            value={to}
            onChange={e => onTo(e.target.value)}
            className="w-full border border-k-line-strong rounded-k-sm px-2.5 py-2 text-[12px] text-k-ink bg-k-bg outline-none"
          />
        </div>
      </div>
    </div>
  );
}

// ── Main Arena Panel ──────────────────────────────────────────────────────────
export function SquadArenaPanel({ teamId, activities, memberIds }: SquadArenaPanelProps) {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>('wk');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [activeEx, setActiveEx] = useState<string | null>(null);
  const [peekMember, setPeekMember] = useState<TeamLeaderboardEntry | null>(null);
  const [rivalId, setRivalId] = useState<string | null>(null);
  const peekTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { from, to } = useMemo(
    () => periodBounds(period, customFrom || undefined, customTo || undefined),
    [period, customFrom, customTo],
  );
  const { data: board = [], isLoading } = useTeamLeaderboard(teamId, from, to);
  const { data: heatmap = {} } = useHeatmap(memberIds);

  const sorted = useMemo(() => [...board].sort((a, b) => b.total_score - a.total_score), [board]);
  const maxScore = useMemo(() => Math.max(1, ...sorted.map(s => s.total_score)), [sorted]);
  const me = sorted.find(m => m.user_id === user?.id);
  const myRank = me ? sorted.indexOf(me) + 1 : -1;
  const top3 = sorted.slice(0, 3);
  const others = sorted.filter(m => m.user_id !== user?.id);
  const currentRival = rivals(others, rivalId);

  const days7Labels = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => format(subDays(today, 6 - i), 'EEE').slice(0, 1).toUpperCase());
  }, []);

  const onPressStart = useCallback((m: TeamLeaderboardEntry) => {
    peekTimer.current = setTimeout(() => setPeekMember(m), 400);
  }, []);
  const onPressEnd = useCallback(() => {
    if (peekTimer.current) clearTimeout(peekTimer.current);
  }, []);

  const periodLabel = { wk: 'This week', mo: 'This month', yr: 'This year', custom: 'Custom range' }[period];

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex bg-k-card rounded-k-pill shadow-k-card p-1">
        {(['wk', 'mo', 'yr', 'custom'] as Period[]).map(p => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={`flex-1 py-2 px-1 rounded-k-pill text-[11px] font-bold uppercase tracking-wide transition-all border-none ${
              period === p
                ? 'bg-k-mint text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'
                : 'bg-transparent text-k-muted'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {period === 'custom' && (
        <CustomRangePicker from={customFrom} to={customTo} onFrom={setCustomFrom} onTo={setCustomTo} />
      )}

      {/* Podium */}
      <KCard pad={20} style={{ position: 'relative', overflow: 'hidden' }}>
        <div
          className="absolute pointer-events-none opacity-50 rounded-full w-56 h-56"
          style={{ top: -40, left: '50%', transform: 'translateX(-50%)', background: 'radial-gradient(circle, #D7F0E2, transparent 70%)' }}
        />
        <div className="flex justify-between items-baseline mb-4 relative">
          <div>
            <KEyebrow>Top performers</KEyebrow>
            <KDisplay size={18} className="mt-1">PODIUM · {period.toUpperCase()}</KDisplay>
          </div>
          <span className="text-[10px] text-k-muted font-bold">{periodLabel}</span>
        </div>
        {isLoading ? (
          <div className="h-32 rounded-k-lg bg-k-bg animate-pulse" />
        ) : (
          <div className="flex items-end justify-center gap-2 relative">
            <MiniPodium member={top3[1] ?? null} rank={2} height={60} isMe={top3[1]?.user_id === user?.id} />
            <MiniPodium member={top3[0] ?? null} rank={1} height={90} isMe={top3[0]?.user_id === user?.id} big />
            <MiniPodium member={top3[2] ?? null} rank={3} height={44} isMe={top3[2]?.user_id === user?.id} />
          </div>
        )}
        {!isLoading && myRank > 3 && me && (
          <div className="mt-3.5 pt-3 border-t border-k-line flex items-center gap-2.5">
            <KAvatar name={me.full_name} src={me.avatar_url} size={28} ring="#1FB37A" />
            <span className="flex-1 text-[12px] font-bold text-k-ink">You · #{myRank}</span>
            <span className="font-display italic font-black text-[16px] text-emerald-600 dark:text-emerald-400" style={{ letterSpacing: -0.3 }}>
              {me.total_score.toLocaleString()}
            </span>
          </div>
        )}
      </KCard>

      {/* Rivalry */}
      {currentRival && me && activities.length > 0 && (
        <KCard pad={16}>
          <div className="flex justify-between items-start mb-3.5">
            <div>
              <KEyebrow>Rivalry</KEyebrow>
              <KDisplay size={18} className="mt-1">
                YOU VS {(currentRival.full_name || 'RIVAL').split(' ')[0].toUpperCase()}
              </KDisplay>
            </div>
            <div className="flex">
              {others.slice(0, 5).map((m, i) => (
                <div
                  key={m.user_id}
                  onClick={() => setRivalId(m.user_id)}
                  className="cursor-pointer transition-all rounded-full"
                  style={{
                    marginLeft: i > 0 ? -6 : 0,
                    outline: currentRival.user_id === m.user_id ? '2.5px solid #1FB37A' : '2.5px solid transparent',
                  }}
                >
                  <KAvatar name={m.full_name} src={m.avatar_url} size={28} />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2.5">
            {activities.map(act => {
              const myVal = getBreakdownValue(me, act.slug);
              const rivalVal = getBreakdownValue(currentRival, act.slug);
              const total = myVal + rivalVal || 1;
              const myPct = (myVal / total) * 100;
              const winning = myVal >= rivalVal;
              const diff = Math.abs(Math.round(myVal - rivalVal));
              return (
                <div key={act.slug}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[11px] font-bold text-k-ink flex-1">{act.name}</span>
                    <span className={`text-[12px] font-extrabold ${winning ? 'text-emerald-600 dark:text-emerald-400' : 'text-k-muted-soft'}`}>
                      {Math.round(myVal).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-k-muted mx-1">vs</span>
                    <span className={`text-[12px] font-extrabold ${!winning ? 'text-k-ink' : 'text-k-muted-soft'}`}>
                      {Math.round(rivalVal).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-k-muted ml-0.5">{act.unit}</span>
                    <span className={`text-[9px] font-bold ml-1 ${winning ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                      {winning ? '+' : '-'}{diff}
                    </span>
                  </div>
                  <div className="h-2 rounded-full flex overflow-hidden gap-px">
                    <div
                      className="min-w-1 h-full rounded-l-full transition-all duration-700"
                      style={{
                        width: `${myPct}%`,
                        background: winning ? 'linear-gradient(90deg, #1FB37A, #158A5D)' : '#D8DAD9',
                      }}
                    />
                    <div
                      className="flex-1 min-w-1 h-full rounded-r-full"
                      style={{ background: !winning ? '#9AA2A9' : '#EDEEEC' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between items-center mt-3.5 pt-2.5 border-t border-k-line">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              <span className="text-[10px] text-k-muted font-semibold">You</span>
            </div>
            <span className="text-[10px] text-k-muted font-semibold">Tap avatar to switch rival</span>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-k-muted-soft" />
              <span className="text-[10px] text-k-muted font-semibold">{currentRival.full_name?.split(' ')[0] ?? 'Rival'}</span>
            </div>
          </div>
        </KCard>
      )}

      {/* Leaderboard with long-press peek */}
      <KCard pad={16}>
        <div className="flex justify-between items-baseline mb-1.5">
          <div>
            <KEyebrow>Leaderboard</KEyebrow>
            <KDisplay size={18} className="mt-1">WEEK RANK</KDisplay>
          </div>
          <span className="text-[10px] text-k-muted-soft font-semibold">Hold to peek</span>
        </div>
        {isLoading ? (
          <div className="h-28 rounded-k-lg bg-k-bg animate-pulse mt-3" />
        ) : (
          <div className="mt-3 space-y-2.5">
            {sorted.map((m, i) => {
              const isMe = m.user_id === user?.id;
              const pct = (m.total_score / maxScore) * 100;
              return (
                <div
                  key={m.user_id}
                  onMouseDown={() => onPressStart(m)}
                  onMouseUp={onPressEnd}
                  onMouseLeave={onPressEnd}
                  onTouchStart={() => onPressStart(m)}
                  onTouchEnd={onPressEnd}
                  className="cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className={`w-4 text-center font-display italic font-black text-[14px] ${i === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-k-muted-soft'}`}
                      style={{ letterSpacing: -0.3 }}
                    >{i + 1}</span>
                    <KAvatar name={m.full_name} src={m.avatar_url} size={26} ring={isMe ? '#1FB37A' : undefined} />
                    <span className="text-[12px] font-bold text-k-ink flex-1">
                      {isMe ? 'You' : m.full_name?.split(' ')[0] ?? 'Athlete'}
                      {isMe && (
                        <span className="ml-1.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-k-mint px-1.5 py-0.5 rounded tracking-wide uppercase">
                          me
                        </span>
                      )}
                    </span>
                    <span
                      className={`font-display italic font-black text-[14px] ${isMe ? 'text-emerald-600 dark:text-emerald-400' : 'text-k-ink'}`}
                      style={{ letterSpacing: -0.3 }}
                    >
                      {m.total_score.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-[7px] rounded-full overflow-hidden ml-6" style={{ background: '#EDEEEC' }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background: isMe ? 'linear-gradient(90deg, #1FB37A, #158A5D)' : '#9AA2A9',
                        opacity: isMe ? 1 : 0.65,
                        boxShadow: isMe ? '0 0 8px rgba(31,179,122,0.33)' : 'none',
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </KCard>

      {/* Exercise trophies */}
      {activities.length > 0 && (
        <div>
          <KEyebrow className="mb-2.5">Exercise trophies — tap to rank</KEyebrow>
          <div className="space-y-2">
            {activities.map(act => {
              const isOpen = activeEx === act.slug;
              const rankByAct = [...sorted].sort(
                (a, b) => getBreakdownValue(b, act.slug) - getBreakdownValue(a, act.slug),
              );
              const leader = rankByAct[0];
              const myExRank = me ? rankByAct.findIndex(m => m.user_id === user?.id) + 1 : -1;
              const topVal = getBreakdownValue(leader, act.slug);

              return (
                <KCard
                  key={act.slug}
                  pad={14}
                  onClick={() => setActiveEx(isOpen ? null : act.slug)}
                >
                  <div className="flex items-center gap-3">
                    <ActivityEmojiIcon emoji={act.emoji} slug={act.slug} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold text-k-ink">{act.name}</div>
                      <div className="text-[10px] text-k-muted font-semibold mt-0.5 flex items-center gap-1.5">
                        <span>🏆 <span className="font-bold">{leader?.user_id === user?.id ? 'You' : leader?.full_name?.split(' ')[0] ?? '—'}</span></span>
                        {myExRank > 0 && (
                          <>
                            <span style={{ color: 'rgba(15,17,16,0.14)' }}>·</span>
                            <span>You: <span className={`font-bold ${myExRank <= 2 ? 'text-emerald-600 dark:text-emerald-400' : 'text-k-ink'}`}>#{myExRank}</span></span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-display italic font-black text-[16px] text-emerald-600 dark:text-emerald-400" style={{ letterSpacing: -0.3 }}>
                        {Math.round(topVal).toLocaleString()}
                      </div>
                      <div className="text-[9px] text-k-muted font-bold tracking-[1px] uppercase">{act.unit}</div>
                    </div>
                    <svg
                      width="14" height="14" viewBox="0 0 14 14" fill="none"
                      className={`ml-1 text-k-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    >
                      <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3.5 pt-3.5 border-t border-k-line space-y-2">
                          {rankByAct.map((m, ri) => {
                            const isMe = m.user_id === user?.id;
                            const val = getBreakdownValue(m, act.slug);
                            const topV = Math.max(1, getBreakdownValue(rankByAct[0], act.slug));
                            return (
                              <div key={m.user_id}>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-[11px] font-bold w-4 text-center ${ri === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-k-muted'}`}>{ri + 1}</span>
                                  <KAvatar name={m.full_name} src={m.avatar_url} size={20} />
                                  <span className={`text-[11px] flex-1 ${isMe ? 'font-extrabold' : 'font-bold'} text-k-ink`}>
                                    {isMe ? 'You' : m.full_name?.split(' ')[0] ?? 'Athlete'}
                                  </span>
                                  <span className={`font-display italic font-black text-[12px] ${isMe ? 'text-emerald-600 dark:text-emerald-400' : 'text-k-ink'}`} style={{ letterSpacing: -0.3 }}>
                                    {Math.round(val).toLocaleString()}
                                  </span>
                                  <span className="text-[10px] text-k-muted font-semibold ml-0.5">{act.unit}</span>
                                </div>
                                <div className="h-[5px] rounded-full overflow-hidden" style={{ background: '#EDEEEC' }}>
                                  <motion.div
                                    className="h-full rounded-full"
                                    style={{
                                      background: ri === 0 ? 'linear-gradient(90deg, #1FB37A, #158A5D)' : isMe ? '#1FB37A' : '#9AA2A9',
                                      opacity: ri === 0 || isMe ? 1 : 0.65,
                                    }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(val / topV) * 100}%` }}
                                    transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </KCard>
              );
            })}
          </div>
        </div>
      )}

      {/* Activity heatmap */}
      <KCard pad={16}>
        <KEyebrow>Activity heatmap</KEyebrow>
        <KDisplay size={18} className="mt-1 mb-3.5">WHO SHOWED UP</KDisplay>
        <div className="flex gap-1.5 mb-2">
          {days7Labels.map((d, i) => (
            <div key={i} className="flex-1 text-center text-[10px] font-bold text-k-muted tracking-[0.5px]">{d}</div>
          ))}
        </div>
        <div className="space-y-1.5">
          {sorted.map(m => {
            const isMe = m.user_id === user?.id;
            const activity = heatmap[m.user_id] ?? Array(7).fill(false);
            return (
              <div key={m.user_id} className="flex items-center gap-1.5">
                <KAvatar name={m.full_name} src={m.avatar_url} size={20} ring={isMe ? '#1FB37A' : undefined} />
                <div className="flex gap-1.5 flex-1">
                  {activity.map((active: boolean, di: number) => (
                    <div
                      key={di}
                      className="flex-1 h-5 rounded"
                      style={{
                        background: active ? (isMe ? '#1FB37A' : '#9AA2A9') : '#EDEEEC',
                        opacity: active ? 1 : 0.35,
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-k-line">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-emerald-600" />
            <span className="text-[10px] text-k-muted font-semibold">Active</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: '#EDEEEC' }} />
            <span className="text-[10px] text-k-muted font-semibold">Rest day</span>
          </div>
          <span className="ml-auto text-[10px] text-k-muted font-semibold">
            {format(subDays(new Date(), 6), 'MMM d')}–{format(new Date(), 'MMM d')}
          </span>
        </div>
      </KCard>

      {/* Peek overlay */}
      <AnimatePresence>
        {peekMember && <PeekCard member={peekMember} onClose={() => setPeekMember(null)} />}
      </AnimatePresence>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function getBreakdownValue(entry: TeamLeaderboardEntry, slug: string): number {
  const bd = entry.activity_breakdown;
  if (!bd) return 0;
  // handle core slug normalization (pushup→pushups, squat→squats)
  return bd[slug]?.value ?? bd[slug + 's']?.value ?? bd[slug.replace(/s$/, '')]?.value ?? 0;
}

function rivals(others: TeamLeaderboardEntry[], rivalId: string | null): TeamLeaderboardEntry | null {
  if (!others.length) return null;
  if (!rivalId) return others[0];
  return others.find(m => m.user_id === rivalId) ?? others[0];
}
