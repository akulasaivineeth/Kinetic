'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AppShell } from '@/components/layout/app-shell';
import { KCard, KEyebrow, KDisplay, KPill } from '@/components/ui/k-primitives';
import { IcBack } from '@/components/ui/k-icons';
import { useGoals, useUpdateGoals } from '@/hooks/use-goals';
import { useQueryClient } from '@tanstack/react-query';
import type { PerformanceGoals } from '@/types/database';

type GoalMode = 'weekly' | 'peak';

const WEEKLY_FIELDS = [
  { label: 'Push-ups', key: 'pushup_weekly_goal' as const, suffix: 'reps' },
  { label: 'Squats', key: 'squat_weekly_goal' as const, suffix: 'reps' },
  { label: 'Plank', key: 'plank_weekly_goal' as const, suffix: 'sec' },
  { label: 'Run', key: 'run_weekly_goal' as const, suffix: 'km' },
] as const;

const PEAK_FIELDS = [
  { label: 'Push-ups', key: 'pushup_peak_goal' as const, suffix: 'reps' },
  { label: 'Squats', key: 'squat_peak_goal' as const, suffix: 'reps' },
  { label: 'Plank', key: 'plank_peak_goal' as const, suffix: 'sec' },
  { label: 'Run', key: 'run_peak_goal' as const, suffix: 'km' },
] as const;

export default function ProfileGoalsPage() {
  const { data: goals } = useGoals();
  const updateGoals = useUpdateGoals();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<GoalMode>('weekly');
  const [goalDraft, setGoalDraft] = useState<Record<string, number>>({});
  const [goalsSaved, setGoalsSaved] = useState(false);
  const [goalsSaving, setGoalsSaving] = useState(false);

  useEffect(() => {
    if (goals && Object.keys(goalDraft).length === 0) {
      setGoalDraft({
        pushup_weekly_goal: goals.pushup_weekly_goal,
        plank_weekly_goal: goals.plank_weekly_goal,
        run_weekly_goal: goals.run_weekly_goal,
        squat_weekly_goal: goals.squat_weekly_goal,
        pushup_peak_goal: goals.pushup_peak_goal,
        plank_peak_goal: goals.plank_peak_goal,
        run_peak_goal: goals.run_peak_goal,
        squat_peak_goal: goals.squat_peak_goal,
      });
    }
  }, [goals, goalDraft]);

  const handleSave = async () => {
    if (!goals) return;
    setGoalsSaving(true);
    setGoalsSaved(false);
    try {
      await updateGoals.mutateAsync(goalDraft as Partial<PerformanceGoals>);
      queryClient.invalidateQueries({ queryKey: ['weekly-volume'] });
      queryClient.invalidateQueries({ queryKey: ['stamina'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setGoalsSaved(true);
      setTimeout(() => setGoalsSaved(false), 2500);
    } catch (e) {
      console.error(e);
    } finally {
      setGoalsSaving(false);
    }
  };

  const goalsDirty =
    goals &&
    Object.keys(goalDraft).length > 0 &&
    Object.entries(goalDraft).some(([key, val]) => val !== (goals as Record<string, unknown>)[key]);

  const fields = mode === 'weekly' ? WEEKLY_FIELDS : PEAK_FIELDS;

  return (
    <AppShell>
      <div className="space-y-6 pt-1 pb-28">
        <Link
          href="/profile"
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-k-muted-soft hover:text-k-ink no-underline"
        >
          <IcBack size={18} /> Profile
        </Link>

        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
          <KEyebrow>Targets</KEyebrow>
          <KDisplay size={28} className="mt-1">
            Performance goals
          </KDisplay>
          <p className="text-[13px] text-k-muted-soft mt-2 max-w-[320px] leading-snug">
            Weekly totals and single-session peaks used for streak hints and progress rings.
          </p>
        </motion.div>

        <div className="flex flex-wrap gap-2">
          <KPill size="sm" active={mode === 'weekly'} onClick={() => setMode('weekly')}>
            Weekly volume
          </KPill>
          <KPill size="sm" active={mode === 'peak'} onClick={() => setMode('peak')}>
            Peak session
          </KPill>
        </div>

        <KCard
          hi
          pad={18}
          className="border border-white/[0.06] bg-k-card/85 shadow-[0_12px_40px_rgba(0,0,0,0.14)] backdrop-blur-xl dark:bg-k-card/55"
        >
          <div className="space-y-3">
            {fields.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between gap-3 rounded-k-md border border-k-line-strong/60 bg-k-elevated/50 px-3 py-2.5"
              >
                <span className="text-[12px] font-semibold text-k-ink">{item.label}</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={goalDraft[item.key] ?? ''}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!Number.isNaN(v)) setGoalDraft((prev) => ({ ...prev, [item.key]: v }));
                      else if (e.target.value === '') setGoalDraft((prev) => ({ ...prev, [item.key]: 0 }));
                    }}
                    onWheel={(e) => (e.target as HTMLElement).blur()}
                    className="w-20 rounded-k-sm border border-k-line-strong bg-k-bg px-2 py-1.5 text-right text-sm font-bold text-k-ink outline-none focus:border-emerald-500/45"
                  />
                  <span className="text-[10px] font-semibold text-k-muted-soft w-8">{item.suffix}</span>
                </div>
              </div>
            ))}
          </div>

          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={goalsSaving || !goalsDirty}
            className={`mt-5 w-full rounded-k-md py-3.5 text-[11px] font-black tracking-widest uppercase transition-all ${
              goalsSaved
                ? 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-500'
                : goalsDirty
                  ? 'emerald-gradient text-black shadow-lg shadow-emerald-500/25'
                  : 'cursor-not-allowed border border-k-line-strong bg-k-elevated text-k-muted-soft'
            }`}
          >
            {goalsSaving ? 'Saving…' : goalsSaved ? 'Saved' : goalsDirty ? 'Save goals' : 'No changes'}
          </motion.button>
        </KCard>
      </div>
    </AppShell>
  );
}
