'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { clearScoreRevealPayload, readScoreRevealPayload, type ScoreRevealPayload } from '@/lib/score-reveal';

function useCountUp(target: number, durationMs: number, run: boolean) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (target <= 0) {
      setV(0);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const u = Math.min(1, (now - t0) / durationMs);
      const eased = 1 - (1 - u) ** 3;
      setV(Math.round(target * eased));
      if (u < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, run]);
  return v;
}

export default function ScoreRevealPage() {
  const router = useRouter();
  const [payload, setPayload] = useState<ScoreRevealPayload | null | undefined>(undefined);
  const [phase, setPhase] = useState<'enter' | 'done'>('enter');

  useEffect(() => {
    setPayload(readScoreRevealPayload());
  }, []);

  useEffect(() => {
    if (payload === undefined || payload === null) return;
    const t = setTimeout(() => setPhase('done'), 1600);
    return () => clearTimeout(t);
  }, [payload]);

  const displayPts = useCountUp(payload?.totalPts ?? 0, 1400, payload != null && payload !== undefined);

  const rankHint = useMemo(() => {
    if (!payload) return '';
    const { prevRank, nextRank } = payload;
    if (!nextRank) return 'Weekly board · keep logging to place.';
    if (!prevRank || prevRank === nextRank) return `You are #${nextRank} this week.`;
    if (nextRank < prevRank) return `You moved up to #${nextRank} (was #${prevRank}).`;
    return `You are #${nextRank} this week (was #${prevRank}).`;
  }, [payload]);

  const onContinue = () => {
    clearScoreRevealPayload();
    router.replace('/dashboard');
  };

  if (payload === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh">
        <div className="h-10 w-10 rounded-full border-2 border-white/20 border-t-emerald-400 animate-spin" />
      </div>
    );
  }

  if (payload === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh px-6 text-center gap-6">
        <p className="text-sm text-white/55">Nothing to reveal — open this screen right after you submit a log.</p>
        <button
          type="button"
          onClick={() => router.replace('/dashboard')}
          className="text-sm font-bold text-emerald-400"
        >
          Back to Pulse
        </button>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh flex flex-col items-center justify-center px-6 pb-16 pt-12 overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            'radial-gradient(ellipse 80% 55% at 50% 18%, rgba(31,179,122,0.35), transparent 55%), radial-gradient(ellipse 60% 45% at 80% 80%, rgba(31,179,122,0.12), transparent 50%), #050506',
        }}
      />

      <AnimatePresence>
        <motion.div
          key="card"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="relative z-10 w-full max-w-sm text-center"
        >
          {payload.headline && (
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[11px] font-black tracking-[0.35em] uppercase text-emerald-400 mb-3"
            >
              {payload.headline}
            </motion.p>
          )}
          <p className="text-[11px] font-semibold tracking-[0.25em] uppercase text-white/45 mb-2">Session score</p>
          <div className="font-display text-[clamp(3.5rem,18vw,5.5rem)] leading-none text-white tabular-nums">
            {displayPts}
          </div>
          <p className="text-sm text-white/40 mt-2 font-medium">points from this log&apos;s core lifts</p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === 'done' ? 1 : 0.4 }}
            transition={{ delay: 0.45 }}
            className="mt-10 space-y-3 text-left rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 backdrop-blur-md"
          >
            <div className="flex justify-between gap-3 text-[13px]">
              <span className="text-white/50">Streak</span>
              <span className="font-bold text-white tabular-nums">
                {payload.streak} day{payload.streak === 1 ? '' : 's'}
              </span>
            </div>
            <div className="h-px bg-white/10" />
            <p className="text-[12px] text-white/65 leading-snug">{rankHint}</p>
            {payload.flexExtras ? (
              <p className="text-[11px] text-emerald-300/90 font-semibold">
                +{payload.flexExtras} flex move{payload.flexExtras === 1 ? '' : 's'} also saved
              </p>
            ) : null}
          </motion.div>

          <motion.button
            type="button"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            onClick={onContinue}
            className="mt-12 w-full py-4 rounded-2xl font-black text-sm tracking-widest uppercase text-black bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_8px_28px_rgba(31,179,122,0.45)]"
          >
            Continue
          </motion.button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
