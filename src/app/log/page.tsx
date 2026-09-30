'use client';

import { useState, useEffect, useCallback, useRef, Suspense, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppShell } from '@/components/layout/app-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { ExerciseStepperCard } from '@/components/log/exercise-stepper-card';
import { LogDayMetrics } from '@/components/log/log-day-metrics';
import { exerciseIcon } from '@/components/ui/k-icons';
import { useAuth } from '@/providers/auth-provider';
import { useLeaderboard } from '@/hooks/use-leaderboard';
import { useStreak } from '@/hooks/use-streak';
import { useGoals } from '@/hooks/use-goals';
import {
  useWeeklyVolume,
  useDraftLog,
  useSaveDraft,
  useSubmitLog,
  useUpdateSubmittedLog,
  useMonthLogs,
  dateToLogsMap,
} from '@/hooks/use-workout-logs';
import { formatPlankTime } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { format, isSameDay, startOfDay } from 'date-fns';
import { useAllTimeStats } from '@/hooks/use-alltime-stats';
import { checkNewMilestones, type Milestone } from '@/lib/milestones';
import { persistNewMilestoneUnlocks } from '@/lib/milestone-persistence';
import { calculateSessionScore } from '@/lib/scoring';
import { SCORE_REVEAL_STORAGE_KEY, type ScoreRevealPayload } from '@/lib/score-reveal';
import { fetchWeeklyVolumeRank } from '@/lib/weekly-rank';
import { DayPicker } from 'react-day-picker';

export default function LogPageWrapper() {
  return (
    <Suspense fallback={<AppShell><div className="flex items-center justify-center pt-20"><div className="text-dark-muted text-sm">Loading...</div></div></AppShell>}>
      <LogPage />
    </Suspense>
  );
}

