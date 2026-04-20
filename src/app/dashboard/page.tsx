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
import { useAuth } from '@/providers/auth-provider';
import { K } from '@/lib/design-tokens';

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

export default function PulsePage() {
  const { user } = useAuth();
  const { data: leaderboardWeek = [] } = useLeaderboard('week');
  const myRank = useMemo(() => {
    if (!user) return 0;
    const i = leaderboardWeek.findIndex((e) => e.user_id === user.id);
    return i >= 0 ? i + 1 : 0;
  }, [leaderboardWeek, user]);

  const { data: today } = useTodayScore();
  const { tier, totalScore } = useTier();
  const { data: streak = 0 } = useStreak();
  const suggestions = useGoalSuggestions();

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

  const todayScore = today?.score ?? 0;
  const todaySessions = today?.sessions ?? 0;
  const exercises = today?.exercises ?? [];
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

        {/* ── Hero ring card ── */}
        <KCard pad={22} className="relative overflow-hidden">
          <div
            className="absolute pointer-events-none rounded-full opacity-70"
            style={{
              top: -40,
              right: -40,
              width: 180,
              height: 180,
              background: `radial-gradient(circle, ${K.mint} 0%, transparent 70%)`,
            }}
          />

          <div className="flex items-center gap-[18px] relative">
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

            <div className="flex-1 min-w-0">
              <div
                className="text-k-muted font-bold uppercase"
                style={{ fontSize: 10, letterSpacing: 1.8 }}
              >
                Today&apos;s effort
              </div>

              <KDisplay size={24} className="mt-1 mb-[10px]">
                KEEP
                <br />
                GOING
              </KDisplay>

              <div className="flex gap-[14px]">
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

        {/* ── Tier progress ── */}
        <div>
          <KEyebrow>Progression</KEyebrow>
          <KDisplay size={22} className="mt-1 mb-3">
            TIER UP
          </KDisplay>

          <KCard pad={18}>
            <div className="flex items-center gap-[14px] mb-[14px]">
              <div
                className="flex-shrink-0 flex items-center justify-center"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: `linear-gradient(135deg, ${tier.color}, ${tier.color}cc)`,
                  boxShadow: `0 4px 14px ${tier.color}66`,
                }}
              >
                <IcTrophy size={24} color="#fff" />
              </div>

              <div className="flex-1 min-w-0">
                <div
                  className="text-k-muted font-bold uppercase"
                  style={{ fontSize: 10, letterSpacing: 1.2 }}
                >
                  Current tier
                </div>
                <div
                  className="font-display font-black italic text-k-ink"
                  style={{ fontSize: 22, marginTop: 2 }}
                >
                  {tier.name.toUpperCase()}
                </div>
              </div>

              {tier.next && (
                <div className="text-right">
                  <div
                    className="text-k-muted font-bold uppercase"
                    style={{ fontSize: 10, letterSpacing: 1 }}
                  >
                    Next
                  </div>
                  <div
                    className="font-bold"
                    style={{
                      fontSize: 13,
                      color: tier.next.color,
                      marginTop: 2,
                    }}
                  >
                    {tier.next.name}
                  </div>
                </div>
              )}
            </div>

            <div
              style={{
                height: 6,
                borderRadius: 3,
                background: '#EFEFEF',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.round(tier.pct * 100)}%`,
                  background: `linear-gradient(90deg, ${tier.color}, ${tier.next?.color || tier.color})`,
                  borderRadius: 3,
                  transition: 'width 1s',
                }}
              />
            </div>

            <div
              className="flex justify-between text-k-muted"
              style={{ marginTop: 8, fontSize: 11 }}
            >
              <span>{totalScore.toLocaleString()} pts</span>
              {tier.next && (
                <span>{tier.next.min.toLocaleString()} pts</span>
              )}
            </div>
          </KCard>
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
    </AppShell>
  );
}
