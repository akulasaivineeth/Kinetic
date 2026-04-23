'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { AppShell } from '@/components/layout/app-shell';
import { KCard, KEyebrow, KDisplay, KRing } from '@/components/ui/k-primitives';
import { IcFlame, IcSparkle, IcTrophy, EXERCISE_ICON_MAP } from '@/components/ui/k-icons';
import { useTodayScore } from '@/hooks/use-today-score';
import { useTier } from '@/hooks/use-tier';
import { useStreak } from '@/hooks/use-streak';
import { useWorkoutLogs } from '@/hooks/use-workout-logs';
import { useGoalSuggestions } from '@/hooks/use-goal-suggestions';
import { useLeaderboard } from '@/hooks/use-leaderboard';
import { useUserMilestoneUnlocks } from '@/hooks/use-user-milestones';
import { useAuth } from '@/providers/auth-provider';
import { K } from '@/lib/design-tokens';

import { motion, AnimatePresence } from 'framer-motion';

/** 
 * KBadge: A high-end, Apple-inspired 3D medal for achievements.
 * Now supports a "back" side for engravings.
 */
function KBadge({ 
  milestoneKey, 
  size = 48,
  isFlipped = false,
  dateLabel = '',
  achievementLabel = ''
}: { 
  milestoneKey: string; 
  size?: number;
  isFlipped?: boolean;
  dateLabel?: string;
  achievementLabel?: string;
}) {
  const metric = milestoneKey.split('_')[0].replace(/s$/, '');
  const Icon = EXERCISE_ICON_MAP[metric] ?? EXERCISE_ICON_MAP[metric + 's'] ?? IcTrophy;
  
  const themes: Record<string, { main: string; light: string; deep: string; glow: string }> = {
    pushup: { main: '#E3B341', light: '#ffeecc', deep: '#997722', glow: '#ffd43b44' },
    plank:  { main: '#1FB37A', light: '#cff7e8', deep: '#0f6b47', glow: '#1fb37a44' },
    run:    { main: '#6BB6BF', light: '#e1f5f7', deep: '#2d6a71', glow: '#6bb6bf44' },
    squat:  { main: '#FC3D39', light: '#ffeceb', deep: '#b31512', glow: '#fc3d3944' },
    default:{ main: '#8E8E93', light: '#f0f0f0', deep: '#555555', glow: '#8e8e9333' }
  };

  const theme = themes[metric] || themes.default;
  const iconSize = Math.round(size * 0.5);

  return (
    <div 
      className="relative flex items-center justify-center shrink-0" 
      style={{ 
        width: size, 
        height: size,
        perspective: '1200px',
        transformStyle: 'preserve-3d'
      }}
    >
      <motion.div
        animate={{ 
          rotateY: isFlipped ? 180 : 0,
          rotateX: isFlipped ? 0 : [0, 2, -2, 0],
          rotateZ: isFlipped ? 0 : [0, 1, -1, 0]
        }}
        transition={{ 
          rotateY: { type: 'spring', stiffness: 200, damping: 25 },
          rotateX: { repeat: Infinity, duration: 4, ease: "linear" },
          rotateZ: { repeat: Infinity, duration: 5, ease: "linear" }
        }}
        style={{ transformStyle: 'preserve-3d' }}
        className="relative w-full h-full"
      >
        {/* FRONT SIDE */}
        <div 
          className="absolute inset-0 rounded-full border-[1.5px] shadow-lg flex items-center justify-center overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            background: `linear-gradient(135deg, ${theme.light} 0%, ${theme.main} 50%, ${theme.deep} 100%)`,
            borderColor: theme.deep,
            boxShadow: `inset 0 1px 1px rgba(255,255,255,0.8), 0 4px 10px rgba(0,0,0,0.2)`,
            transform: 'translateZ(1px)' // Small push forward to prevent bleed
          }}
        >
          <div className="absolute inset-0 rounded-full blur-[10px] opacity-40" style={{ background: theme.glow }} />
          <div className="absolute inset-[15%] rounded-full opacity-60 bg-white/40 backdrop-blur-[3px] border border-white/50 shadow-inner" />
          
          {/* Shimmer Effect */}
          <motion.div 
            animate={{ x: [-size, size * 2] }}
            transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
            className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent -rotate-45"
          />

          <div 
            className="absolute top-0 left-0 right-0 h-1/2 opacity-60"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 100%)',
              clipPath: 'ellipse(100% 100% at 50% 0%)'
            }}
          />
          <div className="relative z-10 drop-shadow-md">
            <Icon size={iconSize} color={theme.deep} />
          </div>
        </div>

        {/* BACK SIDE (Engraved) */}
        <div 
          className="absolute inset-0 rounded-full border-[1.5px] shadow-lg flex flex-col items-center justify-center p-4 text-center overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg) translateZ(1px)', // Small push forward from its perspective
            background: `linear-gradient(135deg, ${theme.main} 0%, ${theme.deep} 100%)`,
            borderColor: theme.deep,
            boxShadow: `inset 0 4px 10px rgba(0,0,0,0.3)`
          }}
        >
          {/* Engraving Effect */}
          <div className="flex flex-col items-center justify-center gap-1 relative z-10">
            <div className="w-10 h-[1.5px] bg-black/30 mb-3 rounded-full opacity-50" />
            <p 
              className="font-display font-black italic uppercase leading-none text-black/60 mix-blend-overlay"
              style={{ fontSize: size * 0.1, letterSpacing: '-0.02em' }}
            >
              {achievementLabel}
            </p>
            <p 
              className="font-bold uppercase tracking-[0.2em] text-black/50 mt-1"
              style={{ fontSize: size * 0.05 }}
            >
              Earned on
            </p>
            <p 
              className="font-black uppercase text-black/60 mix-blend-overlay"
              style={{ fontSize: size * 0.07 }}
            >
              {dateLabel}
            </p>
            <div className="w-10 h-[1.5px] bg-black/30 mt-3 rounded-full opacity-50" />
          </div>
          
          {/* Subtle Brushed Metal Texture */}
          <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/brushed-alum.png')]" />
        </div>
      </motion.div>
    </div>
  );
}