function LogPage() {
  const { user, profile, isSessionRefreshing, waitForSession } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: goals } = useGoals();
  const { data: weeklyVolume } = useWeeklyVolume();
  const { data: draft } = useDraftLog();
  const saveDraft = useSaveDraft();
  const submitLog = useSubmitLog();
  const updateSubmittedLog = useUpdateSubmittedLog();
  const { data: allTimeStats } = useAllTimeStats();
  const { data: weeklyBoard = [] } = useLeaderboard('week', 'volume', 'raw');
  const { data: streakWeeks = 0 } = useStreak();

  // Whoop prefill from notification
  const whoopActivity = searchParams.get('activity') || '';
  const whoopDuration = searchParams.get('duration') || '';
  const whoopStrain = searchParams.get('strain') || '';
  const whoopDistanceKm = searchParams.get('distance_km') || '';

  const [pushupReps, setPushupReps] = useState(0);
  const [plankSeconds, setPlankSeconds] = useState(0);
  const [runDistance, setRunDistance] = useState(() => {
    if (!whoopDistanceKm) return 0;
    const km = parseFloat(whoopDistanceKm);
    if (isNaN(km)) return 0;
    return km;
  });
  const [squatReps, setSquatReps] = useState(0);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editLogId, setEditLogId] = useState<string | null>(null);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  // Calendar state
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const { data: monthLogs = [] } = useMonthLogs(calendarMonth);
  const logsMap = useMemo(() => dateToLogsMap(monthLogs), [monthLogs]);
  const currentDayLogs = useMemo(() => logsMap.get(format(selectedDate, 'yyyy-MM-dd')) || [], [logsMap, selectedDate]);

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
        // Pre-fill run distance from the most recent imported workout with distance data
        if (data.workouts?.length) {
          const withDistance = data.workouts.find((w: { distance_km: number | null }) => w.distance_km);
          if (withDistance?.distance_km) {
            const km = withDistance.distance_km;
            const display = profile?.unit_preference === 'imperial'
              ? Math.round(km * 0.621371 * 100) / 100
              : km;
            setRunDistance(display);
          }
        }
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

  // If the app is backgrounded while a submission is in-flight, the fetch will hang forever.
  // Reset the submitting state when the user returns so they can try again.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isSubmitting) {
        setIsSubmitting(false);
        setSubmitError('Submission was interrupted. Please try again.');
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isSubmitting]);

  // Load draft initially
  useEffect(() => {
    if (editLogId) return;
    if (draft) {
      setDraftId(draft.id);
      setPushupReps(draft.pushup_reps || 0);
      setPlankSeconds(draft.plank_seconds || 0);
      setSquatReps(draft.squat_reps || 0);

      const km = Number(draft.run_distance) || 0;
      if (profile?.unit_preference === 'imperial') {
        setRunDistance(Number((km * 0.621371).toFixed(1)));
      } else {
        setRunDistance(km);
      }
    }
  }, [draft, profile?.unit_preference, editLogId]);

  // Auto-save draft
  const autoSave = useCallback(() => {
    if (!user) return;
    if (editLogId) return;
    const finalRunDist = profile?.unit_preference === 'imperial'
      ? Number((runDistance * 1.60934).toFixed(3))
      : runDistance;

    saveDraft.mutate({
      id: draftId || undefined,
      pushup_reps: pushupReps,
      plank_seconds: plankSeconds,
      run_distance: finalRunDist,
      squat_reps: squatReps,
      logged_at: selectedDate.toISOString(),
      whoop_activity_type: whoopActivity || undefined,
      whoop_strain: whoopStrain ? parseFloat(whoopStrain) : undefined,
      whoop_duration_seconds: whoopDuration ? parseInt(whoopDuration) * 60 : undefined,
    }, {
      onSuccess: (data) => {
        if (data && !draftId) setDraftId(data.id);
      },
    });
  }, [user, editLogId, profile?.unit_preference, draftId, pushupReps, plankSeconds, runDistance, squatReps, selectedDate, whoopActivity, whoopStrain, whoopDuration, saveDraft]);

  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(autoSave, 2000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [pushupReps, plankSeconds, runDistance, squatReps, autoSave]);

  const handleDaySelect = (day: Date | undefined) => {
    if (!day) return;
    setSelectedDate(startOfDay(day));
    setSubmitted(false);
    setSubmitError(null);
    setEditLogId(null);
    // Clear out form to ready for a new log, but they can select a card below the calendar to edit
    setDraftId(null);
    setPushupReps(0);
    setPlankSeconds(0);
    setRunDistance(0);
    setSquatReps(0);
  };

  const handleEditLog = (logId: string) => {
    const target = monthLogs.find((r) => r.id === logId);
    if (!target) return;
    setEditLogId(target.id);
    setDraftId(null);
    setSubmitted(false);
    setSubmitError(null);
    setPushupReps(target.pushup_reps || 0);
    setPlankSeconds(target.plank_seconds || 0);
    setSquatReps(target.squat_reps || 0);
    const km = Number(target.run_distance) || 0;
    setRunDistance(
      profile?.unit_preference === 'imperial'
        ? Number((km * 0.621371).toFixed(1))
        : km
    );
  };

  const withTimeout = <T,>(promise: Promise<T>, ms: number, label = 'Request'): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`${label} timed out — please try again`)), ms)
      ),
    ]);
  };

  /** Ensure dashboard reads fresh RPC rows before client navigation (invalidation alone can race). */
  const refetchDashboardAfterLogChange = async () => {
    await queryClient.refetchQueries({ queryKey: ['weekly-volume'] });
    await queryClient.refetchQueries({ queryKey: ['workout-logs'] });
    await queryClient.refetchQueries({ queryKey: ['month-logs'] });
    await queryClient.refetchQueries({ queryKey: ['recent-workout-logs'] });
    await queryClient.refetchQueries({ queryKey: ['alltime-stats'] });
    await queryClient.refetchQueries({ queryKey: ['recent-weeks'] });
    await queryClient.refetchQueries({ queryKey: ['stamina'] });
    await queryClient.refetchQueries({ queryKey: ['leaderboard'] });
  };

  // Submit
  const handleSubmit = async () => {
    if (!user) return;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await waitForSession();

      const finalRunDist = profile?.unit_preference === 'imperial'
        ? Number((runDistance * 1.60934).toFixed(3))
        : runDistance;

      const prevRank = editLogId ? null : await fetchWeeklyVolumeRank(user.id);

      if (editLogId) {
        const oldLog = monthLogs.find((r) => r.id === editLogId);
        if (!oldLog) throw new Error('Could not load log to update');

        await withTimeout(
          updateSubmittedLog.mutateAsync({
            logId: editLogId,
            patch: {
              pushup_reps: pushupReps,
              plank_seconds: plankSeconds,
              run_distance: finalRunDist,
              squat_reps: squatReps,
            },
          }),
          15000,
          'Update'
        );

        let crossed: Milestone[] = [];
        if (allTimeStats) {
          const oldPush = oldLog.pushup_reps || 0;
          const oldPlank = oldLog.plank_seconds || 0;
          const oldRun = Number(oldLog.run_distance) || 0;
          const oldSquat = oldLog.squat_reps || 0;
          crossed = checkNewMilestones(
            allTimeStats.totalPushups,
            allTimeStats.totalPlankSeconds,
            allTimeStats.totalRunDistance,
            allTimeStats.totalPushups - oldPush + pushupReps,
            allTimeStats.totalPlankSeconds - oldPlank + plankSeconds,
            allTimeStats.totalRunDistance - oldRun + finalRunDist,
            allTimeStats.totalSquats,
            allTimeStats.totalSquats - oldSquat + squatReps
          );
          if (crossed.length > 0) {
            await persistNewMilestoneUnlocks(createClient(), user.id, crossed);
          }
        }

        setSubmitted(true);
        await refetchDashboardAfterLogChange();
        router.push('/dashboard');
        return;
      } // end edit flow

      // Cancel pending debounced autosave so it cannot overwrite this row after we flush.
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = null;
      }

      // Always flush draft first (logged_at / whoop / id). Previously, when draftId existed we skipped
      // save and submitted whatever the last 2s autosave wrote — classic stale dashboard / wrong totals.
      const flushPayload = {
        id: draftId || undefined,
        pushup_reps: pushupReps,
        plank_seconds: plankSeconds,
        run_distance: finalRunDist,
        squat_reps: squatReps,
        logged_at: selectedDate.toISOString(),
        whoop_activity_type: whoopActivity || undefined,
        whoop_strain: whoopStrain ? parseFloat(whoopStrain) : undefined,
        whoop_duration_seconds: whoopDuration ? parseInt(whoopDuration) * 60 : undefined,
      };
      const flushed = await withTimeout(saveDraft.mutateAsync(flushPayload), 15000, 'Save draft');
      const logId = flushed?.id;
      if (!logId) throw new Error('Failed to save draft');
      if (!draftId && flushed.id) setDraftId(flushed.id);

      await withTimeout(
        submitLog.mutateAsync({
          logId,
          pushup_reps: pushupReps,
          plank_seconds: plankSeconds,
          run_distance: finalRunDist,
          squat_reps: squatReps,
        }),
        15000,
        'Submit'
      );

      let crossedNew: Milestone[] = [];
      if (allTimeStats) {
        crossedNew = checkNewMilestones(
          allTimeStats.totalPushups,
          allTimeStats.totalPlankSeconds,
          allTimeStats.totalRunDistance,
          allTimeStats.totalPushups + pushupReps,
          allTimeStats.totalPlankSeconds + plankSeconds,
          allTimeStats.totalRunDistance + finalRunDist,
          allTimeStats.totalSquats,
          allTimeStats.totalSquats + squatReps
        );
        if (crossedNew.length > 0) {
          await persistNewMilestoneUnlocks(createClient(), user.id, crossedNew);
        }
      }

      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([100, 50, 200]);
      }

      const { totalPts } = calculateSessionScore(pushupReps, plankSeconds, finalRunDist, squatReps);

      const isPB =
        (allTimeStats && pushupReps > allTimeStats.peakPushups) ||
        (allTimeStats && plankSeconds > allTimeStats.peakPlankSeconds) ||
        (allTimeStats && finalRunDist > allTimeStats.peakRunDistance) ||
        (allTimeStats && squatReps > allTimeStats.peakSquats);

      setSubmitted(true);
      await refetchDashboardAfterLogChange();
      await queryClient.refetchQueries({ queryKey: ['streak', user.id] });
      const nextRank = await fetchWeeklyVolumeRank(user.id);
      const streakAfter =
        queryClient.getQueryData<number>(['streak', user.id]) ?? streakWeeks;

      const payload: ScoreRevealPayload = {
        totalPts: Math.round(totalPts),
        streak: streakAfter,
        prevRank,
        nextRank,
        headline: isPB
          ? 'NEW PB'
          : crossedNew.length === 1
            ? `${crossedNew[0].emoji} ${crossedNew[0].label}`
            : crossedNew.length > 1
              ? `${crossedNew.length} milestones unlocked`
              : null,
      };
      sessionStorage.setItem(SCORE_REVEAL_STORAGE_KEY, JSON.stringify(payload));
      router.push('/score-reveal');
    } catch (err) {
      console.error('Submit failed:', err);
      setSubmitError(err instanceof Error ? err.message : 'Failed to save log');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalPushups = (weeklyVolume?.total_pushups || 0) + pushupReps;
  const totalPlankSecs = (weeklyVolume?.total_plank_seconds || 0) + plankSeconds;
  const totalRunDist = Number(weeklyVolume?.total_run_distance || 0) + runDistance;
  const totalSquats = (weeklyVolume?.total_squats || 0) + squatReps;
  const pushupGoal = goals?.pushup_weekly_goal || 500;
  const plankGoal = goals?.plank_weekly_goal || 600;
  const runGoal = goals?.run_weekly_goal || 20;
  const squatGoal = goals?.squat_weekly_goal || 300;

  const displayRunGoal = profile?.unit_preference === 'imperial' ? runGoal * 0.621371 : runGoal;
  const unitLabel = profile?.unit_preference === 'imperial' ? 'MI' : 'KM';
  
  const loggedDays = useMemo(() => {
    return Array.from(logsMap.keys()).map((dateStr) => new Date(dateStr + 'T12:00:00'));
  }, [logsMap]);
  const isToday = isSameDay(selectedDate, new Date());

  const projectedScore = useMemo(() => {
    const finalRun = profile?.unit_preference === 'imperial'
      ? Number((runDistance * 1.60934).toFixed(3))
      : runDistance;
    return calculateSessionScore(pushupReps, plankSeconds, finalRun, squatReps);
  }, [pushupReps, plankSeconds, runDistance, squatReps, profile?.unit_preference]);

  const previewRank = useMemo(() => {
    if (!user) return null;
    const idx = weeklyBoard.findIndex((e) => e.user_id === user.id);
    return idx >= 0 ? idx + 1 : null;
  }, [weeklyBoard, user]);

  const runDisplayForLog = (km: number) =>
    profile?.unit_preference === 'imperial'
      ? `${(km * 0.621371).toFixed(1)}mi`
      : `${km}km`;

  return (
    <AppShell>
      <div className="max-w-md mx-auto px-6 space-y-5 pt-2 pb-32">

        <GlassCard className="!p-4" animate={false}>
          <p className="text-[10px] font-semibold tracking-[0.2em] text-dark-muted uppercase text-center">
            Projected session
          </p>
          <p className="text-4xl font-black text-center text-emerald-500 tabular-nums mt-1">
            {Math.round(projectedScore.totalPts)} pts
          </p>
          <p className="text-[10px] text-dark-muted text-center mt-2">
            {previewRank ? `Weekly rank #${previewRank} before submit` : 'Log to place on the weekly board'}
          </p>
        </GlassCard>

        {/* Collapsible Session History Header */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setCalendarOpen(!calendarOpen)}
            className="flex items-center gap-2 group"
          >
            <p className="text-[10px] font-semibold tracking-[0.2em] text-dark-muted uppercase group-hover:text-emerald-500 transition-colors">
              Session History
            </p>
            <svg 
              width="14" height="14" viewBox="0 0 24 24" fill="none" 
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className={`text-dark-muted transition-transform duration-300 ${calendarOpen ? 'rotate-180' : ''}`}
            >
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </button>
          
          <h2 className="text-lg font-black text-dark-text tracking-tight text-right">
            {isToday ? 'Today' : format(selectedDate, 'EEE, MMM d')}
          </h2>
        </div>

        {/* Calendar and Existing Logs View */}
        <AnimatePresence>
          {calendarOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-3"
            >
              <GlassCard className="!p-3" delay={0}>
                <style>{`
                  .kinetic-cal {
                    --rdp-accent-color: #10B981;
                    --rdp-background-color: rgba(16,185,129,0.12);
                    width: 100%;
                    font-family: inherit;
                  }
                  .kinetic-cal .rdp-months { width: 100%; }
                  .kinetic-cal .rdp-month { width: 100%; }
                  .kinetic-cal .rdp-month_caption { 
                    font-size: 14px; font-weight: 800; 
                    color: var(--color-dark-text, #f5f5f7); 
                    letter-spacing: 0.08em; text-transform: uppercase;
                    padding: 4px 0 8px;
                  }
                  .kinetic-cal .rdp-weekday { 
                    font-size: 10px; font-weight: 700; 
                    color: #636366; letter-spacing: 0.1em;
                    text-transform: uppercase;
                  }
                  .kinetic-cal .rdp-day {
                    width: 36px; height: 36px; padding: 0;
                  }
                  .kinetic-cal .rdp-day_button {
                    width: 100%; height: 100%;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 13px; font-weight: 600;
                    color: #a1a1a6; border-radius: 10px;
                    transition: all 0.15s ease;
                  }
                  .kinetic-cal .rdp-day_button:hover { background: rgba(255,255,255,0.06); }
                  .kinetic-cal .rdp-today { color: #10B981 !important; font-weight: 800; }
                  .kinetic-cal .rdp-selected .rdp-day_button {
                    background: #10B981 !important; color: #000 !important; 
                    font-weight: 900; border-radius: 10px;
                  }
                  .kinetic-cal .rdp-chevron { fill: #636366; }
                  
                  /* Green dots on button so it centers inside the cell relative to the number */
                  .kinetic-cal .day-has-log button { position: relative; }
                  .kinetic-cal .day-has-log button::after {
                    content: ''; position: absolute; bottom: 3px; left: 50%;
                    transform: translateX(-50%);
                    width: 4px; height: 4px; border-radius: 50%; 
                    background: #10B981;
                  }
                  .kinetic-cal .rdp-selected.day-has-log button::after {
                    background: #000; /* Contrast against green selected background */
                  }

                  .kinetic-cal .rdp-nav { gap: 4px; }
                  .kinetic-cal .rdp-button_previous,
                  .kinetic-cal .rdp-button_next {
                    width: 28px; height: 28px; border-radius: 8px;
                    background: rgba(255,255,255,0.04);
                    border: 1px solid rgba(255,255,255,0.08);
                  }
                `}</style>
                <DayPicker
                  className="kinetic-cal"
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDaySelect}
                  month={calendarMonth}
                  onMonthChange={setCalendarMonth}
                  modifiers={{ hasLog: loggedDays }}
                  modifiersClassNames={{ hasLog: 'day-has-log' }}
                  showOutsideDays
                  fixedWeeks
                />
              </GlassCard>

              {/* Day's existing logs */}
              {currentDayLogs.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-widest pl-1 mt-2">
                    Logs on {format(selectedDate, 'MMM d')}
                  </p>
                  {currentDayLogs.map(log => (
                    <button
                      key={log.id}
                      onClick={() => handleEditLog(log.id)}
                      className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition-colors ${
                        editLogId === log.id
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                          : 'border-dark-border bg-dark-elevated text-dark-text hover:border-emerald-500/30'
                      }`}
                    >
                      <LogDayMetrics
                        log={log}
                        runLabel={
                          Number(log.run_distance) > 0
                            ? runDisplayForLog(Number(log.run_distance))
                            : undefined
                        }
                      />
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                        {editLogId === log.id ? 'EDITING' : 'EDIT'}
                      </span>
                    </button>
                  ))}
                  
                  <button
                    onClick={() => {
                      setEditLogId(null);
                      setPushupReps(0);
                      setPlankSeconds(0);
                      setRunDistance(0);
                      setSquatReps(0);
                    }}
                    className={`w-full p-2.5 rounded-xl border border-dashed text-xs font-bold tracking-wider transition-colors ${
                      !editLogId ? 'border-emerald-500/50 text-emerald-500' : 'border-dark-border/60 text-dark-muted hover:text-emerald-500'
                    }`}
                  >
                    + NEW ENTRY
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {editLogId && (
          <div className="flex justify-between items-center bg-emerald-500/10 px-3 py-2 rounded-lg border border-emerald-500/20">
            <span className="text-xs font-bold text-emerald-500 tracking-wider">EDITING LOG</span>
            <button
              onClick={() => {
                setEditLogId(null);
                setPushupReps(0);
                setPlankSeconds(0);
                setRunDistance(0);
                setSquatReps(0);
              }}
              className="text-[10px] font-black text-red-400 hover:text-red-300 transition-colors uppercase tracking-widest"
            >
              CANCEL
            </button>
          </div>
        )}


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

        <ExerciseStepperCard
          data-testid="uat-log-pushup-reps"
          label="Push-up reps"
          icon={exerciseIcon('pushups')}
          value={pushupReps}
          onChange={setPushupReps}
          step={1}
          goalLeft={`${Math.max(pushupGoal - totalPushups, 0)} left`}
        />
        <ExerciseStepperCard
          label="Squat reps"
          icon={exerciseIcon('squats')}
          value={squatReps}
          onChange={setSquatReps}
          step={1}
          goalLeft={`${Math.max(squatGoal - totalSquats, 0)} left`}
        />
        <ExerciseStepperCard
          label="Plank"
          icon={exerciseIcon('plank')}
          value={plankSeconds}
          onChange={setPlankSeconds}
          step={5}
          goalLeft={`${formatPlankTime(Math.max(plankGoal - totalPlankSecs, 0))} left`}
          valueDisplay={plankSeconds > 0 ? formatPlankTime(plankSeconds) : 0}
        />
        <ExerciseStepperCard
          label={`Run (${unitLabel})`}
          icon={exerciseIcon('run')}
          value={runDistance}
          onChange={setRunDistance}
          step={0.1}
          goalLeft={`${Math.max(displayRunGoal - (profile?.unit_preference === 'imperial' ? totalRunDist * 0.621371 : totalRunDist), 0).toFixed(1)}${unitLabel} left`}
        />

        {/* Action Buttons */}
        <div className="space-y-4">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSubmit}
            disabled={isSubmitting || submitted || isSessionRefreshing}
            className="w-full py-4 rounded-2xl emerald-gradient font-black text-sm tracking-wider text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-all duration-200"
          >
            {submitted ? (
              <>{editLogId ? 'UPDATED ✓' : 'SUBMITTED ✓'}</>
            ) : isSessionRefreshing ? (
              <>RECONNECTING...</>
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

          {(pushupReps > 0 || plankSeconds > 0 || runDistance > 0 || squatReps > 0) && !isSubmitting && !submitted && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setPushupReps(0);
                setPlankSeconds(0);
                setRunDistance(0);
                setSquatReps(0);
                setEditLogId(null);
              }}
              className="w-full py-3 rounded-xl bg-dark-elevated border border-dashed border-dark-border text-[10px] font-black tracking-widest text-dark-muted hover:text-red-400 hover:border-red-400/30 transition-all uppercase"
            >
              ERASE & RESET
            </motion.button>
          )}

          {submitError && (
            <p className="text-xs text-red-400 font-semibold text-center">{submitError}</p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
