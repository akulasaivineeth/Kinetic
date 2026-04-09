'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { motion } from 'framer-motion';
import { AppShell } from '@/components/layout/app-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { useAuth } from '@/providers/auth-provider';
import { useGoals } from '@/hooks/use-goals';
import {
  useWeeklyVolume,
  useDraftLog,
  useSaveDraft,
  useSubmitLog,
  useRecentSubmittedLogs,
  useUpdateSubmittedLog,
} from '@/hooks/use-workout-logs';
import { formatPlankTime } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

export default function LogPageWrapper() {
  return (
    <Suspense fallback={<AppShell><div className="flex items-center justify-center pt-20"><div className="text-dark-muted text-sm">Loading...</div></div></AppShell>}>
      <LogPage />
    </Suspense>
  );
}

function LogPage() {
  const { user, profile } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: goals } = useGoals();
  const { data: weeklyVolume } = useWeeklyVolume();
  const { data: draft } = useDraftLog();
  const { data: recentLogs = [] } = useRecentSubmittedLogs();
  const saveDraft = useSaveDraft();
  const submitLog = useSubmitLog();
  const updateSubmittedLog = useUpdateSubmittedLog();

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
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editLogId, setEditLogId] = useState<string | null>(null);
  const [submitLabel, setSubmitLabel] = useState<'submit' | 'update'>('submit');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  // Whoop import fallback
  const handleWhoopImport = async () => {
    setIsImporting(true);
    setImportResult(null);
    try {
      const res = await fetch('/api/whoop/import');
      const data = await res.json();
      if (res.ok) {
        setImportResult(`Imported ${data.imported} workout${data.imported !== 1 ? 's' : ''}`);
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      } else {
        setImportResult(data.error || 'Import failed');
      }
    } catch {
      setImportResult('Network error');
    } finally {
      setIsImporting(false);
      setTimeout(() => setImportResult(null), 4000);
    }
  };

  // Load draft
  useEffect(() => {
    if (editLogId) return;
    if (draft) {
      setDraftId(draft.id);
      setPushupReps(draft.pushup_reps || 0);
      setPlankSeconds(draft.plank_seconds || 0);
      
      // Denormalize: KM to MI if user is in Imperial mode
      const km = Number(draft.run_distance) || 0;
      if (profile?.unit_preference === 'imperial') {
        setRunDistance(Number((km * 0.621371).toFixed(1)));
      } else {
        setRunDistance(km);
      }
      
      setNotes(draft.notes || '');
      setPhotoUrl(draft.photo_url || null);
    }
  }, [draft, profile?.unit_preference, editLogId]);

  // Auto-save draft
  const autoSave = useCallback(() => {
    if (!user) return;
    if (editLogId) return; // Never autosave as draft while editing a submitted log.
    // Normalize: MI to KM if user is in Imperial mode
    const finalRunDist = profile?.unit_preference === 'imperial' 
      ? Number((runDistance * 1.60934).toFixed(3)) 
      : runDistance;

    saveDraft.mutate({
      id: draftId || undefined,
      pushup_reps: pushupReps,
      plank_seconds: plankSeconds,
      run_distance: finalRunDist,
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
  }, [user, editLogId, profile?.unit_preference, draftId, pushupReps, plankSeconds, runDistance, notes, photoUrl, whoopActivity, whoopStrain, whoopDuration, saveDraft]);

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
    if (!user) return;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const finalRunDist = profile?.unit_preference === 'imperial'
        ? Number((runDistance * 1.60934).toFixed(3))
        : runDistance;

      if (editLogId) {
        await updateSubmittedLog.mutateAsync({
          logId: editLogId,
          patch: {
            pushup_reps: pushupReps,
            plank_seconds: plankSeconds,
            run_distance: finalRunDist,
            notes,
            photo_url: photoUrl,
          },
        });
        setSubmitted(true);
        setSubmitLabel('update');
        router.push('/dashboard');
        return;
      }

      let logId = draftId;

      // If no draft saved yet, save it now and get the ID
      if (!logId) {
        const saved = await saveDraft.mutateAsync({
          pushup_reps: pushupReps,
          plank_seconds: plankSeconds,
          run_distance: finalRunDist,
          notes,
          photo_url: photoUrl,
          whoop_activity_type: whoopActivity || undefined,
          whoop_strain: whoopStrain ? parseFloat(whoopStrain) : undefined,
          whoop_duration_seconds: whoopDuration ? parseInt(whoopDuration) * 60 : undefined,
        });
        logId = saved?.id;
        if (!logId) throw new Error('Failed to save draft');
      }

      await submitLog.mutateAsync(logId);
      setSubmitted(true);
      setSubmitLabel('submit');
      // Reset form
      setPushupReps(0);
      setPlankSeconds(0);
      setRunDistance(0);
      setNotes('');
      setPhotoUrl(null);
      setDraftId(null);
      // Navigate immediately — delayed push was often cleared by React Strict Mode unmount cleanup in dev
      router.push('/dashboard');
    } catch (err) {
      console.error('Submit failed:', err);
      setSubmitError(err instanceof Error ? err.message : 'Failed to save log');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditRecent = (logId: string) => {
    const target = recentLogs.find((r) => r.id === logId);
    if (!target) return;

    setEditLogId(target.id);
    setDraftId(null);
    setSubmitted(false);
    setSubmitError(null);

    setPushupReps(target.pushup_reps || 0);
    setPlankSeconds(target.plank_seconds || 0);
    const km = Number(target.run_distance) || 0;
    setRunDistance(
      profile?.unit_preference === 'imperial'
        ? Number((km * 0.621371).toFixed(1))
        : km
    );
    setNotes(target.notes || '');
    setPhotoUrl(target.photo_url || null);
  };

  // Computed values
  const totalPushups = (weeklyVolume?.total_pushups || 0) + pushupReps;
  const totalPlankSecs = (weeklyVolume?.total_plank_seconds || 0) + plankSeconds;
  const totalRunDist = Number(weeklyVolume?.total_run_distance || 0) + runDistance;
  const pushupGoal = goals?.pushup_weekly_goal || 500;
  const plankGoal = goals?.plank_weekly_goal || 600;
  const runGoal = goals?.run_weekly_goal || 20;

  const displayRunGoal = profile?.unit_preference === 'imperial' ? runGoal * 0.621371 : runGoal;
  const displayRunDist = profile?.unit_preference === 'imperial' ? totalRunDist * 0.621371 : totalRunDist;
  const unitLabel = profile?.unit_preference === 'imperial' ? 'MI' : 'KM';

  return (
    <AppShell>
      <div className="max-w-md mx-auto px-6 space-y-6 pt-2 pb-32">
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

        {/* Whoop Import Fallback */}
        {profile?.whoop_access_token && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleWhoopImport}
              disabled={isImporting}
              className="flex-1 px-4 py-2.5 rounded-xl bg-dark-elevated border border-dark-border text-xs font-bold tracking-wider text-dark-muted hover:text-emerald-500 hover:border-emerald-500/30 transition-all disabled:opacity-50"
            >
              {isImporting ? 'IMPORTING...' : '⌚ IMPORT RECENT WORKOUTS'}
            </button>
            {importResult && (
              <span className="text-xs font-semibold text-emerald-500 animate-fade-in">
                {importResult}
              </span>
            )}
          </div>
        )}

        {/* Weekly Volume Progress Bar */}
        <ProgressBar
          value={totalPushups}
          max={pushupGoal}
          label={`${pushupGoal} reps goal`}
          remaining={`${Math.max(pushupGoal - totalPushups, 0)} remaining`}
        />

        {/* Edit Submitted Logs */}
        <GlassCard className="space-y-2" delay={0.05}>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold tracking-[0.15em] text-dark-muted uppercase">
              EDIT SUBMITTED LOG
            </p>
            {editLogId && (
              <button
                onClick={() => {
                  setEditLogId(null);
                  setSubmitError(null);
                }}
                className="text-[10px] font-bold text-emerald-500"
              >
                CANCEL EDIT
              </button>
            )}
          </div>
          {recentLogs.length === 0 ? (
            <p className="text-xs text-dark-muted">No submitted logs yet.</p>
          ) : (
            <div className="space-y-2">
              {recentLogs.slice(0, 4).map((log) => (
                <button
                  key={log.id}
                  onClick={() => handleEditRecent(log.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl border text-xs transition-colors ${
                    editLogId === log.id
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                      : 'border-dark-border bg-dark-elevated text-dark-text'
                  }`}
                >
                  {format(new Date(log.logged_at), 'MMM d, p')} • {log.pushup_reps} reps • {formatPlankTime(log.plank_seconds)}
                </button>
              ))}
            </div>
          )}
        </GlassCard>

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
            data-testid="uat-log-pushup-reps"
            value={pushupReps || ''}
            onChange={(e) => setPushupReps(parseInt(e.target.value) || 0)}
            onWheel={(e) => (e.target as HTMLElement).blur()}
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
              onWheel={(e) => (e.target as HTMLElement).blur()}
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
              onWheel={(e) => (e.target as HTMLElement).blur()}
              placeholder="00"
              className="w-24 text-center text-6xl font-black bg-transparent text-dark-text/30 focus:text-dark-text placeholder-dark-text/20 outline-none transition-colors duration-200"
            />
          </div>
        </GlassCard>

        {/* Run Distance Card */}
        <GlassCard className="relative" delay={0.3}>
          <div className="flex justify-end mb-1">
            <span className="text-[10px] font-bold tracking-wider text-emerald-500 uppercase">
              {displayRunGoal.toFixed(1)}{unitLabel} GOAL • {Math.max(displayRunGoal - (profile?.unit_preference === 'imperial' ? totalRunDist * 0.621371 : totalRunDist), 0).toFixed(1)}{unitLabel} LEFT
            </span>
          </div>
          <p className="text-[11px] font-semibold tracking-[0.15em] text-dark-muted text-center uppercase mb-3">
            RUN DISTANCE ({unitLabel})
          </p>
          <input
            type="number"
            step="0.1"
            value={runDistance || ''}
            onChange={(e) => setRunDistance(parseFloat(e.target.value) || 0)}
            onWheel={(e) => (e.target as HTMLElement).blur()}
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
            <>{submitLabel === 'update' ? 'UPDATED ✓' : 'SUBMITTED ✓'}</>
          ) : isSubmitting ? (
            <>{editLogId ? 'UPDATING...' : 'SUBMITTING...'}</>
          ) : (
            <>
              {editLogId ? 'UPDATE LOG' : 'SUBMIT TO ARENA'}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13" />
                <path d="M22 2L15 22L11 13L2 9L22 2Z" />
              </svg>
            </>
          )}
        </motion.button>
        {submitError && (
          <p className="text-xs text-red-400 font-semibold text-center">{submitError}</p>
        )}
      </div>
    </AppShell>
  );
}
