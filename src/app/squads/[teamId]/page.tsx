'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { endOfWeek, startOfWeek } from 'date-fns';
import { Copy, Check, Vote } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { KCard, KEyebrow, KDisplay, KAvatar, KCrest } from '@/components/ui/k-primitives';
import { ActivityEmojiIcon } from '@/components/ui/activity-emoji-icon';
import { SquadChatPanel } from '@/components/squads/squad-chat-panel';
import { SquadArenaPanel } from '@/components/squads/squad-arena-panel';
import { IcBack } from '@/components/ui/k-icons';
import { crestPropsForTeam } from '@/lib/squad-crest-codec';
import {
  useTeamDetails,
  useTeamLeaderboard,
  useTeamMessages,
} from '@/hooks/use-teams';
import { useTeamScoresRealtime } from '@/hooks/use-team-scores-realtime';
import { useAuth } from '@/providers/auth-provider';
import type { TeamActivity, TeamLeaderboardEntry } from '@/types/database';

type Tab = 'overview' | 'arena' | 'chat';

function formatMemberStat(slug: string, value: number, unitPref: 'metric' | 'imperial'): string {
  if (slug === 'plank') return `${Math.round(value / 60)}′`;
  if (slug === 'run') {
    return unitPref === 'imperial' ? `${(value * 0.621371).toFixed(1)} mi` : `${Number(value).toFixed(1)} km`;
  }
  if (value >= 10000) return `${Math.round(value / 1000)}k`;
  return `${Math.round(value)}`;
}

