'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { AppShell } from '@/components/layout/app-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { useAuth } from '@/providers/auth-provider';
import { useSaveDraft, useSubmitLog } from '@/hooks/use-workout-logs';
import { useRouter } from 'next/navigation';
import { Dumbbell, Timer, Route, Target } from 'lucide-react';

export default function BaselinePage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const saveDraft = useSaveDraft();
  const submitLog = useSubmitLog();

  const [pushupMax, setPushupMax] = useState(0);
  const [plankMax, setPlankMax] = useState(0);
  const [runBest, setRunBest] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);

    try {
      const finalRun = profile?.unit_preference === 'imperial'
        ? Number((runBest * 1.60934).toFixed(3))
        : runBest;

      const saved = await saveDraft.mutateAsync({
        pushup_reps: pushupMax,
        plank_seconds: plankMax,
        run_distance: finalRun,
        notes: 'Baseline test — starting point for % improvement tracking',
      });

      if (saved?.id) {
        await submitLog.mutateAsync({
          logId: saved.id,
          pushup_reps: pushupMax,
          plank_seconds: plankMax,
          run_distance: finalRun,
          squat_reps: 0,
        });
      }

      localStorage.setItem('kinetic-baseline-done', 'true');
      setDone(true);
      setTimeout(() => router.push('/dashboard'), 2000);
    } catch (err) {
      console.error('Baseline submit failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const unitLabel = profile?.unit_preference === 'imperial' ? 'MI' : 'KM';

  return (
    <AppShell>
      <div className="max-w-md mx-auto px-6 space-y-6 pt-4 pb-32">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Target size={18} className="text-emerald-500" />
            <p className="text-[10px] font-semibold tracking-[0.2em] text-emerald-500 uppercase">BASELINE TEST</p>
          </div>
          <h2 className="text-2xl font-black">Set Your Starting Point</h2>
          <p className="text-xs text-dark-muted mt-2 leading-relaxed">
            Record your current max for each metric. This anchors your % improvement scoring — future progress is measured against these numbers.
          </p>
        </motion.div>

        <GlassCard delay={0.1}>
          <div className="flex items-center gap-2 mb-3">
            <Dumbbell size={16} className="text-emerald-500" />
            <p className="text-xs font-bold text-dark-text uppercase tracking-wider">MAX PUSH-UPS (one set)</p>
          </div>
          <input
            type="number"
            value={pushupMax || ''}
            onChange={(e) => setPushupMax(parseInt(e.target.value) || 0)}
            placeholder="0"
            className="w-full text-center text-5xl font-black bg-transparent text-dark-text placeholder-dark-text/20 outline-none py-3"
          />
          <p className="text-[10px] text-dark-muted text-center">How many push-ups can you do in one set before failure?</p>
        </GlassCard>

        <GlassCard delay={0.2}>
          <div className="flex items-center gap-2 mb-3">
            <Timer size={16} className="text-emerald-500" />
            <p className="text-xs font-bold text-dark-text uppercase tracking-wider">MAX PLANK HOLD (seconds)</p>
          </div>
          <input
            type="number"
            value={plankMax || ''}
            onChange={(e) => setPlankMax(parseInt(e.target.value) || 0)}
            placeholder="0"
            className="w-full text-center text-5xl font-black bg-transparent text-dark-text placeholder-dark-text/20 outline-none py-3"
          />
          <p className="text-[10px] text-dark-muted text-center">How long can you hold a plank before giving up?</p>
        </GlassCard>

        <GlassCard delay={0.3}>
          <div className="flex items-center gap-2 mb-3">
            <Route size={16} className="text-emerald-500" />
            <p className="text-xs font-bold text-dark-text uppercase tracking-wider">BEST RUN ({unitLabel})</p>
          </div>
          <input
            type="number"
            step="0.1"
            value={runBest || ''}
            onChange={(e) => setRunBest(parseFloat(e.target.value) || 0)}
            placeholder="0.0"
            className="w-full text-center text-5xl font-black bg-transparent text-dark-text placeholder-dark-text/20 outline-none py-3"
          />
          <p className="text-[10px] text-dark-muted text-center">Longest single run you can do right now?</p>
        </GlassCard>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSubmit}
          disabled={submitting || done}
          className="w-full py-4 rounded-2xl emerald-gradient font-black text-sm tracking-wider text-white flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {done ? 'BASELINE SET ✓' : submitting ? 'SAVING...' : 'LOCK IN BASELINE'}
        </motion.button>

        <p className="text-[9px] text-dark-muted text-center leading-relaxed">
          This is logged as your first workout. Your % improvement in the Arena will be measured from these numbers.
        </p>
      </div>
    </AppShell>
  );
}