function BadgeModal({ 
  milestone, 
  onClose 
}: { 
  milestone: any; 
  onClose: () => void 
}) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.5, rotateY: -45 }}
        animate={{ scale: 1, rotateY: 0 }}
        exit={{ scale: 0.5, opacity: 0 }}
        className="relative flex flex-col items-center gap-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          className="cursor-pointer"
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <KBadge 
            milestoneKey={milestone.milestone_key} 
            size={240} 
            isFlipped={isFlipped}
            dateLabel={format(new Date(milestone.earned_at), 'MMMM do, yyyy')}
            achievementLabel={milestone.label}
          />
        </div>

        <div className="text-center text-white/50 animate-pulse">
          <p className="text-xs font-bold uppercase tracking-widest">
            Tap to Flip
          </p>
        </div>

        <button
          onClick={onClose}
          className="mt-4 px-6 py-2 rounded-full bg-white/10 text-white font-bold uppercase tracking-wider text-xs border border-white/20"
        >
          Done
        </button>
      </motion.div>
    </motion.div>
  );
}

const DAILY_GOAL = 600;
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const didAnimate = useRef(false);

  useEffect(() => {
    if (target <= 0) {
      setValue(0);
      return;
    }
    if (didAnimate.current) {
      setValue(target);
      return;
    }
    didAnimate.current = true;

    let raf: number;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [selectedMilestone, setSelectedMilestone] = useState<any>(null);
  const { data: todayData, isLoading: logsLoading } = useTodayScore();
  const todayScore = todayData?.score ?? 0;
  const todaySessions = todayData?.sessions ?? 0;
  const exercises = todayData?.exercises ?? [];
  const { data: leaderboardWeek = [] } = useLeaderboard('week');
  const myRank = useMemo(() => {
    if (!user) return 0;
    const i = leaderboardWeek.findIndex((e) => e.user_id === user.id);
    return i >= 0 ? i + 1 : 0;
  }, [leaderboardWeek, user]);

  const { tier, totalScore } = useTier();
  const { data: streak = 0 } = useStreak();
  const suggestions = useGoalSuggestions();
  const { data: recentMilestones = [], isLoading: milestonesLoading } = useUserMilestoneUnlocks(8);

  const now = useMemo(() => new Date(), []);
  const lastWeekStart = useMemo(
    () => startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }),
    [now],
  );
  const lastWeekEnd = useMemo(
    () => endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }),
    [now],
  );

  const { data: thisWeekLogs = [] } = useWorkoutLogs('week');
  const { data: lastWeekLogs = [] } = useWorkoutLogs(
    'custom',
    lastWeekStart,
    lastWeekEnd,
  );

  const ringPct = Math.min(1, todayScore / DAILY_GOAL);
  const animatedScore = useCountUp(todayScore);
  const todayIdx = (now.getDay() + 6) % 7;

  const thisWeekScores = useMemo(() => {
    const s = [0, 0, 0, 0, 0, 0, 0];
    for (const l of thisWeekLogs) {
      const idx = (new Date(l.logged_at).getDay() + 6) % 7;
      s[idx] += l.session_score || 0;
    }
    return s;
  }, [thisWeekLogs]);

  const lastWeekScores = useMemo(() => {
    const s = [0, 0, 0, 0, 0, 0, 0];
    for (const l of lastWeekLogs) {
      const idx = (new Date(l.logged_at).getDay() + 6) % 7;
      s[idx] += l.session_score || 0;
    }
    return s;
  }, [lastWeekLogs]);

  const thisWeekTotal = thisWeekScores.reduce((a, b) => a + b, 0);
  const lastWeekTotal = lastWeekScores.reduce((a, b) => a + b, 0);
  const weekDelta =
    lastWeekTotal > 0
      ? Math.round(((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100)
      : 0;
  const barMax = Math.max(...thisWeekScores, ...lastWeekScores, 1);

  const dateLabel = format(now, 'EEEE, MMM d');

  return (
    <AppShell>
      <div className="space-y-7 pt-1 pb-4" data-testid="uat-dashboard-pulse">
        {/* ── Eyebrow ── */}
        <KEyebrow>Today &middot; {dateLabel}</KEyebrow>

        {/* ── Hero ring card (Integrated Status Hub) ── */}
        <KCard pad={22} className="relative overflow-hidden">
          {/* Dynamic background glow based on tier color */}
          <div
            className="absolute pointer-events-none rounded-full opacity-60"
            style={{
              top: -40,
              right: -40,
              width: 220,
              height: 220,
              background: `radial-gradient(circle, ${tier.color}44 0%, transparent 70%)`,
            }}
          />

          <div className="flex items-center gap-[18px] relative pb-10">
            <div className="relative shrink-0">
              <KRing pct={ringPct} size={138} stroke={12} color={K.green}>
                <div className="text-center">
                  <div
                    className="font-display font-black italic text-k-ink leading-none"
                    style={{ fontSize: 38, letterSpacing: -1 }}
                  >
                    {animatedScore}
                  </div>
                  <div
                    className="text-k-muted font-semibold uppercase"
                    style={{ fontSize: 10, letterSpacing: 1.2, marginTop: 4 }}
                  >
                    of {DAILY_GOAL} pts
                  </div>
                </div>
              </KRing>
            </div>

            <div className="flex-1 min-w-0">
              <div
                className="text-k-muted font-bold uppercase"
                style={{ fontSize: 10, letterSpacing: 1.8 }}
              >
                Today&apos;s effort
              </div>

              <KDisplay size={24} className="mt-1 mb-[12px]">
                {todayScore >= DAILY_GOAL ? "GOAL REACHED" : "KEEP GOING"}
              </KDisplay>

              <div className="flex flex-col gap-3">
                {/* Stats Row */}
                <div className="flex gap-[16px]">
                  <div>
                    <div
                      className="text-k-muted font-bold uppercase"
                      style={{ fontSize: 10, letterSpacing: 1 }}
                    >
                      Streak
                    </div>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <IcFlame size={14} color={K.danger} />
                      <span
                        className="font-display font-extrabold italic text-k-ink"
                        style={{ fontSize: 20 }}
                      >
                        {streak}
                      </span>
                      <span
                        className="text-k-muted font-semibold"
                        style={{ fontSize: 11 }}
                      >
                        wk
                      </span>
                    </div>
                  </div>

                  <div
                    className="self-stretch w-px"
                    style={{ background: K.line }}
                  />

                  <div>
                    <div
                      className="text-k-muted font-bold uppercase"
                      style={{ fontSize: 10, letterSpacing: 1 }}
                    >
                      Rank
                    </div>
                    <div
                      className="font-display font-extrabold italic mt-0.5"
                      style={{ fontSize: 20, color: K.greenDeep }}
                    >
                      {myRank > 0 ? `#${myRank}` : '—'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Status Footer (Edge-to-Edge) ── */}
          <div className="absolute bottom-0 left-0 right-0 bg-k-ink/[0.02] pt-2">
             <div className="flex justify-between items-end px-5 mb-2">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-k-muted-soft uppercase tracking-widest opacity-60">Status</span>
                  <span className="text-[10px] font-black italic uppercase" style={{ color: tier.color }}>{tier.name} &middot; {totalScore.toLocaleString()} pts</span>
                </div>
                {tier.next && (
                  <div className="text-right">
                    <span className="text-[8px] font-black text-k-muted-soft uppercase tracking-widest opacity-60">Next Tier</span>
                    <span className="block text-[10px] font-bold text-k-ink uppercase">{tier.next.name}</span>
                  </div>
                )}
             </div>
             <div className="h-[4px] w-full bg-k-line-strong/30 overflow-hidden">
                <div 
                  className="h-full transition-all duration-1000 ease-out"
                  style={{ 
                    width: `${Math.round(tier.pct * 100)}%`,
                    background: tier.color,
                    boxShadow: `0 0 10px ${tier.color}AA`
                  }}
                />
             </div>
          </div>
        </KCard>

        {/* ── Logged today ── */}
        <div>
          <div className="flex justify-between items-baseline mb-3">
            <div>
              <KEyebrow>Logged today</KEyebrow>
              <KDisplay size={22} className="mt-1">
                {todaySessions} SESSION{todaySessions !== 1 ? 'S' : ''}
              </KDisplay>
            </div>
            <Link
              href="/log"
              className="flex items-center gap-1.5 text-white font-bold uppercase no-underline"
              style={{
                background: K.green,
                borderRadius: K.r.pill,
                padding: '8px 14px',
                fontSize: 11,
                letterSpacing: 0.6,
                boxShadow: '0 4px 10px rgba(31,179,122,0.3)',
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> LOG
            </Link>
          </div>

          <div className="flex flex-col gap-[10px]">
            {exercises.map((ex) => {
              const Icon = EXERCISE_ICON_MAP[ex.slug];
              const hasMultipleSessions = ex.sessions.length > 1;

              return (
                <KCard key={ex.slug} pad={14}>
                  <div className="flex items-center gap-[14px]">
                    <div
                      className="flex-shrink-0 flex items-center justify-center"
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: K.mintSoft,
                      }}
                    >
                      {Icon ? (
                        <Icon size={26} color={K.greenDeep} />
                      ) : null}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div
                        className="text-k-muted font-bold uppercase"
                        style={{ fontSize: 10, letterSpacing: 1 }}
                      >
                        {ex.name}
                      </div>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span
                          className="font-display font-black italic text-k-ink"
                          style={{ fontSize: 22, letterSpacing: -0.5 }}
                        >
                          {ex.unit === 'sec'
                            ? `${Math.floor(ex.value / 60)}:${String(
                                ex.value % 60,
                              ).padStart(2, '0')}`
                            : ex.value}
                        </span>
                        <span
                          className="text-k-muted font-semibold"
                          style={{ fontSize: 12 }}
                        >
                          {ex.unit}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className="text-k-muted font-bold uppercase"
                        style={{ fontSize: 9, letterSpacing: 1 }}
                      >
                        Points
                      </div>
                      <div
                        className="font-display font-black italic"
                        style={{
                          fontSize: 18,
                          color: K.greenDeep,
                          letterSpacing: -0.3,
                          marginTop: 2,
                        }}
                      >
                        {ex.score}
                      </div>
                    </div>
                  </div>

                  {/* ── Individual Session Breakdown ── */}
                  {hasMultipleSessions && (
                    <div
                      className="mt-3 pt-3 border-t space-y-2.5"
                      style={{ borderColor: K.line }}
                    >
                      {ex.sessions.map((session, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center"
                          style={{ paddingLeft: 58 }}
                        >
                          <div
                            className="text-k-muted font-bold uppercase"
                            style={{ fontSize: 9, letterSpacing: 1 }}
                          >
                            Session {idx + 1}
                          </div>
                          <div
                            className="font-display font-black italic"
                            style={{ fontSize: 13, color: K.ink }}
                          >
                            <span style={{ color: K.ink }}>{session.value}</span>
                            <span
                              className="mx-1.5 opacity-30 font-bold"
                              style={{ color: K.ink }}
                            >
                              /
                            </span>
                            <span style={{ color: K.greenDeep }}>
                              {Math.round(session.score)} pts
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </KCard>
              );
            })}
          </div>
        </div>

        {/* ── Weekly bar chart ── */}
        <div>
          <div className="flex justify-between items-baseline mb-3">
            <div>
              <KEyebrow>This week</KEyebrow>
              <KDisplay size={22} className="mt-1">
                {thisWeekTotal.toLocaleString()} PTS
              </KDisplay>
            </div>
            {weekDelta !== 0 && (
              <div className="flex items-center gap-1">
                <IcSparkle size={12} color={K.greenDeep} />
                <span
                  className="font-bold"
                  style={{
                    fontSize: 11,
                    color: K.greenDeep,
                    letterSpacing: 0.4,
                  }}
                >
                  {weekDelta > 0 ? '+' : ''}
                  {weekDelta}% vs last
                </span>
              </div>
            )}
          </div>

          <KCard pad={18}>
            <div
              className="flex items-end"
              style={{ gap: 10, height: 120 }}
            >
              {thisWeekScores.map((v, i) => {
                const last = lastWeekScores[i];
                const isToday = i === todayIdx;
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div
                      className="font-bold"
                      style={{
                        fontSize: 9,
                        height: 12,
                        letterSpacing: 0.5,
                        color: isToday ? K.greenDeep : K.mutedSoft,
                      }}
                    >
                      {v > 0 ? v : ''}
                    </div>
                    <div
                      className="flex-1 w-full flex items-end justify-center"
                      style={{ gap: 2 }}
                    >
                      <div
                        style={{
                          width: 6,
                          height: `${(last / barMax) * 100}%`,
                          background: K.lineStrong,
                          borderRadius: 3,
                          minHeight: last > 0 ? 3 : 0,
                        }}
                      />
                      <div
                        style={{
                          width: 14,
                          height: `${(v / barMax) * 100}%`,
                          background: isToday ? K.green : K.greenDeep,
                          borderRadius: 4,
                          minHeight: v > 0 ? 3 : 0,
                          opacity: v === 0 ? 0.2 : 1,
                          boxShadow: isToday
                            ? `0 0 12px ${K.green}88`
                            : 'none',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex" style={{ gap: 10, marginTop: 8 }}>
              {DAY_LABELS.map((d, i) => (
                <div
                  key={d}
                  className="flex-1 text-center uppercase"
                  style={{
                    fontSize: 10,
                    letterSpacing: 0.5,
                    color: i === todayIdx ? K.greenDeep : K.mutedSoft,
                    fontWeight: i === todayIdx ? 700 : 500,
                  }}
                >
                  {d}
                </div>
              ))}
            </div>

            <div
              className="flex"
              style={{
                gap: 14,
                marginTop: 12,
                paddingTop: 12,
                borderTop: `1px solid ${K.line}`,
              }}
            >
              <div className="flex items-center gap-1.5">
                <div
                  style={{
                    width: 10,
                    height: 10,
                    background: K.greenDeep,
                    borderRadius: 2,
                  }}
                />
                <span
                  className="text-k-muted font-semibold"
                  style={{ fontSize: 10, letterSpacing: 0.4 }}
                >
                  This week
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div
                  style={{
                    width: 10,
                    height: 10,
                    background: K.lineStrong,
                    borderRadius: 2,
                  }}
                />
                <span
                  className="text-k-muted font-semibold"
                  style={{ fontSize: 10, letterSpacing: 0.4 }}
                >
                  Last week
                </span>
              </div>
            </div>
          </KCard>
        </div>

        {/* ── Milestones (personal) ── */}
        <div>
          <div className="flex justify-between items-baseline mb-3 gap-2">
            <div>
              <KEyebrow>Milestones</KEyebrow>
              <KDisplay size={20} className="mt-1">
                YOUR BADGES
              </KDisplay>
            </div>
            <Link
              href="/profile"
              className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 no-underline"
            >
              Profile
            </Link>
          </div>
          {milestonesLoading ? (
            <KCard pad={14}>
              <div className="h-14 rounded-k-md bg-k-elevated/80 animate-pulse" />
            </KCard>
          ) : recentMilestones.length === 0 ? (
            <KCard pad={16}>
              <p className="text-[12px] text-k-muted-soft leading-snug">
                Keep logging — lifetime milestones unlock as your totals grow. You&apos;ll get a notification when you earn one.
              </p>
            </KCard>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-0.5 px-0.5">
              {recentMilestones.map((m) => (
                <KCard 
                  key={m.id} 
                  pad={12} 
                  className="min-w-[148px] max-w-[180px] shrink-0 cursor-pointer active:scale-95 transition-transform"
                  onClick={() => setSelectedMilestone(m)}
                >
                  <div className="flex items-center justify-center p-1" aria-hidden>
                    <KBadge milestoneKey={m.milestone_key} size={54} />
                  </div>
                  <p className="text-[11px] font-bold text-k-ink mt-2 leading-tight line-clamp-3">{m.label}</p>
                  <p className="text-[9px] font-semibold text-k-muted-soft mt-1 uppercase tracking-wide">
                    {format(new Date(m.earned_at), 'MMM d, yyyy')}
                  </p>
                </KCard>
              ))}
            </div>
          )}
        </div>


        {/* ── Insights ── */}
        <div>
          <KEyebrow>Insights</KEyebrow>

          <div className="flex flex-col gap-[10px] mt-[10px]">
            {suggestions.length > 0 ? (
              suggestions.slice(0, 2).map((s, i) => (
                <KCard key={i} pad={14}>
                  <div className="flex items-start gap-3">
                    <div
                      className="flex-shrink-0 flex items-center justify-center"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: i === 0 ? K.mintSoft : '#FCF3E4',
                      }}
                    >
                      {i === 0 ? (
                        <IcSparkle size={14} color={K.greenDeep} />
                      ) : (
                        <IcFlame size={14} color="#D38B2A" />
                      )}
                    </div>
                    <div
                      className="text-k-ink leading-relaxed"
                      style={{ fontSize: 13 }}
                    >
                      {s.reason}
                    </div>
                  </div>
                </KCard>
              ))
            ) : (
              <>
                <KCard pad={14}>
                  <div className="flex items-start gap-3">
                    <div
                      className="flex-shrink-0 flex items-center justify-center"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: K.mintSoft,
                      }}
                    >
                      <IcSparkle size={14} color={K.greenDeep} />
                    </div>
                    <div
                      className="text-k-ink leading-relaxed"
                      style={{ fontSize: 13 }}
                    >
                      Log your first workout today to unlock personal
                      insights and track your progress.
                    </div>
                  </div>
                </KCard>
                <KCard pad={14}>
                  <div className="flex items-start gap-3">
                    <div
                      className="flex-shrink-0 flex items-center justify-center"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: '#FCF3E4',
                      }}
                    >
                      <IcFlame size={14} color="#D38B2A" />
                    </div>
                    <div
                      className="text-k-ink leading-relaxed"
                      style={{ fontSize: 13 }}
                    >
                      Build a weekly streak to climb the ranks and
                      unlock new tiers.
                    </div>
                  </div>
                </KCard>
              </>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedMilestone && (
          <BadgeModal 
            milestone={selectedMilestone} 
            onClose={() => setSelectedMilestone(null)} 
          />
        )}
      </AnimatePresence>
    </AppShell>
  );
}