export default function SquadDetailPage() {
  const params = useParams();
  const { user, profile } = useAuth();
  const unitPref = profile?.unit_preference ?? 'metric';
  const teamId = typeof params.teamId === 'string' ? params.teamId : null;

  const { from, to } = useMemo(() => {
    const now = new Date();
    return {
      from: startOfWeek(now, { weekStartsOn: 1 }).toISOString(),
      to: endOfWeek(now, { weekStartsOn: 1 }).toISOString(),
    };
  }, []);

  const { data: squad, isLoading: loadSquad, isError: squadErr } = useTeamDetails(teamId);
  const { data: board = [], isLoading: loadBoard } = useTeamLeaderboard(teamId, from, to);
  const { data: messages = [], isLoading: loadChat } = useTeamMessages(teamId);

  const memberIds = useMemo(() => squad?.members.map((m) => m.user_id) ?? [], [squad?.members]);
  useTeamScoresRealtime(teamId, memberIds, !!squad && memberIds.length > 0);

  const [tab, setTab] = useState<Tab>('overview');
  const [copied, setCopied] = useState(false);

  const crest = teamId ? crestPropsForTeam(teamId, squad?.avatar_url ?? null) : crestPropsForTeam('x', null);

  const squadWeekTotal = useMemo(() => board.reduce((s, e) => s + e.total_score, 0), [board]);
  const activeMembers = useMemo(() => board.filter((e) => e.total_score > 0).length, [board]);

  if (!teamId) {
    return (
      <AppShell>
        <p className="text-sm text-k-muted-soft">Invalid squad.</p>
      </AppShell>
    );
  }

  if (loadSquad) {
    return (
      <AppShell>
        <div className="space-y-3 pt-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-k-lg bg-k-card shadow-k-card animate-pulse" />
          ))}
        </div>
      </AppShell>
    );
  }

  if (squadErr || !squad) {
    return (
      <AppShell>
        <Link href="/squads" className="inline-flex items-center gap-2 text-[13px] font-semibold text-emerald-600 dark:text-emerald-400 mb-4">
          <IcBack size={18} /> Back to hub
        </Link>
        <KCard>
          <p className="text-sm font-semibold text-k-ink">Squad unavailable</p>
          <p className="text-[12px] text-k-muted-soft mt-2 leading-relaxed">
            You may not be a member, or this link is wrong.
          </p>
        </KCard>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="pb-28 space-y-4">
        {/* Back + squad header */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/squads"
            className="w-9 h-9 rounded-k-pill border-none bg-k-card shadow-k-card flex items-center justify-center shrink-0 no-underline"
          >
            <IcBack size={18} color="var(--k-ink, #0B0D0C)" />
          </Link>
          <div className="flex-1 min-w-0">
            <KEyebrow>{squad.members.length} members</KEyebrow>
            <div className="flex items-center gap-2 mt-1">
              <KCrest {...crest} size={28} />
              <KDisplay size={22} className="truncate">{squad.name.toUpperCase()}</KDisplay>
            </div>
          </div>
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-k-pill bg-k-card shadow-k-card shrink-0"
            style={{ fontSize: 11, fontWeight: 600, fontFamily: 'monospace', letterSpacing: '0.04em', color: '#6B7280' }}
          >
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(squad.invite_code);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="flex items-center gap-1.5 border-none bg-transparent p-0 cursor-pointer"
              aria-label="Copy invite code"
            >
              {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} color="#9AA2A9" />}
              <span className="text-k-muted-soft">{squad.invite_code}</span>
            </button>
          </div>
        </div>

        {/* Tab bar — pill group style */}
        <div className="flex bg-k-card rounded-k-pill shadow-k-card p-1">
          {(['overview', 'arena', 'chat'] as Tab[]).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 relative py-2.5 px-2 rounded-k-pill text-[12px] font-bold uppercase tracking-wide transition-all border-none ${
                tab === t
                  ? 'bg-k-mint text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'
                  : 'bg-transparent text-k-muted'
              }`}
            >
              {t}
              {t === 'chat' && (
                <span className="absolute top-2 right-3.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
              )}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            {/* Score + active cards */}
            <div className="grid grid-cols-2 gap-2.5">
              <KCard pad={16} style={{ background: 'linear-gradient(135deg, #1FB37A, #158A5D)', color: '#fff' }}>
                <div className="text-[10px] font-bold tracking-[1.5px] uppercase" style={{ opacity: 0.8 }}>Squad score</div>
                <div className="font-display italic font-black mt-1" style={{ fontSize: 34, letterSpacing: -1 }}>
                  {Math.round(squadWeekTotal).toLocaleString()}
                </div>
                <div className="text-[11px] mt-1 font-semibold" style={{ opacity: 0.8 }}>this week</div>
              </KCard>
              <KCard pad={16}>
                <div className="text-[10px] font-bold tracking-[1.5px] uppercase text-k-muted">Active</div>
                <div className="font-display italic font-black text-k-ink mt-1" style={{ fontSize: 34, letterSpacing: -1 }}>
                  {activeMembers}<span className="text-k-muted" style={{ fontSize: 20 }}>/{squad.members.length}</span>
                </div>
                <div className="text-[11px] text-k-muted font-semibold mt-1">this week</div>
              </KCard>
            </div>

            {/* Lineup */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <KEyebrow>Squad lineup</KEyebrow>
                <Link
                  href={`/squads/${teamId}/vote`}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 hover:opacity-90 shrink-0 no-underline"
                >
                  <Vote size={14} strokeWidth={2.4} aria-hidden />
                  Start vote
                </Link>
              </div>
              <KCard pad={14}>
                {squad.activities.length > 0 ? (
                  <div className="flex gap-2.5 flex-wrap">
                    {squad.activities.map((a: TeamActivity) => (
                      <div
                        key={a.id}
                        className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-k-pill border border-k-line"
                        style={{ background: '#fff' }}
                      >
                        <ActivityEmojiIcon emoji={a.emoji} slug={a.slug} size="sm" />
                        <span className="text-[12px] font-bold text-k-ink">{a.name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[12px] text-k-muted-soft leading-relaxed">
                    No moves linked yet. Open a vote to set the squad lineup.
                  </p>
                )}
              </KCard>
            </div>

            {/* Members sorted by week */}
            <div>
              <KEyebrow className="mb-2.5">Members · sorted by week</KEyebrow>
              {loadBoard ? (
                <div className="h-32 rounded-k-lg bg-k-card animate-pulse" />
              ) : (
                <div className="space-y-2">
                  {board.map((row: TeamLeaderboardEntry, i) => (
                    <KCard key={row.user_id} pad={12}>
                      <div className="flex items-center gap-3">
                        <span
                          className="font-display italic font-black w-6 text-center shrink-0"
                          style={{ fontSize: 14, color: i === 0 ? '#158A5D' : '#9AA2A9' }}
                        >{i + 1}</span>
                        <KAvatar name={row.full_name} src={row.avatar_url || null} size={36} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[13px] font-bold text-k-ink truncate">
                              {user?.id === row.user_id ? 'You' : row.full_name || 'Athlete'}
                            </span>
                            {user?.id === row.user_id && (
                              <span
                                className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                                style={{ background: '#D7F0E2', color: '#158A5D' }}
                              >You</span>
                            )}
                          </div>
                          <p className="text-[10px] text-k-muted font-semibold mt-0.5">
                            Streak {row.streak ?? 0}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-display italic font-black text-emerald-600 dark:text-emerald-400 tabular-nums" style={{ fontSize: 18, letterSpacing: -0.3 }}>
                            {Math.round(row.total_score).toLocaleString()}
                          </div>
                          <div className="text-[9px] font-bold text-k-muted uppercase tracking-wide">pts</div>
                        </div>
                      </div>
                      {squad.activities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2 pl-[52px]">
                          {squad.activities.map((a: TeamActivity) => {
                            const raw = row.activity_breakdown?.[a.slug]?.value ?? 0;
                            if (!raw) return null;
                            return (
                              <span
                                key={`${row.user_id}-${a.slug}`}
                                className="inline-flex items-center gap-1 pl-1 pr-2 py-0.5 rounded-k-pill text-[10px] font-bold text-k-ink border border-k-line"
                                style={{ background: '#fff' }}
                              >
                                <ActivityEmojiIcon emoji={a.emoji} slug={a.slug} size="xs" />
                                {formatMemberStat(a.slug, raw, unitPref)}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </KCard>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {tab === 'arena' && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <SquadArenaPanel
              teamId={teamId}
              activities={squad.activities}
              memberIds={memberIds}
            />
          </motion.div>
        )}

        {tab === 'chat' && teamId && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <SquadChatPanel teamId={teamId} userId={user?.id} messages={messages} loadChat={loadChat} />
          </motion.div>
        )}
      </div>
    </AppShell>
  );
}
