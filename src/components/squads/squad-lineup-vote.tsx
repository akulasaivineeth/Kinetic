'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Check, ChevronRight, Vote } from 'lucide-react';
import { KCard, KEyebrow, KDisplay, KPill } from '@/components/ui/k-primitives';
import { exerciseIcon as getExerciseIcon, IcBack } from '@/components/ui/k-icons';
import { useActivityTypes } from '@/hooks/use-activities';
import { useTeamDetails } from '@/hooks/use-teams';
import { useAuth } from '@/providers/auth-provider';
import type { ActivityType } from '@/types/database';

const MAX_PICKS = 6;

function exerciseIconForSlug(slug: string) {
  return getExerciseIcon(slug);
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic 0..1 — UI-only consensus preview (no server vote yet). */
function unit01(teamId: string, slug: string, salt: number): number {
  return (hashString(`${teamId}:${slug}:${salt}`) % 10000) / 10000;
}

function majorityThreshold(memberCount: number): number {
  if (memberCount < 1) return 1;
  return Math.floor(memberCount / 2) + 1;
}

function simulatedVoteCount(teamId: string, slug: string, memberCount: number, userPicked: boolean): number {
  if (memberCount < 1) return 0;
  if (!userPicked) {
    const cap = Math.max(0, majorityThreshold(memberCount) - 2);
    if (cap === 0) return unit01(teamId, slug, 2) < 0.4 ? 1 : 0;
    return Math.min(cap, Math.floor(unit01(teamId, slug, 3) * (cap + 1)));
  }
  const others = memberCount - 1;
  const r = unit01(teamId, slug, 0);
  const extra = Math.min(others, Math.floor(others * (0.22 + 0.72 * r)));
  return 1 + extra;
}

function orderedVoterLabels(
  members: { user_id: string; full_name: string }[],
  userId: string | undefined,
  teamId: string,
  slug: string,
): string[] {
  const labels = members.map((m) => (m.user_id === userId ? 'You' : m.full_name?.split(' ')[0] || 'Member'));
  const order = [...labels.keys()].sort(
    (a, b) => hashString(`${teamId}:${slug}:ord:${a}`) - hashString(`${teamId}:${slug}:ord:${b}`),
  );
  return order.map((i) => labels[i]!);
}

function voterSnippet(voteCount: number, orderedLabels: string[]): string {
  if (voteCount <= 0) return '';
  const n = Math.min(3, voteCount, orderedLabels.length);
  const top = orderedLabels.slice(0, n);
  const unnamed = voteCount - top.length;
  return top.join(', ') + (unnamed > 0 ? ` +${unnamed}` : '');
}

type Stage = 1 | 2 | 3;

export function SquadLineupVote({ teamId }: { teamId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { data: squad, isLoading, isError } = useTeamDetails(teamId);
  const { data: activityTypes = [] } = useActivityTypes();

  const [stage, setStage] = useState<Stage>(1);
  const [picks, setPicks] = useState<Set<string>>(new Set());
  const [pickInit, setPickInit] = useState(false);
  const [cat, setCat] = useState<'all' | 'core' | 'more'>('all');

  useEffect(() => {
    if (pickInit || !activityTypes.length) return;
    const core = activityTypes.filter((a) => a.is_core).map((a) => a.slug);
    setPicks(new Set(core.length ? core : activityTypes.slice(0, 4).map((a) => a.slug)));
    setPickInit(true);
  }, [activityTypes, pickInit]);

  const memberCount = Math.max(1, squad?.members.length ?? 1);
  const majority = majorityThreshold(memberCount);

  const filteredActs = useMemo(() => {
    let list = activityTypes;
    if (cat === 'core') list = list.filter((a) => a.is_core);
    if (cat === 'more') list = list.filter((a) => !a.is_core);
    return list;
  }, [activityTypes, cat]);

  const toggle = useCallback((slug: string) => {
    setPicks((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else if (next.size < MAX_PICKS) next.add(slug);
      return next;
    });
  }, []);

  const consensusRows = useMemo(() => {
    if (!squad) return [];
    const rows: { slug: string; count: number; userPicked: boolean; act: ActivityType | undefined }[] = [];
    const picked = [...picks];
    for (const slug of picked) {
      const act = activityTypes.find((a) => a.slug === slug);
      rows.push({
        slug,
        count: simulatedVoteCount(teamId, slug, memberCount, true),
        userPicked: true,
        act,
      });
    }
    const extras = activityTypes.filter((a) => !picks.has(a.slug)).slice(0, 6);
    for (const a of extras) {
      rows.push({
        slug: a.slug,
        count: simulatedVoteCount(teamId, a.slug, memberCount, false),
        userPicked: false,
        act: a,
      });
    }
    return rows.sort((x, y) => y.count - x.count);
  }, [activityTypes, memberCount, picks, teamId, squad?.id]);

  const lockedSlugs = useMemo(() => {
    const passing = consensusRows.filter((r) => r.count >= majority && r.act).map((r) => r.slug);
    if (passing.length) return passing.slice(0, MAX_PICKS);
    const top = consensusRows.filter((r) => r.act).sort((a, b) => b.count - a.count)[0];
    if (top?.slug) return [top.slug];
    return [...picks].slice(0, 4);
  }, [consensusRows, majority, picks]);

  if (isLoading) {
    return (
      <div className="space-y-3 pt-2" data-testid="uat-squad-vote-page">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-k-lg bg-k-card shadow-k-card animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError || !squad) {
    return (
      <div data-testid="uat-squad-vote-page">
        <Link
          href={`/squads/${teamId}`}
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-emerald-600 dark:text-emerald-400 mb-4"
        >
          <IcBack size={18} /> Back to squad
        </Link>
        <KCard>
          <p className="text-sm font-semibold text-k-ink">Squad unavailable</p>
        </KCard>
      </div>
    );
  }

  const squadLabel = squad.name.length > 18 ? `${squad.name.slice(0, 17)}…` : squad.name;

  return (
    <div className="pb-28 space-y-4" data-testid="uat-squad-vote-page">
      <Link
        href={`/squads/${teamId}`}
        className="inline-flex items-center gap-2 text-[13px] font-semibold text-k-muted-soft hover:text-k-ink"
      >
        <IcBack size={18} /> {squadLabel}
      </Link>

      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-full bg-k-mint-soft border border-k-line-strong flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
          <Vote size={22} strokeWidth={2.2} />
        </div>
        <div className="min-w-0 flex-1">
          <KEyebrow>
            {squadLabel} · vote {stage}/3
          </KEyebrow>
          <KDisplay size={26} className="mt-0.5">
            {stage === 1 ? 'YOUR PICKS' : stage === 2 ? 'CONSENSUS' : 'LOCKED IN'}
          </KDisplay>
        </div>
      </div>

      <div className="flex gap-1.5">
        {([1, 2, 3] as const).map((s) => (
          <div
            key={s}
            className="flex-1 h-1 rounded-full overflow-hidden bg-k-line-strong/60"
            aria-hidden
          >
            <motion.div
              className="h-full rounded-full bg-emerald-500"
              initial={false}
              animate={{ width: s <= stage ? '100%' : '0%' }}
              transition={{ duration: 0.35 }}
            />
          </div>
        ))}
      </div>

      {stage === 1 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <KCard pad={16} className="!bg-k-mint-soft border border-k-mint">
            <p className="text-[13px] text-k-ink leading-relaxed">
              Choose up to <span className="font-bold">{MAX_PICKS}</span> moves for your squad to spotlight. When live
              voting ships, everyone&apos;s choices roll up automatically — this screen is the V2 layout only (no server
              tally yet).
            </p>
          </KCard>

          <div className="flex flex-wrap gap-2">
            {(['all', 'core', 'more'] as const).map((c) => (
              <KPill key={c} size="sm" active={cat === c} onClick={() => setCat(c)}>
                {c === 'all' ? 'All' : c === 'core' ? 'Core' : 'More'}
              </KPill>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {filteredActs.map((ex) => {
              const picked = picks.has(ex.slug);
              const Icon = exerciseIconForSlug(ex.slug);
              return (
                <button
                  key={ex.slug}
                  type="button"
                  onClick={() => toggle(ex.slug)}
                  className={`text-left rounded-k-md p-3.5 border-2 transition-all relative ${
                    picked
                      ? 'bg-k-mint-soft border-emerald-500 shadow-k-card'
                      : 'bg-k-card border-transparent shadow-k-card hover:border-k-line-strong'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-k-sm flex items-center justify-center mb-2 ${
                      picked ? 'bg-emerald-500 text-white' : 'bg-k-mint-soft text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {Icon && <Icon size={22} />}
                  </div>
                  <p className="text-[13px] font-bold text-k-ink leading-tight">{ex.name}</p>
                  <p className="text-[10px] text-k-muted-soft font-semibold mt-1 uppercase tracking-wide">{ex.unit}</p>
                  {picked && (
                    <div
                      className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center"
                      aria-hidden
                    >
                      <Check size={14} className="text-white" strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex justify-center pt-2">
            <button
              type="button"
              disabled={picks.size === 0}
              onClick={() => setStage(2)}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-k-pill bg-emerald-500 text-white text-[12px] font-black tracking-widest uppercase disabled:opacity-40 disabled:cursor-not-allowed shadow-k-fab"
            >
              Submit {picks.size}/{MAX_PICKS}
              <ChevronRight size={16} strokeWidth={2.5} />
            </button>
          </div>
        </motion.div>
      )}

      {stage === 2 && squad && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <KCard pad={16} className="!bg-k-mint-soft border border-k-mint">
            <p className="text-[13px] text-k-ink leading-relaxed">
              Preview: with <span className="font-bold">{memberCount}</span> member{memberCount === 1 ? '' : 's'},
              exercises need at least <span className="font-bold">{majority}</span> votes to lock. Counts below are a
              deterministic placeholder until squad votes are stored in the database.
            </p>
          </KCard>

          <div className="flex flex-col gap-2">
            {consensusRows.map((row) => {
              const ex = row.act;
              if (!ex) return null;
              const pct = memberCount ? row.count / memberCount : 0;
              const passing = row.count >= majority;
              const ordered = orderedVoterLabels(squad.members, user?.id, teamId, row.slug);
              const voterText =
                ordered.length > 0 ? voterSnippet(row.count, ordered) : `Preview · ${row.count} vote${row.count === 1 ? '' : 's'}`;
              return (
                <KCard key={row.slug} pad={12}>
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className={`w-9 h-9 rounded-k-sm flex items-center justify-center shrink-0 ${
                        passing ? 'bg-k-mint-soft text-emerald-600 dark:text-emerald-400' : 'bg-k-bg text-k-muted-soft'
                      }`}
                    >
                      {(() => {
                        const Icon = exerciseIconForSlug(row.slug);
                        return Icon ? <Icon size={20} /> : null;
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-k-ink truncate">{ex.name}</p>
                      <p className="text-[10px] text-k-muted-soft font-semibold mt-0.5 truncate">{voterText}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-display text-lg font-black italic text-k-ink tabular-nums">
                        {row.count}
                        <span className="text-[11px] font-semibold not-italic text-k-muted-soft">/{memberCount}</span>
                      </span>
                    </div>
                    {passing && (
                      <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shrink-0" aria-hidden>
                        <Check size={14} className="text-white" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <div className="h-1.5 rounded-full bg-k-line-strong/50 overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${passing ? 'bg-emerald-500' : 'bg-k-muted-soft/40'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct * 100}%` }}
                      transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
                    />
                  </div>
                </KCard>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setStage(3)}
            className="w-full py-4 rounded-k-lg bg-emerald-500 text-white text-[13px] font-black tracking-widest uppercase shadow-k-fab"
          >
            Lock in lineup
          </button>
        </motion.div>
      )}

      {stage === 3 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <KCard pad={22} hi className="!bg-gradient-to-b from-k-mint-soft to-k-card border border-k-mint text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center mx-auto mb-4 shadow-k-fab">
              <Check size={32} className="text-white" strokeWidth={2.5} />
            </div>
            <KDisplay size={24}>LINEUP LOCKED</KDisplay>
            <p className="text-[13px] text-k-muted-soft mt-2 leading-relaxed">
              Preview lineup for this flow. Persisting the squad&apos;s official moves still goes through your existing
              team setup — scoring in the app is unchanged.
            </p>
          </KCard>

          <div>
            <KEyebrow className="mb-2">Final lineup</KEyebrow>
            <div className="flex flex-col gap-2">
              {lockedSlugs.map((slug) => {
                const ex = activityTypes.find((a) => a.slug === slug);
                if (!ex) return null;
                const Icon = exerciseIconForSlug(slug);
                return (
                  <KCard key={slug} pad={14}>
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-k-md bg-k-mint-soft flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        {Icon && <Icon size={24} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-extrabold text-k-ink">{ex.name}</p>
                        <p className="text-[10px] text-k-muted-soft font-bold uppercase tracking-wider mt-0.5">{ex.unit}</p>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 bg-k-mint-soft px-2.5 py-1 rounded-k-pill shrink-0">
                        Tracked
                      </span>
                    </div>
                  </KCard>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push(`/squads/${teamId}`)}
            className="w-full py-4 rounded-k-lg bg-emerald-500 text-white text-[13px] font-black tracking-widest uppercase shadow-k-fab"
          >
            Back to squad
          </button>
        </motion.div>
      )}
    </div>
  );
}
