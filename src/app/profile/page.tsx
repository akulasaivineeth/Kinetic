'use client';

import { useState, useRef, Suspense, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { KCard, KEyebrow, KDisplay, KRing } from '@/components/ui/k-primitives';
import { useAuth } from '@/providers/auth-provider';
import { useTier } from '@/hooks/use-tier';
import { useTheme } from '@/providers/theme-provider';
import { useGoals, useUpdateGoals } from '@/hooks/use-goals';
import { useSharingConnections, useSendSharingRequest, useRemoveSharing } from '@/hooks/use-sharing';
import { getInitials } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { resizeImage } from '@/lib/image-resize';
import { useSearchParams } from 'next/navigation';
import { SCORING_FAQ } from '@/lib/scoring';
import { useQueryClient } from '@tanstack/react-query';

function ProfilePageContent() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { tier, isLoading: tierLoading } = useTier();
  const searchParams = useSearchParams();
  const whoopParam = searchParams.get('whoop');
  const whoopReason = searchParams.get('reason');
  const { theme, toggleTheme } = useTheme();
  const { data: goals } = useGoals();
  const updateGoals = useUpdateGoals();
  const { data: connections = [] } = useSharingConnections();
  const sendRequest = useSendSharingRequest();
  const removeSharing = useRemoveSharing();

  const [showGoals, setShowGoals] = useState(false);
  const [showSharing, setShowSharing] = useState(false);
  const [showInvites, setShowInvites] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [shareConfirm, setShareConfirm] = useState(false);
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState('');
  const [shareError, setShareError] = useState<string | null>(null);
  const [updatingUnit, setUpdatingUnit] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Controlled goal state
  const [goalDraft, setGoalDraft] = useState<Record<string, number>>({});
  const [goalsSaved, setGoalsSaved] = useState(false);
  const [goalsSaving, setGoalsSaving] = useState(false);

  // Sync goal draft from server data when it loads
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

  const handleSaveGoals = async () => {
    setGoalsSaving(true);
    setGoalsSaved(false);
    try {
      await updateGoals.mutateAsync(goalDraft);
      // Invalidate dashboard queries so changes reflect immediately
      queryClient.invalidateQueries({ queryKey: ['weekly-volume'] });
      queryClient.invalidateQueries({ queryKey: ['stamina'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setGoalsSaved(true);
      setTimeout(() => setGoalsSaved(false), 2500);
    } catch (e) {
      console.error('Goal save failed:', e);
    } finally {
      setGoalsSaving(false);
    }
  };

  const goalsDirty = goals && Object.keys(goalDraft).length > 0 && Object.entries(goalDraft).some(
    ([key, val]) => val !== (goals as Record<string, unknown>)[key]
  );

  // Avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setAvatarError(null);
    let uploadBlob: Blob | File = file;
    try {
      uploadBlob = await resizeImage(file, 200, 200, 0.85);
    } catch {
      /* fall through */
    }

    const supabase = createClient();
    const fileName = `${user.id}/${Date.now()}.jpg`;
    const { data, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, uploadBlob, {
        upsert: true,
        contentType: 'image/jpeg',
      });

    if (uploadError) {
      setAvatarError(uploadError.message);
      e.target.value = '';
      return;
    }

    if (!data) {
      setAvatarError('Upload failed');
      e.target.value = '';
      return;
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(data.path);
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ avatar_url: urlData.publicUrl, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (profileError) {
      setAvatarError(profileError.message);
      e.target.value = '';
      return;
    }

    await refreshProfile();
    e.target.value = '';
  };

  // Generate invite link
  const generateInvite = async () => {
    if (!profile?.is_admin) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from('invite_links')
      .insert({ created_by: user!.id })
      .select()
      .single();
    if (!error && data) {
      const link = `${window.location.origin}/?invite=${data.code}`;
      setInviteLink(link);
    }
  };

  // Send sharing request
  const handleSendShare = async () => {
    if (!shareEmail) return;
    setShareError(null);
    if (!shareConfirm) {
      setShareConfirm(true);
      return;
    }
    try {
      await sendRequest.mutateAsync(shareEmail);
      setShareEmail('');
      setShareConfirm(false);
    } catch (e) {
      setShareError(e instanceof Error ? e.message : 'Could not send request');
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 pt-4">
        {whoopParam === 'connected' && (
          <div className="px-1 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-center text-xs font-semibold text-emerald-500">
            Whoop connected successfully.
          </div>
        )}
        {whoopParam === 'error' && (
          <div className="px-1 py-2 rounded-xl bg-red-500/10 border border-red-500/25 text-center text-[11px] font-semibold text-red-400">
            Whoop connection failed
            {whoopReason === 'no_session'
              ? ' — sign in to Kinetic in this browser, then try Connect again.'
              : whoopReason === 'token'
                ? ' — check Whoop app redirect URL matches this site (including port).'
                : whoopReason
                  ? ` (${whoopReason})`
                  : '.'}
          </div>
        )}
        {/* Avatar + tier */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center"
        >
          <div className="relative mb-3 flex justify-center">
            <KRing pct={tierLoading ? 0.35 : tier.pct} size={132} stroke={9} color={tier.color}>
              <div className="w-[92px] h-[92px] rounded-full overflow-hidden bg-k-elevated ring-2 ring-k-card shadow-k-card">
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt="Avatar"
                    width={92}
                    height={92}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl font-black text-emerald-600 dark:text-emerald-400">
                    {getInitials(profile?.full_name || 'U')}
                  </div>
                )}
              </div>
            </KRing>
            {/* Edit button */}
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              </svg>
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
          {avatarError && (
            <p className="text-center text-xs font-semibold text-red-400 px-4 -mt-2 mb-1 max-w-sm">
              {avatarError}
            </p>
          )}

          <h2 className="text-2xl font-black text-k-ink">
            {profile?.full_name || 'User'}
          </h2>
          <p className="text-xs font-bold tracking-[0.2em] text-emerald-600 dark:text-emerald-400 uppercase mt-1">
            {tierLoading ? '…' : `${tier.name} tier`}
          </p>
          <p className="text-[11px] text-k-muted-soft mt-1 text-center max-w-xs leading-snug">
            {tier.next
              ? `${Math.round(Math.min(1, tier.pct) * 100)}% to ${tier.next.name}`
              : 'Max tier — stay dangerous.'}
          </p>
        </motion.div>

        <Link href="/library" className="block">
          <KCard pad={16} hi className="flex items-center justify-between gap-3 !py-3.5">
            <div>
              <KEyebrow>Training</KEyebrow>
              <KDisplay size={18} className="mt-0.5 !font-bold !not-italic">
                Exercise library
              </KDisplay>
              <p className="text-[11px] text-k-muted-soft mt-1">Browse all moves · add in Log</p>
            </div>
            <span className="text-k-muted-soft text-lg" aria-hidden>
              →
            </span>
          </KCard>
        </Link>

        <div>
          <p className="text-[10px] font-semibold tracking-[0.2em] text-k-muted-soft uppercase mb-3">
            SETTINGS
          </p>

          <KCard pad={18} className="flex flex-col py-3 px-4 gap-4">
            {/* Appearance */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg">{theme === 'dark' ? '🌙' : '☀️'}</span>
                <p className="text-sm font-semibold text-k-ink">Appearance</p>
              </div>
              <button
                type="button"
                data-testid="uat-profile-theme-toggle"
                onClick={toggleTheme}
                className={`w-12 h-7 rounded-full relative transition-colors duration-200 ${
                  theme === 'dark' ? 'bg-emerald-500' : 'bg-k-line-strong'
                }`}
              >
                <motion.div
                  className="w-5 h-5 rounded-full bg-white absolute top-1"
                  animate={{ left: theme === 'dark' ? 24 : 4 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                />
              </button>
            </div>

            <div className="h-px bg-white/5 w-full" />

            {/* Units */}
            {/* Units */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg">📏</span>
                <p className="text-sm font-semibold text-k-ink">Unit Preference</p>
              </div>
              <button
                onClick={async () => {
                  if (!user || updatingUnit) return;
                  setUpdatingUnit(true);
                  const newUnit = profile?.unit_preference === 'imperial' ? 'metric' : 'imperial';
                  const supabase = createClient();
                  try {
                    await supabase
                      .from('profiles')
                      .update({ unit_preference: newUnit, updated_at: new Date().toISOString() })
                      .eq('id', user.id);
                    await refreshProfile();
                  } finally {
                    setUpdatingUnit(false);
                  }
                }}
                disabled={updatingUnit}
                className="px-3 py-1.5 rounded-xl bg-k-elevated border border-k-line-strong text-[10px] font-bold tracking-wider text-emerald-500 hover:border-emerald-500/30 transition-all font-mono disabled:opacity-60 uppercase"
              >
                {updatingUnit ? 'UPDATING...' : (profile?.unit_preference === 'imperial' ? 'MILES' : 'KILOMETERS')}
              </button>
            </div>

            <div className="h-px bg-white/5 w-full" />

            {/* Whoop */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg">⌚</span>
                <p className="text-sm font-semibold text-k-ink">Whoop Integration</p>
              </div>
              <a
                href={profile?.whoop_user_id ? "#" : "/api/whoop/auth"}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-wider transition-all uppercase ${
                  profile?.whoop_user_id 
                    ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30' 
                    : 'bg-k-elevated border border-k-line-strong text-k-muted-soft hover:text-white'
                }`}
              >
                {profile?.whoop_user_id ? 'CONNECTED' : 'CONNECT'}
              </a>
            </div>
          </KCard>

          <div className="h-4" />

          {/* Performance Goals */}
          <KCard pad={18} className="flex items-center gap-3 cursor-pointer" onClick={() => setShowGoals(!showGoals)}>
            <div className="w-10 h-10 rounded-xl bg-k-elevated flex items-center justify-center">
              <span className="text-lg">🎯</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-k-ink">Performance Goals</p>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="21" x2="4" y2="14" />
              <line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" />
              <line x1="20" y1="12" x2="20" y2="3" />
            </svg>
          </KCard>

          {/* Goals Editor */}
          <AnimatePresence>
            {showGoals && goals && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-2 space-y-2">
                  {[
                    { label: 'Push-up Weekly Goal', key: 'pushup_weekly_goal' as const, suffix: 'reps' },
                    { label: 'Squat Weekly Goal', key: 'squat_weekly_goal' as const, suffix: 'reps' },
                    { label: 'Plank Weekly Goal', key: 'plank_weekly_goal' as const, suffix: 'sec' },
                    { label: 'Run Weekly Goal', key: 'run_weekly_goal' as const, suffix: 'km' },
                    { label: 'Push-up Peak Goal', key: 'pushup_peak_goal' as const, suffix: 'reps' },
                    { label: 'Plank Peak Goal', key: 'plank_peak_goal' as const, suffix: 'sec' },
                    { label: 'Run Peak Goal', key: 'run_peak_goal' as const, suffix: 'km' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between px-4 py-2 rounded-xl bg-k-elevated/50">
                      <span className="text-xs text-k-muted-soft">{item.label}</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={goalDraft[item.key] ?? ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) {
                              setGoalDraft((prev) => ({ ...prev, [item.key]: val }));
                            } else if (e.target.value === '') {
                              setGoalDraft((prev) => ({ ...prev, [item.key]: 0 }));
                            }
                          }}
                          onWheel={(e) => (e.target as HTMLElement).blur()}
                          className="w-16 text-right text-sm font-bold bg-transparent text-k-ink outline-none"
                        />
                        <span className="text-[10px] text-k-muted-soft">{item.suffix}</span>
                      </div>
                    </div>
                  ))}

                  {/* Save Goals Button */}
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSaveGoals}
                    disabled={goalsSaving || !goalsDirty}
                    className={`w-full py-3 rounded-xl text-[11px] font-black tracking-widest uppercase transition-all ${
                      goalsSaved
                        ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                        : goalsDirty
                          ? 'emerald-gradient text-black shadow-lg shadow-emerald-500/20'
                          : 'bg-k-elevated border border-k-line-strong text-k-muted-soft'
                    }`}
                  >
                    {goalsSaving ? 'SAVING...' : goalsSaved ? '✓ SAVED' : goalsDirty ? 'SAVE GOALS' : 'NO CHANGES'}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="h-2" />

          {/* Sharing */}
          <KCard
            pad={18}
            data-testid="uat-profile-sharing-card"
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => setShowSharing(!showSharing)}
          >
            <div className="w-10 h-10 rounded-xl bg-k-elevated flex items-center justify-center">
              <span className="text-lg">👥</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-k-ink">Sharing</p>
              <p className="text-[10px] text-k-muted-soft">{connections.filter((c: { status: string; requester_id: string; recipient_id: string }) => c.status === 'accepted' || c.status === 'pending').length} connections ({connections.filter((c: { status: string }) => c.status === 'accepted').length} active, {connections.filter((c: { status: string }) => c.status === 'pending').length} pending)</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round">
              <polyline points={showSharing ? "18 15 12 9 6 15" : "9 18 15 12 9 6"} />
            </svg>
          </KCard>

          <AnimatePresence>
            {showSharing && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-2 space-y-2">
                  {/* Share by email */}
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={shareEmail}
                      onChange={(e) => {
                        setShareEmail(e.target.value);
                        setShareConfirm(false);
                        setShareError(null);
                      }}
                      placeholder="Search by email..."
                      className="flex-1 px-3 py-2 rounded-xl bg-k-elevated text-sm text-k-ink placeholder-k-muted-soft outline-none border border-k-line-strong focus:border-emerald-500/50 transition-colors"
                    />
                    <button
                      onClick={handleSendShare}
                      className="px-4 py-2 rounded-xl bg-emerald-500/15 text-emerald-500 text-xs font-bold tracking-wider"
                    >
                      {shareConfirm ? 'CONFIRM' : 'SEND'}
                    </button>
                  </div>
                  {shareConfirm && (
                    <p className="text-[10px] text-emerald-500 px-1">
                      Press CONFIRM to send sharing request to {shareEmail}
                    </p>
                  )}
                  {shareError && (
                    <p className="text-[10px] text-red-400 px-1 font-semibold">{shareError}</p>
                  )}

                  {/* Active connections */}
                  {connections
                    .filter((c: { status: string }) => c.status === 'accepted')
                    .map((conn: { id: string; requester: { full_name: string; email: string } | null; recipient: { full_name: string; email: string } | null }) => {
                      const other = conn.requester?.email === profile?.email ? conn.recipient : conn.requester;
                      return (
                        <div key={conn.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-k-elevated/50">
                          <span className="text-xs text-k-ink">{other?.full_name || other?.email}</span>
                          <button
                            onClick={() => {
                              if (removeConfirmId === conn.id) {
                                removeSharing.mutate(conn.id);
                                setRemoveConfirmId(null);
                              } else {
                                setRemoveConfirmId(conn.id);
                                setTimeout(() => setRemoveConfirmId(null), 3000);
                              }
                            }}
                            className={`text-[10px] font-bold tracking-wider px-2 py-1 rounded-lg transition-all ${
                              removeConfirmId === conn.id ? 'bg-red-500 text-white' : 'text-red-400'
                            }`}
                          >
                            {removeConfirmId === conn.id ? 'CONFIRM REMOVAL' : 'REMOVE'}
                          </button>
                        </div>
                      );
                    })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Invite Links (Admin only) */}
          {profile?.is_admin && (
            <>
              <div className="h-2" />
              <KCard pad={18} className="flex items-center gap-3 cursor-pointer" onClick={() => setShowInvites(!showInvites)}>
                <div className="w-10 h-10 rounded-xl bg-k-elevated flex items-center justify-center">
                  <span className="text-lg">🔗</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-k-ink">Invite Links</p>
                  <p className="text-[10px] text-k-muted-soft">Admin: generate one-time invite links</p>
                </div>
              </KCard>

              <AnimatePresence>
                {showInvites && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-2 space-y-2">
                      <button
                        onClick={generateInvite}
                        className="w-full px-4 py-2.5 rounded-xl bg-emerald-500/15 text-emerald-500 text-xs font-bold tracking-wider"
                      >
                        GENERATE NEW INVITE LINK
                      </button>
                      {inviteLink && (
                        <div className="px-3 py-2 rounded-xl bg-k-elevated">
                          <p className="text-[10px] text-k-muted-soft mb-1">Share this link:</p>
                          <p className="text-xs text-emerald-400 break-all font-mono">{inviteLink}</p>
                          <button
                            onClick={() => navigator.clipboard.writeText(inviteLink)}
                            className="mt-2 text-[10px] font-semibold text-k-muted-soft"
                          >
                            COPY TO CLIPBOARD
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>

        {/* FAQ / How Scoring Works */}
        <div>
          <p className="text-[10px] font-semibold tracking-[0.2em] text-k-muted-soft uppercase mb-3">
            HELP & FAQ
          </p>
          <KCard pad={18} className="flex items-center gap-3 cursor-pointer" onClick={() => setShowFaq(!showFaq)}>
            <div className="w-10 h-10 rounded-xl bg-k-elevated flex items-center justify-center">
              <span className="text-lg">❓</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-k-ink">How Scoring Works & FAQ</p>
              <p className="text-[10px] text-k-muted-soft">Scoring tiers, streaks, milestones, and more</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round">
              <polyline points={showFaq ? "18 15 12 9 6 15" : "9 18 15 12 9 6"} />
            </svg>
          </KCard>

          <AnimatePresence>
            {showFaq && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-2 space-y-2">
                  {SCORING_FAQ.map((faq, i) => (
                    <div key={i} className="px-4 py-3 rounded-xl bg-k-elevated/50">
                      <p className="text-xs font-bold text-k-ink mb-1">{faq.question}</p>
                      <p className="text-[11px] text-k-muted-soft leading-relaxed">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Data & Export */}
        <div>
          <p className="text-[10px] font-semibold tracking-[0.2em] text-k-muted-soft uppercase mb-3">
            DATA & EXPORT
          </p>
          <a
            href="/api/export"
            download
            data-testid="uat-profile-export-csv"
            className="block w-full"
          >
            <KCard pad={18} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-k-elevated flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-k-ink">Export Data (CSV)</p>
                <p className="text-[10px] text-k-muted-soft">Download all your workout logs</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </KCard>
          </a>
        </div>

        {/* Deactivate Session / Logout */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={async () => {
            if (signingOut) return;
            setSigningOut(true);
            try {
              await signOut();
              // Full navigation so middleware sees cleared session cookies (client router alone can race)
              window.location.assign('/');
            } finally {
              setSigningOut(false);
            }
          }}
          disabled={signingOut}
          className="w-full py-4 rounded-2xl border border-red-500/30 bg-red-500/5 font-bold text-sm tracking-wider text-red-400 flex items-center justify-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          {signingOut ? 'SIGNING OUT...' : 'LOG OUT'}
        </motion.button>

        {/* Version */}
        <p className="text-center text-[10px] text-k-muted-soft/40 tracking-wider pb-4">
          KINETIC PWA V4.2.0 • BUILD 2026
        </p>
      </div>
    </AppShell>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="flex items-center justify-center pt-20 text-k-muted-soft text-sm">
            Loading profile…
          </div>
        </AppShell>
      }
    >
      <ProfilePageContent />
    </Suspense>
  );
}
