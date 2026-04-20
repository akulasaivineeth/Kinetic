'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { endOfWeek, format, startOfWeek } from 'date-fns';
import { Copy, Check, Send } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { KCard, KEyebrow, KDisplay, KPill, KCrest, KAvatar, crestVariantFromSeed } from '@/components/ui/k-primitives';
import { IcBack } from '@/components/ui/k-icons';
import {
  useTeamDetails,
  useTeamLeaderboard,
  useTeamMessages,
  useSendTeamMessage,
} from '@/hooks/use-teams';
import { useAuth } from '@/providers/auth-provider';

type Tab = 'overview' | 'arena' | 'chat';

export default function SquadDetailPage() {
  const params = useParams();
  const { user } = useAuth();
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
  const sendMessage = useSendTeamMessage();

  const [tab, setTab] = useState<Tab>('overview');
  const [chatInput, setChatInput] = useState('');
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const crest = teamId ? crestVariantFromSeed(teamId) : crestVariantFromSeed('x');

  const squadWeekTotal = useMemo(
    () => board.reduce((s, e) => s + e.total_score, 0),
    [board],
  );
  const activeMembers = useMemo(() => board.filter((e) => e.total_score > 0).length, [board]);
  const maxScore = useMemo(() => Math.max(1, ...board.map((e) => e.total_score)), [board]);

  useEffect(() => {
    if (tab === 'chat') bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [tab, messages.length]);

  const handleSend = async () => {
    if (!teamId || !chatInput.trim() || sendMessage.isPending) return;
    try {
      await sendMessage.mutateAsync({ teamId, content: chatInput.trim() });
      setChatInput('');
    } catch {
      /* toast optional */
    }
  };

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
        <Link
          href="/squads"
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-emerald-600 dark:text-emerald-400 mb-4"
        >
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
        <Link
          href="/squads"
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-k-muted-soft hover:text-k-ink"
        >
          <IcBack size={18} /> Squads
        </Link>

        <div className="flex items-start gap-3">
          <KCrest {...crest} size={56} glow />
          <div className="flex-1 min-w-0">
            <KDisplay size={26} className="truncate">
              {squad.name}
            </KDisplay>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <KEyebrow className="!tracking-[0.25em] font-mono text-[10px]">{squad.invite_code}</KEyebrow>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(squad.invite_code);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="p-1.5 rounded-k-lg border border-k-line-strong bg-k-bg"
                aria-label="Copy invite code"
              >
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} className="text-k-muted-soft" />}
              </button>
            </div>
            <p className="text-[11px] text-k-muted-soft mt-1">
              {squad.members.length} member{squad.members.length === 1 ? '' : 's'} · this week (Mon–Sun)
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {(['overview', 'arena', 'chat'] as const).map((t) => (
            <KPill key={t} size="sm" active={tab === t} onClick={() => setTab(t)}>
              {t === 'overview' ? 'Overview' : t === 'arena' ? 'Arena' : 'Chat'}
            </KPill>
          ))}
        </div>

        {tab === 'overview' && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <KCard hi className="!py-4">
                <KEyebrow className="!text-[10px]">Squad week</KEyebrow>
                <p className="text-2xl font-display text-emerald-600 dark:text-emerald-400 tabular-nums mt-1">
                  {Math.round(squadWeekTotal).toLocaleString()}
                </p>
                <p className="text-[10px] text-k-muted-soft mt-0.5">session points</p>
              </KCard>
              <KCard className="!py-4">
                <KEyebrow className="!text-[10px]">Training</KEyebrow>
                <p className="text-2xl font-display text-k-ink tabular-nums mt-1">{activeMembers}</p>
                <p className="text-[10px] text-k-muted-soft mt-0.5">logged this week</p>
              </KCard>
            </div>

            <KEyebrow>Lineup · by week score</KEyebrow>
            {loadBoard ? (
              <div className="h-32 rounded-k-lg bg-k-card animate-pulse" />
            ) : (
              <div className="space-y-2">
                {board.map((row, i) => (
                  <KCard key={row.user_id} pad={14} className="flex items-center gap-3">
                    <span className="text-sm font-display text-k-muted-soft w-6">{i + 1}</span>
                    <KAvatar name={row.full_name} src={row.avatar_url || null} size={40} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-k-ink truncate">{row.full_name || 'Athlete'}</p>
                      <p className="text-[11px] text-k-muted-soft">Streak {row.streak ?? 0}</p>
                    </div>
                    <span className="text-[14px] font-display text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {Math.round(row.total_score).toLocaleString()}
                    </span>
                  </KCard>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {tab === 'arena' && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <KEyebrow>Head-to-head · this week</KEyebrow>
            {loadBoard ? (
              <div className="h-40 rounded-k-lg bg-k-card animate-pulse" />
            ) : board.length === 0 ? (
              <KCard className="text-center py-8 text-k-muted-soft text-sm">No scores yet.</KCard>
            ) : (
              board.slice(0, 8).map((row) => (
                <KCard key={row.user_id} pad={14}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[13px] font-bold text-k-ink truncate">{row.full_name}</span>
                    <span className="text-[12px] font-display text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">
                      {Math.round(row.total_score)}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-emerald-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${(row.total_score / maxScore) * 100}%` }}
                      transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
                    />
                  </div>
                </KCard>
              ))
            )}
          </motion.div>
        )}

        {tab === 'chat' && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col min-h-[50vh]">
            <div className="flex-1 space-y-2 mb-3">
              {loadChat ? (
                <div className="h-24 rounded-k-lg bg-k-card animate-pulse" />
              ) : messages.length === 0 ? (
                <KCard className="text-center py-10 text-k-muted-soft text-sm">Say hi to your squad.</KCard>
              ) : (
                messages.map((m) => {
                  const mine = !!user?.id && m.user_id === user.id;
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <KCard
                        pad={12}
                        className={`max-w-[88%] !rounded-2xl ${mine ? '!bg-emerald-500/15' : ''}`}
                        hi={mine}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <KAvatar name={m.full_name} src={m.avatar_url || null} size={26} />
                          <span className="text-[11px] font-bold text-k-ink truncate">{m.full_name}</span>
                          <span className="text-[10px] text-k-muted-soft shrink-0">
                            {format(new Date(m.created_at), 'HH:mm')}
                          </span>
                        </div>
                        <p className="text-[13px] text-k-ink leading-snug whitespace-pre-wrap">{m.content}</p>
                      </KCard>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            <div className="sticky bottom-0 pt-2 bg-k-bg pb-[max(8px,env(safe-area-inset-bottom))]">
              <div className="flex gap-2 items-end">
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
                  rows={2}
                  placeholder="Message squad…"
                  className="flex-1 resize-none px-3 py-2.5 rounded-k-lg border border-k-line-strong bg-k-card text-[13px] text-k-ink placeholder:text-k-muted-soft"
                />
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={!chatInput.trim() || sendMessage.isPending}
                  className="shrink-0 w-11 h-11 rounded-full bg-emerald-500 text-white flex items-center justify-center disabled:opacity-40"
                  aria-label="Send"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </AppShell>
  );
}
