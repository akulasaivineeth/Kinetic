'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { AppShell } from '@/components/layout/app-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { useAuth } from '@/providers/auth-provider';
import { useGoals } from '@/hooks/use-goals';
import { useWeeklyVolume, useDraftLog, useSaveDraft, useSubmitLog } from '@/hooks/use-workout-logs';
import { formatPlankTime } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useSearchParams } from 'next/navigation';

export default function LogPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const { data: goals } = useGoals();
  const { data: weeklyVolume } = useWeeklyVolume();
  const { data: draft } = useDraftLog();
  const saveDraft = useSaveDraft();
  const submitLog = useSubmitLog();

  // Whoop prefill from notification
  const whoopActivity = searchParams.get('activity') || '';
  const whoopDuration = searchParams.get('duration') || '';
  const whoopStrain = searchParams.get('strain') || '';

  const [pushupReps, setPushupReps] = useState(0);
  const [plankSeconds, setPlankSeconds] = useState(0);
  const [runDistance, setRunDistance] = useState(0);
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  // Load draft
  useEffect(() => {
    if (draft) {
      setDraftId(draft.id);
      setPushupReps(draft.pushup_reps || 0);
      setPlankSeconds(draft.plank_seconds || 0);
      setRunDistance(Number(draft.run_distance) || 0);
      setNotes(draft.notes || '');
      setPhotoUrl(draft.photo_url || null);
    }
  }, [draft]);

  // Auto-save draft
  const autoSave = useCallback(() => {
    if (!user) return;
    saveDraft.mutate({
      id: draftId || undefined,
      pushup_reps: pushupReps,
      plank_seconds: plankSeconds,
      run_distance: runDistance,
      notes,
      photo_url: photoUrl,
      whoop_activity_type: whoopActivity || undefined,
      whoop_strain: whoopStrain ? parseFloat(whoopStrain) : undefined,
      whoop_duration_seconds: whoopDuration ? parseInt(whoopDuration) * 60 : undefined,
    }, {
      onSuccess: (data) => {
        if (data && !draftId) setDraftId(data.id);
      },
    });
  }, [user, draftId, pushupReps, plankSeconds, runDistance, notes, photoUrl, whoopActivity, whoopStrain, whoopDuration, saveDraft]);

  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(autoSave, 2000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [pushupReps, plankSeconds, runDistance, notes, autoSave]);

  // Photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const supabase = createClient();
    const fileName = `${user.id}/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from('workout-photos')
      .upload(fileName, file);

    if (!error && data) {
      const { data: urlData } = supabase.storage
        .from('workout-photos')
        .getPublicUrl(data.path);
      setPhotoUrl(urlData.publicUrl);
    }
  };

  // Submit
  const handleSubmit = async () => {
    if (!draftId) {
      // Save first
      autoSave();
      return;
    }
    setIsSubmitting(true);
    try {
      await submitLog.mutateAsync(draftId);
      setSubmitted(true);
      // Reset form
      setPushupReps(0);
      setPlankSeconds(0);
      setRunDistance(0);
      setNotes('');
      setPhotoUrl(null);
      setDraftId(null);
      setTimeout(() => setSubmitted(false), 3000);
    } catch {
      // Error handling
    } finally {
      setIsSubmitting(false);
    }
  };

  // Computed values
  const totalPushups = (weeklyVolume?.total_pushups || 0) + pushupReps;
  const totalPlankSecs = (weeklyVolume?.total_plank_seconds || 0) + plankSeconds;
  const totalRunDist = Number(weeklyVolume?.total_run_distance || 0) + runDistance;
  const pushupGoal = goals?.pushup_weekly_goal || 500;
  const plankGoal = goals?.plank_weekly_goal || 600;
  const runGoal = goals?.run_weekly_goal || 20;

  return (
    <AppShell>
      <div className="space-y-4 pt-2">
        {/* Current Session (Whoop prefill) */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <p className="text-[10px] font-semibold tracking-[0.2em] text-dark-muted uppercase">
            CURRENT SESSION
          </p>
          <h2 className="text-xl font-black mt-0.5">
            {whoopActivity || 'Strength Trainer'} • {whoopDuration || '42'} min •{' '}
            <span className="text-emerald-500 italic">
              Strain {whoopStrain || '15.3'}
            </span>
          </h2>
        </motion.div>

        {/* Weekly Volume Progress Bar */}
        <ProgressBar
          value={totalPushups}
          max={pushupGoal}
          label={`${pushupGoal} reps goal`}
          remaining={`${Math.max(pushupGoal - totalPushups, 0)} remaining`}
        />

        {/* Push-up Reps Card */}
        <GlassCard className="relative" delay={0.1}>
          <div className="flex justify-end mb-1">
            <span className="text-[10px] font-bold tracking-wider text-emerald-500">
              {pushupGoal} GOAL • {Math.max(pushupGoal - totalPushups, 0)} LEFT
            </span>
          </div>
          <p className="text-[11px] font-semibold tracking-[0.15em] text-dark-muted text-center uppercase mb-3">
            PUSH-UP REPS
          </p>
          <input
            type="number"
            value={pushupReps || ''}
            onChange={(e) => setPushupReps(parseInt(e.target.value) || 0)}
            placeholder="0"
            className="w-full text-center text-6xl font-black bg-transparent text-dark-text/30 focus:text-dark-text placeholder-dark-text/20 outline-none transition-colors duration-200 py-4"
          />
        </GlassCard>

        {/* Plank Seconds Card */}
        <GlassCard className="relative" delay={0.2}>
          <div className="flex justify-end mb-1">
            <span className="text-[10px] font-bold tracking-wider text-emerald-500">
              {formatPlankTime(plankGoal)} GOAL • {formatPlankTime(Math.max(plankGoal - totalPlankSecs, 0))} LEFT
            </span>
          </div>
          <p className="text-[11px] font-semibold tracking-[0.15em] text-dark-muted text-center uppercase mb-3">
            PLANK SECONDS
          </p>
          <div className="flex items-center justify-center gap-1">
            <input
              type="number"
              value={Math.floor(plankSeconds / 60) || ''}
              onChange={(e) => {
                const mins = parseInt(e.target.value) || 0;
                setPlankSeconds(mins * 60 + (plankSeconds % 60));
              }}
              placeholder="00"
              className="w-24 text-center text-6xl font-black bg-transparent text-dark-text/30 focus:text-dark-text placeholder-dark-text/20 outline-none transition-colors duration-200"
            />
            <span className="text-4xl font-black text-dark-text/20">:</span>
            <input
              type="number"
              value={plankSeconds % 60 || ''}
              onChange={(e) => {
                const secs = Math.min(parseInt(e.target.value) || 0, 59);
                setPlankSeconds(Math.floor(plankSeconds / 60) * 60 + secs);
              }}
              placeholder="00"
              className="w-24 text-center text-6xl font-black bg-transparent text-dark-text/30 focus:text-dark-text placeholder-dark-text/20 outline-none transition-colors duration-200"
            />
          </div>
        </GlassCard>

        {/* Run Distance Card */}
        <GlassCard className="relative" delay={0.3}>
          <div className="flex justify-end mb-1">
            <span className="text-[10px] font-bold tracking-wider text-emerald-500">
              {runGoal}KM GOAL • {Math.max(runGoal - totalRunDist, 0).toFixed(1)}KM LEFT
            </span>
          </div>
          <p className="text-[11px] font-semibold tracking-[0.15em] text-dark-muted text-center uppercase mb-3">
            RUN DISTANCE (KM)
          </p>
          <input
            type="number"
            step="0.1"
            value={runDistance || ''}
            onChange={(e) => setRunDistance(parseFloat(e.target.value) || 0)}
            placeholder="0.0"
            className="w-full text-center text-6xl font-black bg-transparent text-dark-text/30 focus:text-dark-text placeholder-dark-text/20 outline-none transition-colors duration-200 py-4"
          />
        </GlassCard>

        {/* Photo + Notes Row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Photo Upload */}
          <GlassCard
            className="flex flex-col items-center justify-center min-h-[120px] cursor-pointer"
            delay={0.4}
            onClick={() => fileInputRef.current?.click()}
          >
            {photoUrl ? (
              <div
                className="w-full h-full min-h-[100px] rounded-xl bg-cover bg-center relative"
                style={{ backgroundImage: `url(${photoUrl})` }}
              >
                <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                  <div className="text-center">
                    <span className="text-2xl">📷</span>
                    <p className="text-[10px] font-bold tracking-wider text-dark-text mt-1">
                      CHANGE PHOTO
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <span className="text-3xl">📷</span>
                <p className="text-[10px] font-bold tracking-wider text-dark-muted mt-2">
                  CHANGE PHOTO
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </GlassCard>

          {/* Notes */}
          <GlassCard className="min-h-[120px]" delay={0.4}>
            <p className="text-[11px] font-semibold tracking-wider text-dark-muted uppercase mb-2">
              NOTES
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did it feel?"
              className="w-full h-20 bg-transparent text-sm text-dark-text placeholder-dark-text/30 outline-none resize-none"
            />
          </GlassCard>
        </div>

        {/* Submit Button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSubmit}
          disabled={isSubmitting || submitted}
          className="w-full py-4 rounded-2xl emerald-gradient font-black text-sm tracking-wider text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-all duration-200"
        >
          {submitted ? (
            <>SUBMITTED ✓</>
          ) : isSubmitting ? (
            <>SUBMITTING...</>
          ) : (
            <>
              SUBMIT TO ARENA
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13" />
                <path d="M22 2L15 22L11 13L2 9L22 2Z" />
              </svg>
            </>
          )}
        </motion.button>
      </div>
    </AppShell>
  );
}
