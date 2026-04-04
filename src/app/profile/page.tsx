'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { AppShell } from '@/components/layout/app-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { useGoals, useUpdateGoals } from '@/hooks/use-goals';
import { useSharingConnections, useSendSharingRequest, useRemoveSharing } from '@/hooks/use-sharing';
import { getInitials } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useSearchParams } from 'next/navigation';

export default function ProfilePage() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { data: goals } = useGoals();
  const updateGoals = useUpdateGoals();
  const { data: connections = [] } = useSharingConnections();
  const sendRequest = useSendSharingRequest();
  const removeSharing = useRemoveSharing();

  const [showGoals, setShowGoals] = useState(false);
  const [showSharing, setShowSharing] = useState(false);
  const [showInvites, setShowInvites] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [shareConfirm, setShareConfirm] = useState(false);
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState('');
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const supabase = createClient();
    const fileName = `${user.id}/${Date.now()}.jpg`;
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, { upsert: true });

    if (!error && data) {
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(data.path);
      await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      await refreshProfile();
    }
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
    if (!shareConfirm) {
      setShareConfirm(true);
      return;
    }
    try {
      await sendRequest.mutateAsync(shareEmail);
      setShareEmail('');
      setShareConfirm(false);
    } catch {
      // Error
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 pt-4">
        {/* Avatar Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center"
        >
          <div className="relative mb-4">
            {/* Emerald ring around avatar */}
            <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-br from-emerald-400 to-emerald-600">
              <div className="w-full h-full rounded-full overflow-hidden bg-dark-bg p-0.5">
                <div className="w-full h-full rounded-full overflow-hidden bg-dark-elevated">
                  {profile?.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt="Avatar"
                      width={128}
                      height={128}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-black text-emerald-500">
                      {getInitials(profile?.full_name || 'U')}
                    </div>
                  )}
                </div>
              </div>
            </div>
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

          <h2 className="text-2xl font-black text-dark-text">
            {profile?.full_name || 'User'}
          </h2>
          <p className="text-xs font-bold tracking-[0.2em] text-emerald-500 uppercase mt-1">
            ELITE MEMBER
          </p>
        </motion.div>

        {/* Account Identity */}
        <div>
          <p className="text-[10px] font-semibold tracking-[0.2em] text-dark-muted uppercase mb-3">
            ACCOUNT IDENTITY
          </p>

          <GlassCard className="flex items-center gap-3" delay={0.1}>
            <div className="w-10 h-10 rounded-xl bg-dark-elevated flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold tracking-wider text-emerald-500 uppercase">
                FULL NAME
              </p>
              <p className="text-sm font-semibold text-dark-text truncate">
                {profile?.full_name || 'Not set'}
              </p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </GlassCard>

          <div className="h-2" />

          <GlassCard className="flex items-center gap-3" delay={0.15}>
            <div className="w-10 h-10 rounded-xl bg-dark-elevated flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold tracking-wider text-dark-muted uppercase">
                CONNECTED ACCOUNT
              </p>
              <p className="text-sm font-semibold text-dark-text truncate">
                {profile?.email || user?.email || 'Not connected'}
              </p>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 text-[10px] font-bold tracking-wider">
              CONNECTED
            </span>
          </GlassCard>

          <div className="h-2" />

          {/* Whoop Connect */}
          <GlassCard className="flex items-center gap-3" delay={0.2}>
            <div className="w-10 h-10 rounded-xl bg-dark-elevated flex items-center justify-center">
              <span className="text-lg">⌚</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold tracking-wider text-dark-muted uppercase">
                WHOOP
              </p>
              <p className="text-sm font-semibold text-dark-text">
                {profile?.whoop_user_id ? `Connected (ID: ${profile.whoop_user_id})` : 'Not connected'}
              </p>
            </div>
            {profile?.whoop_user_id ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 text-[10px] font-bold tracking-wider">
                CONNECTED
              </span>
            ) : (
              <a
                href="/api/whoop/auth"
                className="px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-500 text-[10px] font-bold tracking-wider"
              >
                CONNECT
              </a>
            )}
          </GlassCard>
        </div>

        {/* System & Goals */}
        <div>
          <p className="text-[10px] font-semibold tracking-[0.2em] text-dark-muted uppercase mb-3">
            SYSTEM & GOALS
          </p>

          {/* Dark Mode Toggle */}
          <GlassCard className="flex items-center gap-3" delay={0.2}>
            <div className="w-10 h-10 rounded-xl bg-dark-elevated flex items-center justify-center">
              <span className="text-lg">🌙</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-dark-text">Dark Mode</p>
              <p className="text-[10px] text-dark-muted">Default performance theme</p>
            </div>
            <button
              onClick={toggleTheme}
              className={`w-12 h-7 rounded-full relative transition-colors duration-200 ${
                theme === 'dark' ? 'bg-emerald-500' : 'bg-dark-border'
              }`}
            >
              <motion.div
                className="w-5 h-5 rounded-full bg-white absolute top-1"
                animate={{ left: theme === 'dark' ? 24 : 4 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </GlassCard>

          <div className="h-2" />

          {/* Unit Preference Toggle */}
          <GlassCard className="flex items-center gap-3" delay={0.22}>
            <div className="w-10 h-10 rounded-xl bg-dark-elevated flex items-center justify-center">
              <span className="text-lg">📏</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-dark-text">Unit Preference</p>
              <p className="text-[10px] text-dark-muted">
                {profile?.unit_preference === 'imperial' ? 'Imperial (Miles)' : 'Metric (Kilometers)'}
              </p>
            </div>
            <button
              onClick={async () => {
                const newUnit = profile?.unit_preference === 'imperial' ? 'metric' : 'imperial';
                const supabase = createClient();
                await supabase
                  .from('profiles')
                  .update({ unit_preference: newUnit, updated_at: new Date().toISOString() })
                  .eq('id', user!.id);
                await refreshProfile();
              }}
              className="px-3 py-1.5 rounded-xl bg-dark-elevated border border-dark-border text-[10px] font-bold tracking-wider text-emerald-500 hover:border-emerald-500/30 transition-all font-mono"
            >
              {profile?.unit_preference?.toUpperCase() || 'METRIC'}
            </button>
          </GlassCard>

          <div className="h-2" />

          {/* Performance Goals */}
          <GlassCard
            className="flex items-center gap-3 cursor-pointer"
            delay={0.25}
            onClick={() => setShowGoals(!showGoals)}
          >
            <div className="w-10 h-10 rounded-xl bg-dark-elevated flex items-center justify-center">
              <span className="text-lg">🎯</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-dark-text">Performance Goals</p>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="21" x2="4" y2="14" />
              <line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" />
              <line x1="20" y1="12" x2="20" y2="3" />
            </svg>
          </GlassCard>

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
                    { label: 'Push-up Weekly Goal', key: 'pushup_weekly_goal' as const, value: goals.pushup_weekly_goal, suffix: 'reps' },
                    { label: 'Plank Weekly Goal', key: 'plank_weekly_goal' as const, value: goals.plank_weekly_goal, suffix: 'sec' },
                    { label: 'Run Weekly Goal', key: 'run_weekly_goal' as const, value: goals.run_weekly_goal, suffix: 'km' },
                    { label: 'Push-up Peak Goal', key: 'pushup_peak_goal' as const, value: goals.pushup_peak_goal, suffix: 'reps' },
                    { label: 'Plank Peak Goal', key: 'plank_peak_goal' as const, value: goals.plank_peak_goal, suffix: 'sec' },
                    { label: 'Run Peak Goal', key: 'run_peak_goal' as const, value: goals.run_peak_goal, suffix: 'km' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between px-4 py-2 rounded-xl bg-dark-elevated/50">
                      <span className="text-xs text-dark-muted">{item.label}</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          defaultValue={item.value}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) {
                              updateGoals.mutate({ [item.key]: val });
                            }
                          }}
                          className="w-16 text-right text-sm font-bold bg-transparent text-dark-text outline-none"
                        />
                        <span className="text-[10px] text-dark-muted">{item.suffix}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="h-2" />

          {/* Sharing */}
          <GlassCard
            className="flex items-center gap-3 cursor-pointer"
            delay={0.3}
            onClick={() => setShowSharing(!showSharing)}
          >
            <div className="w-10 h-10 rounded-xl bg-dark-elevated flex items-center justify-center">
              <span className="text-lg">👥</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-dark-text">Sharing</p>
              <p className="text-[10px] text-dark-muted">{connections.filter((c: { status: string }) => c.status === 'accepted').length} active connections</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round">
              <polyline points={showSharing ? "18 15 12 9 6 15" : "9 18 15 12 9 6"} />
            </svg>
          </GlassCard>

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
                      onChange={(e) => { setShareEmail(e.target.value); setShareConfirm(false); }}
                      placeholder="Search by email..."
                      className="flex-1 px-3 py-2 rounded-xl bg-dark-elevated text-sm text-dark-text placeholder-dark-muted outline-none border border-dark-border focus:border-emerald-500/50 transition-colors"
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

                  {/* Active connections */}
                  {connections
                    .filter((c: { status: string }) => c.status === 'accepted')
                    .map((conn: { id: string; requester: { full_name: string; email: string } | null; recipient: { full_name: string; email: string } | null }) => {
                      const other = conn.requester?.email === profile?.email ? conn.recipient : conn.requester;
                      return (
                        <div key={conn.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-dark-elevated/50">
                          <span className="text-xs text-dark-text">{other?.full_name || other?.email}</span>
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
              <GlassCard
                className="flex items-center gap-3 cursor-pointer"
                delay={0.35}
                onClick={() => setShowInvites(!showInvites)}
              >
                <div className="w-10 h-10 rounded-xl bg-dark-elevated flex items-center justify-center">
                  <span className="text-lg">🔗</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-dark-text">Invite Links</p>
                  <p className="text-[10px] text-dark-muted">Admin: generate one-time invite links</p>
                </div>
              </GlassCard>

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
                        <div className="px-3 py-2 rounded-xl bg-dark-elevated">
                          <p className="text-[10px] text-dark-muted mb-1">Share this link:</p>
                          <p className="text-xs text-emerald-400 break-all font-mono">{inviteLink}</p>
                          <button
                            onClick={() => navigator.clipboard.writeText(inviteLink)}
                            className="mt-2 text-[10px] font-semibold text-dark-muted"
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

        {/* Data & Export */}
        <div>
          <p className="text-[10px] font-semibold tracking-[0.2em] text-dark-muted uppercase mb-3">
            DATA & EXPORT
          </p>
          <a
            href="/api/export"
            download
            className="block w-full"
          >
            <GlassCard className="flex items-center gap-3" delay={0.35}>
              <div className="w-10 h-10 rounded-xl bg-dark-elevated flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-dark-text">Export Data (CSV)</p>
                <p className="text-[10px] text-dark-muted">Download all your workout logs</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </GlassCard>
          </a>
        </div>

        {/* Deactivate Session / Logout */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={signOut}
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
          DEACTIVATE SESSION
        </motion.button>

        {/* Version */}
        <p className="text-center text-[10px] text-dark-muted/40 tracking-wider pb-4">
          KINETIC PWA V4.2.0 • BUILD 2026
        </p>
      </div>
    </AppShell>
  );
}
