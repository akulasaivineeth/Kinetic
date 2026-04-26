'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X, ChevronRight } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { KCard, KEyebrow, KDisplay, KCrest, KAvatar, crestVariantFromSeed } from '@/components/ui/k-primitives';
import { ActivityEmojiIcon } from '@/components/ui/activity-emoji-icon';
import { exerciseIcon } from '@/components/ui/k-icons';
import { PersonalHubPanel } from '@/components/squads/personal-hub-panel';
import { crestPropsForTeam } from '@/lib/squad-crest-codec';
import { useUserTeams, useJoinTeam } from '@/hooks/use-teams';
import type { UserTeam } from '@/types/database';

type HubTab = 'personal' | 'squads';

export default function SquadsHubPage() {
  const router = useRouter();
  const [hubTab, setHubTab] = useState<HubTab>('personal');
  const { data: squads = [], isLoading: loadSquads } = useUserTeams();
  const joinTeam = useJoinTeam();

  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');

  const sorted = useMemo(() => [...squads].sort((a, b) => b.team_score - a.team_score), [squads]);
  const maxScore = useMemo(() => Math.max(1, ...sorted.map(s => s.team_score)), [sorted]);
  const combinedScore = useMemo(() => sorted.reduce((s, q) => s + q.team_score, 0), [sorted]);

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setError('');
    try {
      const result = await joinTeam.mutateAsync(joinCode.trim());
      setShowJoin(false);
      setJoinCode('');
      router.push(`/squads/${result.team_id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Invalid invite code');
    }
  };

  return (
    <AppShell>
      <div className="space-y-5 pt-1 pb-28" data-testid="uat-squads-page">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <KEyebrow>{hubTab === 'personal' ? 'Personal · all-time' : 'Your squads'}</KEyebrow>
          <KDisplay size={42} className="mt-1">HUB</KDisplay>
        </motion.div>

        {/* Toggle + actions */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex bg-k-card rounded-k-pill shadow-k-card p-1">
            {(['personal', 'squads'] as HubTab[]).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setHubTab(t)}
                className={`rounded-k-pill px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-all border-none ${
                  hubTab === t
                    ? 'bg-k-mint text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'
                    : 'bg-transparent text-k-muted'
                }`}
              >
                {t === 'personal' ? 'Yours' : 'Squads'}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setShowJoin(true); setError(''); }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-k-pill border border-k-line-strong bg-k-card text-k-ink font-bold text-[11px] tracking-wide shadow-k-card"
            >
              JOIN
            </button>
            <Link
              href="/squads/new"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-k-pill bg-emerald-500 text-white font-bold text-[11px] tracking-wide no-underline"
              style={{ boxShadow: '0 4px 10px rgba(31,179,122,0.3)' }}
            >
              NEW
            </Link>
          </div>
        </div>

        {hubTab === 'personal' && <PersonalHubPanel />}

        {hubTab === 'squads' && (
          <>
            <AnimatePresence>
              {showJoin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <KCard hi>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[13px] font-bold text-k-ink">Join with code</span>
                      <button type="button" aria-label="Close" onClick={() => setShowJoin(false)} className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10">
                        <X size={18} className="text-k-muted-soft" />
                      </button>
                    </div>
                    <input
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="CODE"
                      className="w-full px-4 py-3 rounded-k-lg border border-k-line-strong bg-k-bg text-center font-k-mono font-bold tracking-[0.3em] text-k-ink mb-3"
                      maxLength={6}
                    />
                    {error && <p className="text-[12px] text-red-500 mb-2">{error}</p>}
                    <button
                      type="button"
                      onClick={() => void handleJoin()}
                      disabled={!joinCode.trim() || joinTeam.isPending}
                      className="w-full py-3.5 rounded-k-lg bg-emerald-500 text-white font-bold text-[12px] disabled:opacity-40"
                    >
                      {joinTeam.isPending ? 'Joining…' : 'Join squad'}
                    </button>
                  </KCard>
                </motion.div>
              )}
            </AnimatePresence>

            {loadSquads ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-[120px] rounded-k-lg bg-k-card shadow-k-card animate-pulse" />
                ))}
              </div>
            ) : sorted.length === 0 ? (
              !showJoin && (
                <KCard className="text-center py-12">
                  <div className="mx-auto opacity-50 w-fit">
                    <KCrest {...crestVariantFromSeed('empty')} size={56} />
                  </div>
                  <p className="text-sm font-semibold text-k-ink mt-4">No squads yet</p>
                  <p className="text-[12px] text-k-muted-soft mt-2 max-w-[260px] mx-auto leading-relaxed">
                    Create a squad or join one with an invite code.
                  </p>
                </KCard>
              )
            ) : (
              <>
                {/* Squad leaderboard card */}
                <div>
                  <KEyebrow className="mb-3">Your squad leaderboard · this week</KEyebrow>
                  <KCard pad={16}>
                    <div className="flex flex-col gap-3.5">
                      {sorted.map((s, i) => {
                        const pct = (s.team_score / maxScore) * 100;
                        const isTop = i === 0;
                        const crest = crestPropsForTeam(s.team_id, s.avatar_url);
                        return (
                          <Link key={s.team_id} href={`/squads/${s.team_id}`} className="no-underline">
                            <div className="cursor-pointer">
                              <div className="flex items-center gap-2.5 mb-1.5">
                                <div
                                  className="font-display italic font-black w-5 text-center"
                                  style={{
                                    fontSize: 18,
                                    letterSpacing: -0.5,
                                    color: isTop ? '#158A5D' : '#9AA2A9',
                                  }}
                                >{i + 1}</div>
                                <KCrest {...crest} size={34} />
                                <div className="flex-1 min-w-0">
                                  <div className="text-[13px] font-extrabold text-k-ink truncate">{s.team_name}</div>
                                  <div className="text-[10px] text-k-muted font-semibold mt-0.5">{s.member_count} members</div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div
                                    className="font-display italic font-black text-[20px]"
                                    style={{
                                      letterSpacing: -0.5,
                                      color: isTop ? '#158A5D' : '#0B0D0C',
                                    }}
                                  >{s.team_score.toLocaleString()}</div>
                                  <div className="text-[9px] text-k-muted font-bold tracking-[1px] uppercase">pts</div>
                                </div>
                              </div>
                              <div className="h-[7px] rounded-full overflow-hidden ml-8" style={{ background: '#EDEEEC' }}>
                                <motion.div
                                  className="h-full rounded-full"
                                  style={{
                                    background: isTop ? 'linear-gradient(90deg, #1FB37A, #158A5D)' : crest.color,
                                    boxShadow: isTop ? '0 0 8px rgba(31,179,122,0.33)' : 'none',
                                    opacity: isTop ? 1 : 0.75,
                                  }}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1] }}
                                />
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                    <div className="mt-4 pt-3 border-t border-k-line flex justify-between items-center">
                      <span className="text-[11px] text-k-muted font-semibold">Combined output this week</span>
                      <span
                        className="font-display italic font-black text-[20px] text-emerald-600 dark:text-emerald-400"
                        style={{ letterSpacing: -0.5 }}
                      >{combinedScore.toLocaleString()} pts</span>
                    </div>
                  </KCard>
                </div>

                {/* Squad cards */}
                <div className="space-y-2.5">
                  {sorted.map(s => (
                    <SquadCard key={s.team_id} squad={s} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

function SquadCard({ squad }: { squad: UserTeam }) {
  const crest = crestPropsForTeam(squad.team_id, squad.avatar_url);
  const slugLine = squad.activity_slugs?.slice(0, 4) ?? [];

  return (
    <Link href={`/squads/${squad.team_id}`} className="no-underline">
      <motion.div whileTap={{ scale: 0.99 }}>
        <KCard pad={0} style={{ overflow: 'hidden' }}>
          {/* colored header strip */}
          <div
            className="flex items-center gap-3 px-4 py-4"
            style={{ background: `linear-gradient(135deg, ${crest.color}, ${crest.color}cc)` }}
          >
            <KCrest {...crest} size={48} />
            <div className="flex-1 min-w-0">
              <div
                className="font-display italic font-black text-white truncate"
                style={{ fontSize: 20, letterSpacing: -0.3 }}
              >
                {squad.team_name.toUpperCase()}
              </div>
              <div className="text-[11px] text-white/75 font-semibold mt-0.5">
                {squad.member_count} members
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[9px] font-bold tracking-[1.2px] uppercase mb-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
                This week
              </div>
              <div className="font-display italic font-black text-white" style={{ fontSize: 26, letterSpacing: -1 }}>
                {Math.round(squad.team_score).toLocaleString()}
              </div>
            </div>
          </div>
          {/* body */}
          <div className="px-4 py-3">
            <div className="flex gap-1.5 flex-wrap items-center">
              {slugLine.map(slug => (
                <span
                  key={slug}
                  className="inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-k-pill text-[11px] font-bold text-k-ink border border-k-line"
                  style={{ background: '#fff' }}
                >
                  <ActivityEmojiIcon slug={slug} size="xs" />
                  {slug}
                </span>
              ))}
              {squad.activity_slugs && squad.activity_slugs.length > 4 && (
                <span
                  className="inline-flex items-center px-2.5 py-1 rounded-k-pill text-[11px] font-bold text-k-muted border border-k-line"
                  style={{ background: '#fff' }}
                >
                  +{squad.activity_slugs.length - 4}
                </span>
              )}
              <ChevronRight size={14} className="text-k-muted ml-auto" />
            </div>
          </div>
        </KCard>
      </motion.div>
    </Link>
  );
}
