'use client';

import { useState, useEffect, useCallback, useRef, Suspense, useMemo } from 'react';
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
import { Confetti } from '@/components/ui/confetti';
import { checkNewMilestones, type Milestone } from '@/lib/milestones';
import { persistNewMilestoneUnlocks } from '@/lib/milestone-persistence';
import { calculateSessionScore } from '@/lib/scoring';
import { DayPicker } from 'react-day-picker';

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
  const saveDraft = useSaveDraft();
  const submitLog = useSubmitLog();
  const updateSubmittedLog = useUpdateSubmittedLog();
  const { data: allTimeStats } = useAllTimeStats();

  // Whoop prefill from notification
  const whoopActivity = searchParams.get('activity') || '';
  const whoopDuration = searchParams.get('duration') || '';
  const whoopStrain = searchParams.get('strain') || '';

  const [pushupReps, setPushupReps] = useState(0);
  const [plankSeconds, setPlankSeconds] = useState(0);
  const [runDistance, setRunDistance] = useState(0);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editLogId, setEditLogId] = useState<string | null>(null);
  const [submitLabel, setSubmitLabel] = useState<'submit' | 'update'>('submit');
  const [pbCelebration, setPbCelebration] = useState<string | null>(null);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  // Calendar state
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const { data: monthLogs = [] } = useMonthLogs(calendarMonth);
  const logsMap = useMemo(() => dateToLogsMap(monthLogs), [monthLogs]);

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
      logged_at: selectedDate.toISOString(),
      whoop_activity_type: whoopActivity || undefined,
      whoop_strain: whoopStrain ? parseFloat(whoopStrain) : undefined,
      whoop_duration_seconds: whoopDuration ? parseInt(whoopDuration) * 60 : undefined,
    }, {
      onSuccess: (data) => {
        if (data && !draftId) setDraftId(data.id);
      },
    });
  }, [user, editLogId, profile?.unit_preference, draftId, pushupReps, plankSeconds, runDistance, selectedDate, whoopActivity, whoopStrain, whoopDuration, saveDraft]);

  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(autoSave, 2000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [pushupReps, plankSeconds, runDistance, autoSave]);

  // Handle day selection from calendar
  const handleDaySelect = (day: Date | undefined) => {
    if (!day) return;
    const dateKey = format(day, 'yyyy-MM-dd');
    const logsForDay = logsMap.get(dateKey);

    setSelectedDate(startOfDay(day));
    setSubmitted(false);
    setSubmitError(null);

    if (logsForDay && logsForDay.length > 0) {
      // Load the most recent log for that day
      const target = logsForDay[0];
      setEditLogId(target.id);
      setDraftId(null);
      setPushupReps(target.pushup_reps || 0);
      setPlankSeconds(target.plank_seconds || 0);
      const km = Number(target.run_distance) || 0;
      setRunDistance(
        profile?.unit_preference === 'imperial'
          ? Number((km * 0.621371).toFixed(1))
          : km
      );
    } else {
      // New entry for that day
      setEditLogId(null);
      setDraftId(null);
      setPushupReps(0);
      setPlankSeconds(0);
      setRunDistance(0);
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
        const oldLog = monthLogs.find((r) => r.id === editLogId);
        if (!oldLog) throw new Error('Could not load log to update');

        await updateSubmittedLog.mutateAsync({
          logId: editLogId,
          patch: {
            pushup_reps: pushupReps,
            plank_seconds: plankSeconds,
            run_distance: finalRunDist,
          },
        });

        let crossed: Milestone[] = [];
        if (allTimeStats) {
          const oldPush = oldLog.pushup_reps || 0;
          const oldPlank = oldLog.plank_seconds || 0;
          const oldRun = Number(oldLog.run_distance) || 0;
          crossed = checkNewMilestones(
            allTimeStats.totalPushups,
            allTimeStats.totalPlankSeconds,
            allTimeStats.totalRunDistance,
            allTimeStats.totalPushups - oldPush + pushupReps,
            allTimeStats.totalPlankSeconds - oldPlank + plankSeconds,
            allTimeStats.totalRunDistance - oldRun + finalRunDist
          );
          if (crossed.length > 0) {
            await persistNewMilestoneUnlocks(createClient(), user.id, crossed);
            queryClient.invalidateQueries({ queryKey: ['user-milestone-unlocks'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
          }
        }

        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([100, 50, 200]);
        }

        const isPBEdit =
          (allTimeStats && pushupReps > allTimeStats.peakPushups) ||
          (allTimeStats && plankSeconds > allTimeStats.peakPlankSeconds) ||
          (allTimeStats && finalRunDist > allTimeStats.peakRunDistance);

        if (isPBEdit) {
          setPbCelebration('NEW PB!');
          await new Promise((r) => setTimeout(r, 2000));
        }
        if (crossed.length > 0) {
          setPbCelebration(
            crossed.length === 1
              ? `${crossed[0].emoji} ${crossed[0].label}`
              : `${crossed.length} milestones unlocked!`
          );
          await new Promise((r) => setTimeout(r, 2000));
        }

        setSubmitted(true);
        setSubmitLabel('update');
        queryClient.invalidateQueries({ queryKey: ['month-logs'] });
        return;
      }

      let logId = draftId;

      // If no draft saved yet, save it now and get the ID
      if (!logId) {
        const saved = await saveDraft.mutateAsync({
          pushup_reps: pushupReps,
          plank_seconds: plankSeconds,
          run_distance: finalRunDist,
          logged_at: selectedDate.toISOString(),
          whoop_activity_type: whoopActivity || undefined,
          whoop_strain: whoopStrain ? parseFloat(whoopStrain) : undefined,
          whoop_duration_seconds: whoopDuration ? parseInt(whoopDuration) * 60 : undefined,
        });
        logId = saved?.id;
        if (!logId) throw new Error('Failed to save draft');
      }

      await submitLog.mutateAsync(logId);

      let crossedNew: Milestone[] = [];
      if (allTimeStats) {
        crossedNew = checkNewMilestones(
          allTimeStats.totalPushups,
          allTimeStats.totalPlankSeconds,
          allTimeStats.totalRunDistance,
          allTimeStats.totalPushups + pushupReps,
          allTimeStats.totalPlankSeconds + plankSeconds,
          allTimeStats.totalRunDistance + finalRunDist
        );
        if (crossedNew.length > 0) {
          await persistNewMilestoneUnlocks(createClient(), user.id, crossedNew);
          queryClient.invalidateQueries({ queryKey: ['user-milestone-unlocks'] });
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
      }

      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([100, 50, 200]);
      }

      const isPB =
        (allTimeStats && pushupReps > allTimeStats.peakPushups) ||
        (allTimeStats && plankSeconds > allTimeStats.peakPlankSeconds) ||
        (allTimeStats && finalRunDist > allTimeStats.peakRunDistance);

      if (isPB) {
        setPbCelebration('NEW PB!');
        await new Promise((r) => setTimeout(r, 2000));
      }
      if (crossedNew.length > 0) {
        setPbCelebration(
          crossedNew.length === 1
            ? `${crossedNew[0].emoji} ${crossedNew[0].label}`
            : `${crossedNew.length} milestones unlocked!`
        );
        await new Promise((r) => setTimeout(r, 2000));
      }

      // Session score celebration
      const { totalPts, pushupPts, plankPts, runPts } = calculateSessionScore(
        pushupReps,
        plankSeconds,
        finalRunDist
      );
      if (totalPts > 0) {
        const parts = [
          pushupPts > 0 ? `💪${Math.round(pushupPts)}` : '',
          plankPts > 0 ? `🧘${Math.round(plankPts)}` : '',
          runPts > 0 ? `🏃${Math.round(runPts)}` : '',
        ].filter(Boolean).join(' + ');
        setPbCelebration(`⚡ ${Math.round(totalPts)} PTS (${parts})`);
        await new Promise((r) => setTimeout(r, 2500));
      }

      setSubmitted(true);
      setSubmitLabel('submit');
      setPushupReps(0);
      setPlankSeconds(0);
      setRunDistance(0);
      setDraftId(null);
      queryClient.invalidateQueries({ queryKey: ['month-logs'] });
    } catch (err) {
      console.error('Submit failed:', err);
      setSubmitError(err instanceof Error ? err.message : 'Failed to save log');
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

  const displayRunGoal = profile?.unit_preference === 'imperial' ? runGoal * 0.621371 : runGoal;
  const displayRunDist = profile?.unit_preference === 'imperial' ? totalRunDist * 0.621371 : totalRunDist;
  const unitLabel = profile?.unit_preference === 'imperial' ? 'MI' : 'KM';

  // Days with logs for calendar highlighting
  const loggedDays = useMemo(() => {
    return Array.from(logsMap.keys()).map((dateStr) => new Date(dateStr + 'T12:00:00'));
  }, [logsMap]);

  const isToday = isSameDay(selectedDate, new Date());

  return (
    <AppShell>
      <Confetti active={!!pbCelebration} message={pbCelebration || undefined} />
      <div className="max-w-md mx-auto px-6 space-y-5 pt-2 pb-32">

        {/* Calendar */}
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
              width: 36px; height: 36px;
              font-size: 13px; font-weight: 600;
              color: #a1a1a6; border-radius: 10px;
              transition: all 0.15s ease;
            }
            .kinetic-cal .rdp-day:hover { background: rgba(255,255,255,0.06); }
            .kinetic-cal .rdp-today { color: #10B981 !important; font-weight: 800; }
            .kinetic-cal .rdp-selected .rdp-day_button {
              background: #10B981 !important; color: #000 !important; 
              font-weight: 900; border-radius: 10px;
            }
            .kinetic-cal .rdp-chevron { fill: #636366; }
            .kinetic-cal .day-has-log { position: relative; }
            .kinetic-cal .day-has-log::after {
              content: ''; position: absolute; bottom: 3px; left: 50%;
              transform: translateX(-50%);
              width: 4px; height: 4px; border-radius: 50%; 
              background: #10B981;
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

        {/* Selected date header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.2em] text-dark-muted uppercase">
              {editLogId ? 'EDITING LOG' : 'NEW LOG'}
            </p>
            <h2 className="text-lg font-black text-dark-text">
              {isToday ? 'Today' : format(selectedDate, 'EEE, MMM d')}
            </h2>
          </div>
          {editLogId && (
            <button
              onClick={() => {
                setEditLogId(null);
                setSubmitError(null);
                setPushupReps(0);
                setPlankSeconds(0);
                setRunDistance(0);
              }}
              className="px-3 py-1 rounded-lg text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20"
            >
              CANCEL
            </button>
          )}
        </div>

        {/* Quick Log Presets */}
        {!editLogId && pushupReps === 0 && plankSeconds === 0 && runDistance === 0 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {[
              { label: '50 push-ups', p: 50, pl: 0, r: 0 },
              { label: '100 push-ups', p: 100, pl: 0, r: 0 },
              { label: '2 min plank', p: 0, pl: 120, r: 0 },
              { label: '5K run', p: 0, pl: 0, r: 5 },
            ].map((preset) => (
              <button
                key={preset.label}
                onClick={() => {
                  if (preset.p) setPushupReps(preset.p);
                  if (preset.pl) setPlankSeconds(preset.pl);
                  if (preset.r) setRunDistance(preset.r);
                }}
                className="shrink-0 px-3 py-1.5 rounded-full bg-dark-elevated border border-dark-border text-[10px] font-bold tracking-wider text-dark-muted hover:text-emerald-500 hover:border-emerald-500/30 transition-all"
              >
                {preset.label}
              </button>
            ))}
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
