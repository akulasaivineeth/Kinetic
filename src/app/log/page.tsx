'use client';

import { useState, useEffect, useCallback, useRef, Suspense, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppShell } from '@/components/layout/app-shell';
import { GlassCard } from '@/components/ui/glass-card';
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
import { useActivityTypes, useLogActivity } from '@/hooks/use-activities';
import { formatPlankTime, parsePlankMmSsDigitInput } from '@/lib/utils';
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

const CORE_SLUGS = ['pushups', 'squats', 'plank', 'run'] as const;
type CoreSlug = (typeof CORE_SLUGS)[number];

function isCoreSlug(slug: string): slug is CoreSlug {
  return (CORE_SLUGS as readonly string[]).includes(slug);
}

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
  const { data: activityTypes = [] } = useActivityTypes();
  const logActivity = useLogActivity();

  const whoopActivity = searchParams.get('activity') || '';
  const whoopDuration = searchParams.get('duration') || '';
  const whoopStrain = searchParams.get('strain') || '';
  const whoopDistanceKm = searchParams.get('distance_km') || '';

  // Selected activities for this session
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());

  // Core activity values
  const [pushupReps, setPushupReps] = useState(0);
  const [plankSeconds, setPlankSeconds] = useState(0);
  const [runDistance, setRunDistance] = useState(() => {
    if (!whoopDistanceKm) return 0;
    const km = parseFloat(whoopDistanceKm);
    return isNaN(km) ? 0 : km;
  });
  const [squatReps, setSquatReps] = useState(0);

  // Non-core activity values
  const [flexValues, setFlexValues] = useState<Record<string, number>>({});

  const [draftId, setDraftId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editLogId, setEditLogId] = useState<string | null>(null);
  const [pbCelebration, setPbCelebration] = useState<string | null>(null);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  // Calendar
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const { data: monthLogs = [] } = useMonthLogs(calendarMonth);
  const logsMap = useMemo(() => dateToLogsMap(monthLogs), [monthLogs]);
  const currentDayLogs = useMemo(() => logsMap.get(format(selectedDate, 'yyyy-MM-dd')) || [], [logsMap, selectedDate]);

  const coreTypes = useMemo(() => activityTypes.filter(a => a.is_core), [activityTypes]);
  const flexTypes = useMemo(() => activityTypes.filter(a => !a.is_core), [activityTypes]);

  const toggleActivity = (slug: string) => {
    setSelectedSlugs(prev => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
        if (!isCoreSlug(slug)) {
          setFlexValues(v => { const n = { ...v }; delete n[slug]; return n; });
        }
      } else {
        next.add(slug);
      }
      return next;
    });
  };

  const getCoreValue = (slug: CoreSlug): number => {
    switch (slug) {
      case 'pushups': return pushupReps;
      case 'squats': return squatReps;
      case 'plank': return plankSeconds;
      case 'run': return runDistance;
    }
  };

  const setCoreValue = (slug: CoreSlug, val: number) => {
    switch (slug) {
      case 'pushups': setPushupReps(val); break;
      case 'squats': setSquatReps(val); break;
      case 'plank': setPlankSeconds(val); break;
      case 'run': setRunDistance(val); break;
    }
  };

  // Whoop import
  const handleWhoopImport = async () => {
    setIsImporting(true);
    setImportResult(null);
    try {
      const res = await fetch('/api/whoop/import');
      const data = await res.json();
      if (res.ok) {
        setImportResult(`Imported ${data.imported} workout${data.imported !== 1 ? 's' : ''}`);
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        if (data.workouts?.length) {
          const withDistance = data.workouts.find((w: { distance_km: number | null }) => w.distance_km);
          if (withDistance?.distance_km) {
            const km = withDistance.distance_km;
            setRunDistance(profile?.unit_preference === 'imperial' ? Math.round(km * 0.621371 * 100) / 100 : km);
            setSelectedSlugs(prev => new Set(prev).add('run'));
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

  // Load draft
  useEffect(() => {
    if (editLogId) return;
    if (draft) {
      setDraftId(draft.id);
      const active = new Set<string>();
      if (draft.pushup_reps > 0) { setPushupReps(draft.pushup_reps); active.add('pushups'); }
      if (draft.squat_reps > 0) { setSquatReps(draft.squat_reps); active.add('squats'); }
      if (draft.plank_seconds > 0) { setPlankSeconds(draft.plank_seconds); active.add('plank'); }
      const km = Number(draft.run_distance) || 0;
      if (km > 0) {
        setRunDistance(profile?.unit_preference === 'imperial' ? Number((km * 0.621371).toFixed(1)) : km);
        active.add('run');
      }
      if (active.size > 0) setSelectedSlugs(active);
    }
  }, [draft, profile?.unit_preference, editLogId]);

  // Auto-save draft (core only)
  const autoSave = useCallback(() => {
    if (!user || editLogId) return;
    const finalRunDist = profile?.unit_preference === 'imperial' ? Number((runDistance * 1.60934).toFixed(3)) : runDistance;
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
      onSuccess: (data) => { if (data && !draftId) setDraftId(data.id); },
    });
  }, [user, editLogId, profile?.unit_preference, draftId, pushupReps, plankSeconds, runDistance, squatReps, selectedDate, whoopActivity, whoopStrain, whoopDuration, saveDraft]);

  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(autoSave, 2000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [pushupReps, plankSeconds, runDistance, squatReps, autoSave]);

  const handleDaySelect = (day: Date | undefined) => {
    if (!day) return;
    setSelectedDate(startOfDay(day));
    setSubmitted(false);
    setSubmitError(null);
    setEditLogId(null);
    setDraftId(null);
    setPushupReps(0); setPlankSeconds(0); setRunDistance(0); setSquatReps(0);
    setFlexValues({});
    setSelectedSlugs(new Set());
  };

  const handleEditLog = (logId: string) => {
    const target = monthLogs.find((r) => r.id === logId);
    if (!target) return;
    setEditLogId(target.id);
    setDraftId(null);
    setSubmitted(false);
    setSubmitError(null);
    const active = new Set<string>();
    if (target.pushup_reps > 0) { setPushupReps(target.pushup_reps); active.add('pushups'); }
    if (target.squat_reps > 0) { setSquatReps(target.squat_reps); active.add('squats'); }
    if (target.plank_seconds > 0) { setPlankSeconds(target.plank_seconds); active.add('plank'); }
    const km = Number(target.run_distance) || 0;
    if (km > 0) {
      setRunDistance(profile?.unit_preference === 'imperial' ? Number((km * 0.621371).toFixed(1)) : km);
      active.add('run');
    }
    setSelectedSlugs(active);
    setFlexValues({});
  };

  const withTimeout = <T,>(promise: Promise<T>, ms: number, label = 'Request'): Promise<T> =>
    Promise.race([promise, new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out — please try again`)), ms))]);

  const refetchDashboardAfterLogChange = async () => {
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ['weekly-volume'] }),
      queryClient.refetchQueries({ queryKey: ['workout-logs'] }),
      queryClient.refetchQueries({ queryKey: ['month-logs'] }),
      queryClient.refetchQueries({ queryKey: ['recent-workout-logs'] }),
      queryClient.refetchQueries({ queryKey: ['alltime-stats'] }),
      queryClient.refetchQueries({ queryKey: ['recent-weeks'] }),
      queryClient.refetchQueries({ queryKey: ['stamina'] }),
      queryClient.refetchQueries({ queryKey: ['leaderboard'] }),
      queryClient.refetchQueries({ queryKey: ['activity-logs'] }),
    ]);
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await waitForSession();

      const finalRunDist = profile?.unit_preference === 'imperial' ? Number((runDistance * 1.60934).toFixed(3)) : runDistance;
      const hasCoreData = pushupReps > 0 || plankSeconds > 0 || finalRunDist > 0 || squatReps > 0;
      const flexEntries = Object.entries(flexValues).filter(([, v]) => v > 0);

      if (editLogId) {
        const oldLog = monthLogs.find((r) => r.id === editLogId);
        if (!oldLog) throw new Error('Could not load log to update');
        await withTimeout(updateSubmittedLog.mutateAsync({
          logId: editLogId,
          patch: { pushup_reps: pushupReps, plank_seconds: plankSeconds, run_distance: finalRunDist, squat_reps: squatReps },
        }), 15000, 'Update');

        if (allTimeStats) {
          const crossed = checkNewMilestones(
            allTimeStats.totalPushups, allTimeStats.totalPlankSeconds, allTimeStats.totalRunDistance,
            allTimeStats.totalPushups - (oldLog.pushup_reps || 0) + pushupReps,
            allTimeStats.totalPlankSeconds - (oldLog.plank_seconds || 0) + plankSeconds,
            allTimeStats.totalRunDistance - (Number(oldLog.run_distance) || 0) + finalRunDist,
            allTimeStats.totalSquats, allTimeStats.totalSquats - (oldLog.squat_reps || 0) + squatReps
          );
          if (crossed.length > 0) await persistNewMilestoneUnlocks(createClient(), user.id, crossed);
        }
        setSubmitted(true);
        await refetchDashboardAfterLogChange();
        router.push('/dashboard');
        return;
      }

      // Submit core activities through workout_logs
      if (hasCoreData) {
        if (autoSaveTimer.current) { clearTimeout(autoSaveTimer.current); autoSaveTimer.current = null; }
        const flushed = await withTimeout(saveDraft.mutateAsync({
          id: draftId || undefined,
          pushup_reps: pushupReps, plank_seconds: plankSeconds, run_distance: finalRunDist, squat_reps: squatReps,
          logged_at: selectedDate.toISOString(),
          whoop_activity_type: whoopActivity || undefined,
          whoop_strain: whoopStrain ? parseFloat(whoopStrain) : undefined,
          whoop_duration_seconds: whoopDuration ? parseInt(whoopDuration) * 60 : undefined,
        }), 15000, 'Save draft');
        const logId = flushed?.id;
        if (!logId) throw new Error('Failed to save draft');
        if (!draftId && flushed.id) setDraftId(flushed.id);
        await withTimeout(submitLog.mutateAsync({
          logId, pushup_reps: pushupReps, plank_seconds: plankSeconds, run_distance: finalRunDist, squat_reps: squatReps,
        }), 15000, 'Submit');

        if (allTimeStats) {
          const crossedNew = checkNewMilestones(
            allTimeStats.totalPushups, allTimeStats.totalPlankSeconds, allTimeStats.totalRunDistance,
            allTimeStats.totalPushups + pushupReps, allTimeStats.totalPlankSeconds + plankSeconds,
            allTimeStats.totalRunDistance + finalRunDist, allTimeStats.totalSquats, allTimeStats.totalSquats + squatReps
          );
          if (crossedNew.length > 0) await persistNewMilestoneUnlocks(createClient(), user.id, crossedNew);
        }
      }

      // Submit non-core activities through log_activity RPC
      for (const [slug, value] of flexEntries) {
        await logActivity.mutateAsync({ slug, value, loggedAt: selectedDate.toISOString() });
      }

      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate([100, 50, 200]);

      const { totalPts, pushupPts, plankPts, runPts, squatPts } = calculateSessionScore(pushupReps, plankSeconds, finalRunDist, squatReps);
      const isPB = allTimeStats && (
        (pushupReps > allTimeStats.peakPushups) || (plankSeconds > allTimeStats.peakPlankSeconds) ||
        (finalRunDist > allTimeStats.peakRunDistance) || (squatReps > allTimeStats.peakSquats));

      let delayTime = 0;
      if (isPB) { setPbCelebration('NEW PB!'); delayTime = 1200; }
      if (totalPts > 0 && delayTime === 0) {
        const parts = [
          pushupPts > 0 ? `💪${Math.round(pushupPts)}` : '',
          plankPts > 0 ? `🧘${Math.round(plankPts)}` : '',
          runPts > 0 ? `🏃${Math.round(runPts)}` : '',
          squatPts > 0 ? `🦵${Math.round(squatPts)}` : '',
        ].filter(Boolean).join(' + ');
        setPbCelebration(`⚡ ${Math.round(totalPts)} PTS${parts ? ` (${parts})` : ''}`);
        delayTime = 1200;
      }
      if (delayTime > 0) await new Promise((r) => setTimeout(r, delayTime));

      setSubmitted(true);
      await refetchDashboardAfterLogChange();
      router.push('/dashboard');
    } catch (err) {
      console.error('Submit failed:', err);
      setSubmitError(err instanceof Error ? err.message : 'Failed to save log');
    } finally {
      setIsSubmitting(false);
    }
  };

  const unitLabel = profile?.unit_preference === 'imperial' ? 'MI' : 'KM';
  const loggedDays = useMemo(() => Array.from(logsMap.keys()).map((dateStr) => new Date(dateStr + 'T12:00:00')), [logsMap]);
  const isToday = isSameDay(selectedDate, new Date());
  const hasAnyInput = pushupReps > 0 || plankSeconds > 0 || runDistance > 0 || squatReps > 0 || Object.values(flexValues).some(v => v > 0);

  // Weekly progress for goals
  const totalPushups = (weeklyVolume?.total_pushups || 0) + pushupReps;
  const totalSquats = (weeklyVolume?.total_squats || 0) + squatReps;
  const totalPlankSecs = (weeklyVolume?.total_plank_seconds || 0) + plankSeconds;
  const totalRunDist = Number(weeklyVolume?.total_run_distance || 0) + runDistance;
  const pushupGoal = goals?.pushup_weekly_goal || 500;
  const squatGoal = goals?.squat_weekly_goal || 300;
  const plankGoal = goals?.plank_weekly_goal || 600;
  const runGoal = goals?.run_weekly_goal || 20;
  const displayRunGoal = profile?.unit_preference === 'imperial' ? runGoal * 0.621371 : runGoal;

  function goalInfo(slug: string): { goal: number; current: number; unit: string } | null {
    switch (slug) {
      case 'pushups': return { goal: pushupGoal, current: totalPushups, unit: '' };
      case 'squats': return { goal: squatGoal, current: totalSquats, unit: '' };
      case 'plank': return { goal: plankGoal, current: totalPlankSecs, unit: '' };
      case 'run': return { goal: displayRunGoal, current: profile?.unit_preference === 'imperial' ? totalRunDist * 0.621371 : totalRunDist, unit: unitLabel };
      default: return null;
    }
  }

  return (
    <AppShell>
      <Confetti active={!!pbCelebration} message={pbCelebration || undefined} />
      <div className="max-w-md mx-auto px-4 space-y-4 pt-2 pb-32">

        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={() => setCalendarOpen(!calendarOpen)} className="flex items-center gap-2 group">
            <p className="text-[10px] font-semibold tracking-[0.2em] text-dark-muted uppercase group-hover:text-emerald-500 transition-colors">
              Session History
            </p>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className={`text-dark-muted transition-transform duration-300 ${calendarOpen ? 'rotate-180' : ''}`}>
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </button>
          <h2 className="text-lg font-black text-dark-text tracking-tight text-right">
            {isToday ? 'Today' : format(selectedDate, 'EEE, MMM d')}
          </h2>
        </div>

        {/* Calendar */}
        <AnimatePresence>
          {calendarOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-3">
              <GlassCard className="!p-3" delay={0}>
                <style>{`
                  .kinetic-cal { --rdp-accent-color: #10B981; --rdp-background-color: rgba(16,185,129,0.12); width: 100%; font-family: inherit; }
                  .kinetic-cal .rdp-months { width: 100%; } .kinetic-cal .rdp-month { width: 100%; }
                  .kinetic-cal .rdp-month_caption { font-size: 14px; font-weight: 800; color: var(--color-dark-text, #f5f5f7); letter-spacing: 0.08em; text-transform: uppercase; padding: 4px 0 8px; }
                  .kinetic-cal .rdp-weekday { font-size: 10px; font-weight: 700; color: #636366; letter-spacing: 0.1em; text-transform: uppercase; }
                  .kinetic-cal .rdp-day { width: 36px; height: 36px; padding: 0; }
                  .kinetic-cal .rdp-day_button { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; color: #a1a1a6; border-radius: 10px; transition: all 0.15s ease; }
                  .kinetic-cal .rdp-day_button:hover { background: rgba(255,255,255,0.06); }
                  .kinetic-cal .rdp-today { color: #10B981 !important; font-weight: 800; }
                  .kinetic-cal .rdp-selected .rdp-day_button { background: #10B981 !important; color: #000 !important; font-weight: 900; border-radius: 10px; }
                  .kinetic-cal .rdp-chevron { fill: #636366; }
                  .kinetic-cal .day-has-log button { position: relative; }
                  .kinetic-cal .day-has-log button::after { content: ''; position: absolute; bottom: 3px; left: 50%; transform: translateX(-50%); width: 4px; height: 4px; border-radius: 50%; background: #10B981; }
                  .kinetic-cal .rdp-selected.day-has-log button::after { background: #000; }
                  .kinetic-cal .rdp-nav { gap: 4px; }
                  .kinetic-cal .rdp-button_previous, .kinetic-cal .rdp-button_next { width: 28px; height: 28px; border-radius: 8px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); }
                `}</style>
                <DayPicker className="kinetic-cal" mode="single" selected={selectedDate} onSelect={handleDaySelect}
                  month={calendarMonth} onMonthChange={setCalendarMonth} modifiers={{ hasLog: loggedDays }}
                  modifiersClassNames={{ hasLog: 'day-has-log' }} showOutsideDays fixedWeeks />
              </GlassCard>

              {currentDayLogs.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-widest pl-1 mt-2">
                    Logs on {format(selectedDate, 'MMM d')}
                  </p>
                  {currentDayLogs.map(log => (
                    <button key={log.id} onClick={() => handleEditLog(log.id)}
                      className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition-colors ${
                        editLogId === log.id ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : 'border-dark-border bg-dark-elevated text-dark-text hover:border-emerald-500/30'
                      }`}>
                      <div className="flex gap-3 font-bold text-sm tracking-wide flex-wrap">
                        {log.pushup_reps > 0 && <span>💪 {log.pushup_reps}</span>}
                        {log.squat_reps > 0 && <span>🦵 {log.squat_reps}</span>}
                        {log.plank_seconds > 0 && <span>🧘 {formatPlankTime(log.plank_seconds)}</span>}
                        {Number(log.run_distance) > 0 && <span>🏃 {Number(log.run_distance)}km</span>}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">{editLogId === log.id ? 'EDITING' : 'EDIT'}</span>
                    </button>
                  ))}
                  <button onClick={() => { setEditLogId(null); setPushupReps(0); setPlankSeconds(0); setRunDistance(0); setSquatReps(0); setFlexValues({}); setSelectedSlugs(new Set()); }}
                    className={`w-full p-2.5 rounded-xl border border-dashed text-xs font-bold tracking-wider transition-colors ${
                      !editLogId ? 'border-emerald-500/50 text-emerald-500' : 'border-dark-border/60 text-dark-muted hover:text-emerald-500'
                    }`}>
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
            <button onClick={() => { setEditLogId(null); setPushupReps(0); setPlankSeconds(0); setRunDistance(0); setSquatReps(0); setFlexValues({}); setSelectedSlugs(new Set()); }}
              className="text-[10px] font-black text-red-400 hover:text-red-300 transition-colors uppercase tracking-widest">CANCEL</button>
          </div>
        )}

        {/* Whoop Import */}
        {profile?.whoop_access_token && (
          <div className="flex items-center gap-2">
            <button onClick={handleWhoopImport} disabled={isImporting}
              className="flex-1 px-4 py-2.5 rounded-xl bg-dark-elevated border border-dark-border text-xs font-bold tracking-wider text-dark-muted hover:text-emerald-500 hover:border-emerald-500/30 transition-all disabled:opacity-50">
              {isImporting ? 'IMPORTING...' : '⌚ IMPORT RECENT WORKOUTS'}
            </button>
            {importResult && <span className="text-xs font-semibold text-emerald-500 animate-fade-in">{importResult}</span>}
          </div>
        )}

        {/* ==================== ACTIVITY GRID ==================== */}
        <div>
          <p className="text-[10px] font-black tracking-wider text-dark-muted uppercase mb-2">
            {editLogId ? 'ACTIVITIES' : 'TAP TO LOG'}
          </p>
          <div className="grid grid-cols-4 gap-2">
            {coreTypes.map(act => {
              const active = selectedSlugs.has(act.slug);
              const val = getCoreValue(act.slug as CoreSlug);
              return (
                <motion.button key={act.slug} onClick={() => toggleActivity(act.slug)} whileTap={{ scale: 0.92 }}
                  className={`relative flex flex-col items-center justify-center py-3 px-1 rounded-2xl border transition-all ${
                    active
                      ? 'bg-emerald-500/12 border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                      : 'bg-dark-elevated/40 border-dark-border/40 hover:border-dark-border'
                  }`}>
                  <span className="text-xl mb-0.5">{act.emoji}</span>
                  <span className={`text-[9px] font-bold tracking-wide ${active ? 'text-emerald-400' : 'text-dark-muted'}`}>
                    {act.name.split(' ')[0]}
                  </span>
                  {active && val > 0 && (
                    <span className="text-[8px] font-black text-emerald-500 mt-0.5">
                      {act.slug === 'plank' ? formatPlankTime(val) : act.slug === 'run' ? `${val}${unitLabel.toLowerCase()}` : val}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>

          {flexTypes.length > 0 && (
            <div className="grid grid-cols-4 gap-2 mt-2">
              {flexTypes.map(act => {
                const active = selectedSlugs.has(act.slug);
                const val = flexValues[act.slug] || 0;
                return (
                  <motion.button key={act.slug} onClick={() => toggleActivity(act.slug)} whileTap={{ scale: 0.92 }}
                    className={`relative flex flex-col items-center justify-center py-3 px-1 rounded-2xl border transition-all ${
                      active
                        ? 'bg-emerald-500/12 border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                        : 'bg-dark-elevated/40 border-dark-border/40 hover:border-dark-border'
                    }`}>
                    <span className="text-xl mb-0.5">{act.emoji}</span>
                    <span className={`text-[9px] font-bold tracking-wide leading-tight text-center ${active ? 'text-emerald-400' : 'text-dark-muted'}`}>
                      {act.name.length > 8 ? act.name.slice(0, 7) + '…' : act.name}
                    </span>
                    {active && val > 0 && (
                      <span className="text-[8px] font-black text-emerald-500 mt-0.5">{val}{act.unit === 'reps' ? '' : act.unit.charAt(0)}</span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        {/* ==================== INPUT FIELDS FOR SELECTED ACTIVITIES ==================== */}
        <AnimatePresence mode="popLayout">
          {Array.from(selectedSlugs).map(slug => {
            const act = activityTypes.find(a => a.slug === slug);
            if (!act) return null;

            if (isCoreSlug(slug)) {
              const val = getCoreValue(slug);
              const gi = goalInfo(slug);
              return (
                <motion.div key={slug} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="overflow-hidden">
                  <div className="rounded-2xl bg-dark-elevated/50 border border-dark-border/40 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{act.emoji}</span>
                        <span className="text-[11px] font-black tracking-wider text-dark-text uppercase">{act.name}</span>
                      </div>
                      {gi && (
                        <span className="text-[9px] font-bold tracking-wider text-emerald-500">
                          {slug === 'plank' ? formatPlankTime(gi.goal) : slug === 'run' ? `${gi.goal.toFixed(1)}${gi.unit}` : gi.goal} GOAL
                          {' · '}{slug === 'plank' ? formatPlankTime(Math.max(gi.goal - gi.current, 0)) : slug === 'run' ? `${Math.max(gi.goal - gi.current, 0).toFixed(1)}${gi.unit}` : Math.max(gi.goal - gi.current, 0)} LEFT
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={(e) => { e.stopPropagation(); setCoreValue(slug, Math.max(0, Math.round((val - (slug === 'plank' ? 5 : slug === 'run' ? 0.1 : 1)) * 10) / 10)); }}
                        className="w-12 h-12 rounded-xl bg-dark-card border border-dark-border flex items-center justify-center text-dark-muted hover:text-red-400 hover:border-red-400/30 active:scale-90 transition-all flex-shrink-0">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 12h14"/></svg>
                      </button>
                      {slug === 'plank' ? (
                        <input type="text" inputMode="numeric" pattern="\d*"
                          value={val ? `${Math.floor(val / 60)}:${(val % 60).toString().padStart(2, '0')}` : ''}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (!raw.replace(/\D/g, '')) { setCoreValue(slug, 0); return; }
                            setCoreValue(slug, parsePlankMmSsDigitInput(raw));
                          }}
                          placeholder="0:00"
                          className="flex-1 min-w-0 text-center text-4xl font-black bg-transparent text-dark-text/30 focus:text-dark-text placeholder-dark-text/20 outline-none transition-colors py-1" />
                      ) : slug === 'run' ? (
                        <input type="number" step="0.1" value={val || ''} onChange={(e) => setCoreValue(slug, parseFloat(e.target.value) || 0)}
                          onWheel={(e) => (e.target as HTMLElement).blur()} placeholder="0.0"
                          className="flex-1 min-w-0 text-center text-4xl font-black bg-transparent text-dark-text/30 focus:text-dark-text placeholder-dark-text/20 outline-none transition-colors py-1" />
                      ) : (
                        <input type="number" value={val || ''} onChange={(e) => setCoreValue(slug, parseInt(e.target.value) || 0)}
                          onWheel={(e) => (e.target as HTMLElement).blur()} placeholder="0"
                          className="flex-1 min-w-0 text-center text-4xl font-black bg-transparent text-dark-text/30 focus:text-dark-text placeholder-dark-text/20 outline-none transition-colors py-1" />
                      )}
                      <button type="button" onClick={(e) => { e.stopPropagation(); setCoreValue(slug, Math.round((val + (slug === 'plank' ? 5 : slug === 'run' ? 0.1 : 1)) * 10) / 10); }}
                        className="w-12 h-12 rounded-xl bg-dark-card border border-dark-border flex items-center justify-center text-dark-muted hover:text-emerald-400 hover:border-emerald-500/30 active:scale-90 transition-all flex-shrink-0">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                      </button>
                    </div>
                    <p className="text-[9px] text-dark-muted text-center mt-1 font-semibold tracking-wider">
                      {slug === 'plank' ? '±5 SEC' : slug === 'run' ? `±0.1 ${unitLabel}` : '±1 REP'}
                    </p>
                  </div>
                </motion.div>
              );
            }

            // Non-core activity
            const val = flexValues[slug] || 0;
            return (
              <motion.div key={slug} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="overflow-hidden">
                <div className="rounded-2xl bg-dark-elevated/50 border border-dark-border/40 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{act.emoji}</span>
                    <span className="text-[11px] font-black tracking-wider text-dark-text uppercase">{act.name}</span>
                    <span className="text-[9px] text-dark-muted font-semibold">({act.unit})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={(e) => { e.stopPropagation(); setFlexValues(prev => ({ ...prev, [slug]: Math.max(0, Math.round(((prev[slug] || 0) - (act.unit === 'km' ? 0.1 : 1)) * 10) / 10) })); }}
                      className="w-12 h-12 rounded-xl bg-dark-card border border-dark-border flex items-center justify-center text-dark-muted hover:text-red-400 hover:border-red-400/30 active:scale-90 transition-all flex-shrink-0">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 12h14"/></svg>
                    </button>
                    <input type="number" step={act.unit === 'km' ? '0.1' : '1'} value={val || ''}
                      onChange={(e) => setFlexValues(prev => ({ ...prev, [slug]: parseFloat(e.target.value) || 0 }))}
                      onWheel={(e) => (e.target as HTMLElement).blur()} placeholder="0"
                      className="flex-1 min-w-0 text-center text-4xl font-black bg-transparent text-dark-text/30 focus:text-dark-text placeholder-dark-text/20 outline-none transition-colors py-1" />
                    <button type="button" onClick={(e) => { e.stopPropagation(); setFlexValues(prev => ({ ...prev, [slug]: Math.round(((prev[slug] || 0) + (act.unit === 'km' ? 0.1 : 1)) * 10) / 10 })); }}
                      className="w-12 h-12 rounded-xl bg-dark-card border border-dark-border flex items-center justify-center text-dark-muted hover:text-emerald-400 hover:border-emerald-500/30 active:scale-90 transition-all flex-shrink-0">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                    </button>
                  </div>
                  <p className="text-[9px] text-dark-muted text-center mt-1 font-semibold tracking-wider">
                    {act.unit === 'km' ? '±0.1 KM' : `±1 ${act.unit.toUpperCase()}`}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Action Buttons */}
        <div className="space-y-3">
          <motion.button whileTap={{ scale: 0.97 }} onClick={handleSubmit}
            disabled={isSubmitting || submitted || isSessionRefreshing || (!hasAnyInput && selectedSlugs.size === 0)}
            className="w-full py-4 rounded-2xl emerald-gradient font-black text-sm tracking-wider text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-all duration-200">
            {submitted ? <>{editLogId ? 'UPDATED ✓' : 'SUBMITTED ✓'}</>
              : isSessionRefreshing ? <>RECONNECTING...</>
              : isSubmitting ? <>{editLogId ? 'UPDATING...' : 'SUBMITTING...'}</>
              : <>
                  {editLogId ? 'UPDATE LOG' : 'SUBMIT'}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" />
                  </svg>
                </>
            }
          </motion.button>

          {hasAnyInput && !isSubmitting && !submitted && (
            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} whileTap={{ scale: 0.95 }}
              onClick={() => { setPushupReps(0); setPlankSeconds(0); setRunDistance(0); setSquatReps(0); setFlexValues({}); setSelectedSlugs(new Set()); setEditLogId(null); }}
              className="w-full py-3 rounded-xl bg-dark-elevated border border-dashed border-dark-border text-[10px] font-black tracking-widest text-dark-muted hover:text-red-400 hover:border-red-400/30 transition-all uppercase">
              ERASE & RESET
            </motion.button>
          )}

          {submitError && <p className="text-xs text-red-400 font-semibold text-center">{submitError}</p>}
        </div>
      </div>
    </AppShell>
  );
}
