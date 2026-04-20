'use client';

import { useState, useEffect, useCallback, useRef, Suspense, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppShell } from '@/components/layout/app-shell';
import { KCard, KEyebrow, KDisplay, KPill } from '@/components/ui/k-primitives';
import { EXERCISE_ICON_MAP } from '@/components/ui/k-icons';
import { K } from '@/lib/design-tokens';
import { useAuth } from '@/providers/auth-provider';
import { useLeaderboard } from '@/hooks/use-leaderboard';
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

function exerciseIconForSlug(slug: string) {
  return EXERCISE_ICON_MAP[slug] ?? EXERCISE_ICON_MAP[slug.replace(/s$/, '')];
}

export default function LogPageWrapper() {
  return (
    <Suspense fallback={<AppShell><div className="flex items-center justify-center pt-20"><div className="text-k-muted-soft text-sm">Loading...</div></div></AppShell>}>
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

  const { data: leaderboardWeek = [] } = useLeaderboard('week');
  const myRankWeek = useMemo(() => {
    if (!user) return 0;
    const i = leaderboardWeek.findIndex((e) => e.user_id === user.id);
    return i >= 0 ? i + 1 : 0;
  }, [leaderboardWeek, user]);

  const previewRunKm = useMemo(() => {
    if (profile?.unit_preference === 'imperial') return Number((runDistance * 1.60934).toFixed(3));
    return runDistance;
  }, [runDistance, profile?.unit_preference]);

  const previewScorePts = useMemo(() => {
    const b = calculateSessionScore(pushupReps, plankSeconds, previewRunKm, squatReps);
    return b.totalPts;
  }, [pushupReps, plankSeconds, previewRunKm, squatReps]);

  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryQuery, setLibraryQuery] = useState('');
  const [libraryTab, setLibraryTab] = useState<'all' | 'core' | 'more'>('all');

  const libraryCandidates = useMemo(() => {
    let list = activityTypes;
    if (libraryTab === 'core') list = list.filter((a) => a.is_core);
    if (libraryTab === 'more') list = list.filter((a) => !a.is_core);
    const q = libraryQuery.trim().toLowerCase();
    if (q) list = list.filter((a) => a.name.toLowerCase().includes(q) || a.slug.toLowerCase().includes(q));
    return list;
  }, [activityTypes, libraryTab, libraryQuery]);

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
      <div className="space-y-4 pt-1 pb-32" data-testid="uat-log-page">
        <div className="flex items-start justify-between gap-3">
          <div>
            <KEyebrow>Log session</KEyebrow>
            <KDisplay size={26} className="mt-1">
              {isToday ? 'TODAY' : format(selectedDate, 'EEE MMM d').toUpperCase()}
            </KDisplay>
          </div>
          <button
            type="button"
            onClick={() => setCalendarOpen(!calendarOpen)}
            className="flex items-center gap-1.5 text-[11px] font-bold text-k-muted-soft hover:text-emerald-600 dark:hover:text-emerald-400 uppercase tracking-wide shrink-0 mt-1"
          >
            History
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform duration-300 ${calendarOpen ? 'rotate-180' : ''}`}>
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </button>
        </div>

        {/* Calendar */}
        <AnimatePresence>
          {calendarOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-3">
              <KCard pad={12} className="!p-3">
                <style>{`
                  .kinetic-cal { --rdp-accent-color: ${K.green}; --rdp-background-color: ${K.mintSoft}; width: 100%; font-family: inherit; }
                  .kinetic-cal .rdp-months { width: 100%; } .kinetic-cal .rdp-month { width: 100%; }
                  .kinetic-cal .rdp-month_caption { font-size: 14px; font-weight: 800; color: var(--k-ink, #0B0D0C); letter-spacing: 0.08em; text-transform: uppercase; padding: 4px 0 8px; }
                  .kinetic-cal .rdp-weekday { font-size: 10px; font-weight: 700; color: var(--k-muted-soft, #9AA2A9); letter-spacing: 0.1em; text-transform: uppercase; }
                  .kinetic-cal .rdp-day { width: 36px; height: 36px; padding: 0; }
                  .kinetic-cal .rdp-day_button { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; color: var(--k-muted-soft, #9AA2A9); border-radius: 10px; transition: all 0.15s ease; }
                  .kinetic-cal .rdp-day_button:hover { background: ${K.mint}; }
                  .kinetic-cal .rdp-today { color: ${K.greenDeep} !important; font-weight: 800; }
                  .kinetic-cal .rdp-selected .rdp-day_button { background: ${K.green} !important; color: #fff !important; font-weight: 900; border-radius: 10px; }
                  .kinetic-cal .rdp-chevron { fill: var(--k-muted-soft, #9AA2A9); }
                  .kinetic-cal .day-has-log button { position: relative; }
                  .kinetic-cal .day-has-log button::after { content: ''; position: absolute; bottom: 3px; left: 50%; transform: translateX(-50%); width: 4px; height: 4px; border-radius: 50%; background: ${K.green}; }
                  .kinetic-cal .rdp-selected.day-has-log button::after { background: #fff; }
                  .kinetic-cal .rdp-nav { gap: 4px; }
                  .kinetic-cal .rdp-button_previous, .kinetic-cal .rdp-button_next { width: 28px; height: 28px; border-radius: 8px; background: ${K.mintSoft}; border: 1px solid ${K.lineStrong}; }
                `}</style>
                <DayPicker className="kinetic-cal" mode="single" selected={selectedDate} onSelect={handleDaySelect}
                  month={calendarMonth} onMonthChange={setCalendarMonth} modifiers={{ hasLog: loggedDays }}
                  modifiersClassNames={{ hasLog: 'day-has-log' }} showOutsideDays fixedWeeks />
              </KCard>

              {currentDayLogs.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-widest pl-1 mt-2">
                    Logs on {format(selectedDate, 'MMM d')}
                  </p>
                  {currentDayLogs.map(log => (
                    <button key={log.id} onClick={() => handleEditLog(log.id)}
                      className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition-colors ${
                        editLogId === log.id ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'border-k-line-strong bg-k-elevated text-k-ink hover:border-emerald-500/40'
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
                      !editLogId ? 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400' : 'border-k-line-strong text-k-muted-soft hover:text-emerald-600 dark:hover:text-emerald-400'
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
              className="flex-1 px-4 py-2.5 rounded-xl bg-k-elevated border border-k-line-strong text-xs font-bold tracking-wider text-k-muted-soft hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-500/30 transition-all disabled:opacity-50">
              {isImporting ? 'IMPORTING...' : '⌚ IMPORT RECENT WORKOUTS'}
            </button>
            {importResult && <span className="text-xs font-semibold text-emerald-500 animate-fade-in">{importResult}</span>}
          </div>
        )}

        <KCard pad={16} hi className="flex items-center justify-between gap-3">
          <div>
            <KEyebrow>Projected score</KEyebrow>
            <KDisplay size={28} className="mt-0.5 text-emerald-600 dark:text-emerald-400">
              ~{previewScorePts}
              <span className="text-base font-bold text-k-muted-soft ml-1">pts</span>
            </KDisplay>
            <p className="text-[11px] text-k-muted-soft mt-1 font-medium">Core session only — flex adds after submit.</p>
          </div>
          <div className="text-right shrink-0">
            <KEyebrow className="text-right">This week</KEyebrow>
            {myRankWeek > 0 ? (
              <p className="text-sm font-black text-k-ink mt-1">
                #{myRankWeek}
                <span className="block text-[10px] font-bold text-k-muted-soft tracking-wide uppercase">leaderboard</span>
              </p>
            ) : (
              <p className="text-xs text-k-muted-soft mt-1 max-w-[7rem] leading-snug">Rank appears once you are on the board.</p>
            )}
          </div>
        </KCard>

        {/* ==================== ACTIVITY GRID ==================== */}
        <div>
          <p className="text-[10px] font-black tracking-wider text-k-muted-soft uppercase mb-2">
            {editLogId ? 'ACTIVITIES' : 'TAP TO LOG'}
          </p>
          <div className="grid grid-cols-4 gap-2">
            {coreTypes.map(act => {
              const active = selectedSlugs.has(act.slug);
              const val = getCoreValue(act.slug as CoreSlug);
              return (
                <motion.button
                  key={act.slug}
                  type="button"
                  data-testid={`uat-log-tile-${act.slug}`}
                  onClick={() => toggleActivity(act.slug)}
                  whileTap={{ scale: 0.92 }}
                  className={`relative flex flex-col items-center justify-center py-3 px-1 rounded-2xl border transition-all ${
                    active
                      ? 'bg-emerald-500/12 border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                      : 'bg-k-elevated/60 border-k-line-strong/80 hover:border-k-line-strong'
                  }`}>
                  <span className="text-xl mb-0.5">{act.emoji}</span>
                  <span className={`text-[9px] font-bold tracking-wide ${active ? 'text-emerald-600 dark:text-emerald-400' : 'text-k-muted-soft'}`}>
                    {act.name.split(' ')[0]}
                  </span>
                  {active && val > 0 && (
                    <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {act.slug === 'plank' ? formatPlankTime(val) : act.slug === 'run' ? `${val}${unitLabel.toLowerCase()}` : val}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>

          {flexTypes.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap gap-2">
                {flexTypes
                  .filter((act) => selectedSlugs.has(act.slug))
                  .map((act) => {
                    const val = flexValues[act.slug] || 0;
                    const Icon = exerciseIconForSlug(act.slug);
                    return (
                      <motion.button
                        key={act.slug}
                        type="button"
                        onClick={() => toggleActivity(act.slug)}
                        whileTap={{ scale: 0.95 }}
                        className="inline-flex items-center gap-2 pl-2 pr-3 py-2 rounded-k-pill border border-emerald-500/25 bg-k-mint-soft dark:bg-emerald-500/10"
                      >
                        {Icon ? <Icon size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0" /> : <span className="text-base">{act.emoji}</span>}
                        <span className="text-[11px] font-bold text-k-ink max-w-[120px] truncate">{act.name}</span>
                        {val > 0 && <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">{val}</span>}
                      </motion.button>
                    );
                  })}
              </div>
              <button
                type="button"
                data-testid="uat-log-exercise-library"
                onClick={() => {
                  setLibraryOpen(true);
                  setLibraryQuery('');
                }}
                className="w-full py-3 rounded-k-md border border-dashed border-k-line-strong text-[11px] font-black tracking-widest text-k-muted-soft hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-500/35 transition-all uppercase bg-k-elevated/40"
              >
                + Exercise library
              </button>
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
                  <div className="rounded-2xl bg-k-elevated/70 border border-k-line-strong/80 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{act.emoji}</span>
                        <span className="text-[11px] font-black tracking-wider text-k-ink uppercase">{act.name}</span>
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
                        className="w-12 h-12 rounded-xl bg-k-card border border-k-line-strong flex items-center justify-center text-k-muted-soft hover:text-red-500 hover:border-red-400/40 active:scale-90 transition-all flex-shrink-0">
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
                          className="flex-1 min-w-0 text-center text-4xl font-black bg-transparent text-k-ink/25 focus:text-k-ink placeholder-k-muted-soft/40 outline-none transition-colors py-1" />
                      ) : slug === 'run' ? (
                        <input type="number" step="0.1" value={val || ''} onChange={(e) => setCoreValue(slug, parseFloat(e.target.value) || 0)}
                          onWheel={(e) => (e.target as HTMLElement).blur()} placeholder="0.0"
                          className="flex-1 min-w-0 text-center text-4xl font-black bg-transparent text-k-ink/25 focus:text-k-ink placeholder-k-muted-soft/40 outline-none transition-colors py-1" />
                      ) : (
                        <input
                          type="number"
                          value={val || ''}
                          onChange={(e) => setCoreValue(slug, parseInt(e.target.value) || 0)}
                          onWheel={(e) => (e.target as HTMLElement).blur()}
                          placeholder="0"
                          data-testid={slug === 'pushups' ? 'uat-log-pushup-reps' : undefined}
                          className="flex-1 min-w-0 text-center text-4xl font-black bg-transparent text-k-ink/25 focus:text-k-ink placeholder-k-muted-soft/40 outline-none transition-colors py-1"
                        />
                      )}
                      <button type="button" onClick={(e) => { e.stopPropagation(); setCoreValue(slug, Math.round((val + (slug === 'plank' ? 5 : slug === 'run' ? 0.1 : 1)) * 10) / 10); }}
                        className="w-12 h-12 rounded-xl bg-k-card border border-k-line-strong flex items-center justify-center text-k-muted-soft hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-500/35 active:scale-90 transition-all flex-shrink-0">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                      </button>
                    </div>
                    <p className="text-[9px] text-k-muted-soft text-center mt-1 font-semibold tracking-wider">
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
                <div className="rounded-2xl bg-k-elevated/70 border border-k-line-strong/80 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{act.emoji}</span>
                    <span className="text-[11px] font-black tracking-wider text-k-ink uppercase">{act.name}</span>
                    <span className="text-[9px] text-k-muted-soft font-semibold">({act.unit})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={(e) => { e.stopPropagation(); setFlexValues(prev => ({ ...prev, [slug]: Math.max(0, Math.round(((prev[slug] || 0) - (act.unit === 'km' ? 0.1 : 1)) * 10) / 10) })); }}
                      className="w-12 h-12 rounded-xl bg-k-card border border-k-line-strong flex items-center justify-center text-k-muted-soft hover:text-red-500 hover:border-red-400/40 active:scale-90 transition-all flex-shrink-0">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 12h14"/></svg>
                    </button>
                    <input type="number" step={act.unit === 'km' ? '0.1' : '1'} value={val || ''}
                      onChange={(e) => setFlexValues(prev => ({ ...prev, [slug]: parseFloat(e.target.value) || 0 }))}
                      onWheel={(e) => (e.target as HTMLElement).blur()} placeholder="0"
                      className="flex-1 min-w-0 text-center text-4xl font-black bg-transparent text-k-ink/25 focus:text-k-ink placeholder-k-muted-soft/40 outline-none transition-colors py-1" />
                    <button type="button" onClick={(e) => { e.stopPropagation(); setFlexValues(prev => ({ ...prev, [slug]: Math.round(((prev[slug] || 0) + (act.unit === 'km' ? 0.1 : 1)) * 10) / 10 })); }}
                      className="w-12 h-12 rounded-xl bg-k-card border border-k-line-strong flex items-center justify-center text-k-muted-soft hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-500/35 active:scale-90 transition-all flex-shrink-0">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                    </button>
                  </div>
                  <p className="text-[9px] text-k-muted-soft text-center mt-1 font-semibold tracking-wider">
                    {act.unit === 'km' ? '±0.1 KM' : `±1 ${act.unit.toUpperCase()}`}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Action Buttons */}
        <div className="space-y-3">
          <motion.button whileTap={{ scale: 0.97 }} onClick={handleSubmit} data-testid="uat-log-submit"
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
              className="w-full py-3 rounded-xl bg-k-elevated border border-dashed border-k-line-strong text-[10px] font-black tracking-widest text-k-muted-soft hover:text-red-500 hover:border-red-400/35 transition-all uppercase">
              ERASE & RESET
            </motion.button>
          )}

          {submitError && <p className="text-xs text-red-500 font-semibold text-center">{submitError}</p>}
        </div>
      </div>

      <AnimatePresence>
        {libraryOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close exercise library"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/45 backdrop-blur-[2px]"
              onClick={() => setLibraryOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="log-exercise-library-title"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 420, damping: 38 }}
              className="fixed inset-x-0 bottom-0 z-[70] max-h-[min(88dvh,640px)] rounded-t-k-lg bg-k-card shadow-k-card-hi border-t border-k-line-strong flex flex-col"
            >
              <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-k-line-strong shrink-0">
                <div id="log-exercise-library-title">
                  <KEyebrow>Exercise library</KEyebrow>
                  <p className="text-sm font-bold text-k-ink mt-0.5">Add to this session</p>
                </div>
                <button
                  type="button"
                  onClick={() => setLibraryOpen(false)}
                  className="w-10 h-10 rounded-full bg-k-elevated text-k-muted-soft font-bold text-lg leading-none hover:text-k-ink"
                >
                  ×
                </button>
              </div>
              <div className="px-4 py-3 space-y-3 overflow-y-auto flex-1 min-h-0">
                <input
                  type="search"
                  value={libraryQuery}
                  onChange={(e) => setLibraryQuery(e.target.value)}
                  placeholder="Search exercises…"
                  className="w-full rounded-k-md border border-k-line-strong bg-k-bg px-3 py-2.5 text-sm text-k-ink placeholder:text-k-muted-soft outline-none focus:border-emerald-500/50"
                />
                <div className="flex flex-wrap gap-2">
                  {(['all', 'core', 'more'] as const).map((tab) => (
                    <KPill key={tab} active={libraryTab === tab} size="sm" onClick={() => setLibraryTab(tab)}>
                      {tab === 'all' ? 'All' : tab === 'core' ? 'Core' : 'More'}
                    </KPill>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 pb-4">
                  {libraryCandidates.map((act) => {
                    const on = selectedSlugs.has(act.slug);
                    const Icon = exerciseIconForSlug(act.slug);
                    return (
                      <button
                        key={act.slug}
                        type="button"
                        onClick={() => {
                          toggleActivity(act.slug);
                        }}
                        className={`text-left rounded-k-md border p-3 flex flex-col gap-2 transition-colors ${
                          on ? 'border-emerald-500/45 bg-k-mint-soft dark:bg-emerald-500/10' : 'border-k-line-strong bg-k-elevated/50 hover:border-emerald-500/30'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-9 h-9 rounded-k-sm bg-k-card border border-k-line-strong flex items-center justify-center shrink-0 text-k-green">
                            {Icon ? <Icon size={22} className="text-emerald-600 dark:text-emerald-400" /> : <span className="text-lg">{act.emoji}</span>}
                          </div>
                          <span className="text-[12px] font-bold text-k-ink leading-tight line-clamp-2">{act.name}</span>
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-wider ${on ? 'text-emerald-600 dark:text-emerald-400' : 'text-k-muted-soft'}`}>
                          {on ? 'Added' : 'Add'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
