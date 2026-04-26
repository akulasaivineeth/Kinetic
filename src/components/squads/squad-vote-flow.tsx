'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Clock, ChevronRight, Share2, Copy, RotateCcw, ThumbsUp, Zap } from 'lucide-react';
import { KCard, KEyebrow, KDisplay, KAvatar } from '@/components/ui/k-primitives';
import { exerciseIcon as getExerciseIcon } from '@/components/ui/k-icons';
import type { ActivityType } from '@/types/database';
import type { TeamDetails } from '@/types/database';
import type { TeamVotesData, TeamApprovalsData } from '@/hooks/use-team-votes';
import { useSubmitVote, useApproveLineup } from '@/hooks/use-team-votes';

const MAX_PICKS = 6;
const SPRING = { type: 'spring', damping: 26, stiffness: 320 } as const;

function exerciseIcon(slug: string) {
  return getExerciseIcon(slug);
}

function majorityThreshold(n: number) {
  return Math.floor(n / 2) + 1;
}

/* ── Vote Picker ──────────────────────────────────────────────────────────── */

interface VotePickerProps {
  teamId: string;
  activityTypes: ActivityType[];
  initialPicks?: string[];
  isChanging?: boolean;
  onSubmitted: () => void;
}

export function SquadVotePicker({
  teamId,
  activityTypes,
  initialPicks,
  isChanging = false,
  onSubmitted,
}: VotePickerProps) {
  const [picks, setPicks] = useState<Set<string>>(
    () => new Set(initialPicks ?? activityTypes.filter((a) => a.is_core).map((a) => a.slug).slice(0, 4)),
  );
  const [cat, setCat] = useState<'all' | 'core' | 'more'>('all');
  const submitVote = useSubmitVote();

  const initialPicksKey = initialPicks?.join(',') ?? '';
  useEffect(() => {
    if (initialPicks?.length) setPicks(new Set(initialPicks));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPicksKey]);

  const filtered = useMemo(() => {
    if (cat === 'core') return activityTypes.filter((a) => a.is_core);
    if (cat === 'more') return activityTypes.filter((a) => !a.is_core);
    return activityTypes;
  }, [activityTypes, cat]);

  const toggle = useCallback((slug: string) => {
    setPicks((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else if (next.size < MAX_PICKS) {
        next.add(slug);
      }
      return next;
    });
  }, []);

  const handleSubmit = async () => {
    await submitVote.mutateAsync({ teamId, activitySlugs: [...picks] });
    onSubmitted();
  };

  const containerItem = {
    hidden: { opacity: 0, y: 10 },
    show: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.04, ...SPRING },
    }),
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={SPRING}
      className="space-y-4"
    >
      {/* Header */}
      <div className="text-center pt-1 pb-2">
        <KEyebrow className="mb-1.5">
          {isChanging ? 'Change your picks' : 'Cast your vote'}
        </KEyebrow>
        <KDisplay size={28}>
          {isChanging ? 'NEW PICKS' : 'YOUR BATTLES'}
        </KDisplay>
        <p className="text-[12px] text-k-muted-soft mt-2 leading-snug max-w-[280px] mx-auto">
          Choose up to {MAX_PICKS} moves your squad will compete in. You can change this until everyone approves.
        </p>
      </div>

      {/* Category filter */}
      <div className="flex gap-2">
        {(['all', 'core', 'more'] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCat(c)}
            className={`px-4 py-1.5 rounded-k-pill text-[11px] font-bold uppercase tracking-wide border transition-all ${
              cat === c
                ? 'bg-k-mint border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-k-card border-k-line-strong text-k-muted-soft'
            }`}
          >
            {c === 'all' ? 'All' : c === 'core' ? 'Core' : 'More'}
          </button>
        ))}
        {picks.size > 0 && (
          <span className="ml-auto self-center text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            {picks.size}/{MAX_PICKS}
          </span>
        )}
      </div>

      {/* Activity grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {filtered.map((ex, i) => {
          const picked = picks.has(ex.slug);
          const blocked = !picked && picks.size >= MAX_PICKS;
          const Icon = exerciseIcon(ex.slug);
          return (
            <motion.button
              key={ex.slug}
              custom={i}
              variants={containerItem}
              initial="hidden"
              animate="show"
              type="button"
              onClick={() => toggle(ex.slug)}
              disabled={blocked}
              whileTap={{ scale: 0.95 }}
              className={`text-left rounded-k-md p-4 border-2 relative overflow-hidden transition-colors ${
                picked
                  ? 'border-emerald-500 shadow-k-card-hi'
                  : blocked
                    ? 'border-transparent shadow-k-card opacity-40 cursor-not-allowed'
                    : 'border-transparent shadow-k-card hover:border-k-line-strong'
              }`}
              style={picked ? { background: 'var(--k-mint-soft)' } : { background: 'var(--k-card)' }}
            >
              {/* Selected fill shimmer */}
              {picked && (
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(31,179,122,0.06) 0%, transparent 60%)',
                  }}
                />
              )}

              {/* Icon */}
              <div
                className={`w-11 h-11 rounded-k-sm flex items-center justify-center mb-3 transition-colors ${
                  picked
                    ? 'bg-emerald-500 text-white'
                    : 'bg-k-mint-soft text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {Icon && <Icon size={22} />}
              </div>

              <p className="text-[13px] font-bold text-k-ink leading-tight">{ex.name}</p>
              <p className="text-[10px] text-k-muted-soft font-semibold mt-1 uppercase tracking-wide">
                {ex.unit}
              </p>

              {/* Check badge */}
              <AnimatePresence>
                {picked && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', damping: 18, stiffness: 360 }}
                    className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center"
                  >
                    <Check size={13} className="text-white" strokeWidth={3} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      {/* Submit */}
      <div className="pt-2 pb-1">
        <motion.button
          type="button"
          disabled={picks.size === 0 || submitVote.isPending}
          onClick={() => void handleSubmit()}
          whileTap={{ scale: 0.97 }}
          className="w-full flex items-center justify-center gap-2.5 py-4 rounded-k-pill bg-emerald-500 text-white text-[13px] font-black tracking-[0.12em] uppercase disabled:opacity-40 shadow-k-fab"
        >
          {submitVote.isPending ? (
            'Submitting…'
          ) : (
            <>
              {isChanging ? 'Update Vote' : 'Submit Vote'} · {picks.size}/{MAX_PICKS}
              <ChevronRight size={16} strokeWidth={2.5} />
            </>
          )}
        </motion.button>
        {submitVote.isError && (
          <div className="mt-2 px-4 py-3 rounded-k-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
            <p className="text-[12px] text-red-600 dark:text-red-400 font-semibold text-center">
              {submitVote.error instanceof Error ? submitVote.error.message : 'Failed to submit — try again'}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ── Vote Waiting Room ────────────────────────────────────────────────────── */

interface VoteWaitingProps {
  teamId: string;
  squad: TeamDetails;
  activityTypes: ActivityType[];
  votesData: TeamVotesData;
  onChangeVote: () => void;
}

export function SquadVoteWaiting({
  squad,
  activityTypes,
  votesData,
  onChangeVote,
}: VoteWaitingProps) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    void navigator.clipboard.writeText(squad.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const myVotedActivities = useMemo(() => {
    return (votesData.myVote ?? [])
      .map((slug) => activityTypes.find((a) => a.slug === slug))
      .filter((a): a is ActivityType => !!a);
  }, [votesData.myVote, activityTypes]);

  const votedUserIds = new Set(votesData.votes.map((v) => v.user_id));
  const votedCount = votesData.votes.length;
  const totalCount = votesData.memberCount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={SPRING}
      className="space-y-4"
    >
      {/* Header */}
      <KCard hi className="text-center !py-6">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 16, stiffness: 300, delay: 0.1 }}
          className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-4"
        >
          <Check size={26} className="text-white" strokeWidth={2.5} />
        </motion.div>
        <KEyebrow className="mb-1">Vote cast</KEyebrow>
        <KDisplay size={24} className="mb-2">YOUR PICKS</KDisplay>
        <div className="flex flex-wrap justify-center gap-1.5 mt-3">
          {myVotedActivities.map((act) => {
            const Icon = exerciseIcon(act.slug);
            return (
              <span
                key={act.slug}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-k-pill bg-k-mint border border-emerald-500/25 text-[11px] font-bold text-emerald-800 dark:text-emerald-300"
              >
                {Icon && <Icon size={13} />}
                {act.name}
              </span>
            );
          })}
        </div>
      </KCard>

      {/* Progress */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <KEyebrow>Crew status</KEyebrow>
          <span className="text-[12px] font-bold text-k-muted-soft tabular-nums">
            {votedCount}/{totalCount} voted
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-k-line-strong/50 overflow-hidden mb-3">
          <motion.div
            className="h-full rounded-full bg-emerald-500"
            initial={{ width: 0 }}
            animate={{ width: totalCount > 0 ? `${(votedCount / totalCount) * 100}%` : '0%' }}
            transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
          />
        </div>

        <div className="space-y-2">
          {squad.members.map((member) => {
            const hasVoted = votedUserIds.has(member.user_id);
            return (
              <motion.div
                key={member.user_id}
                layout
                className="flex items-center gap-3 px-4 py-3 rounded-k-lg bg-k-card shadow-k-card"
              >
                <div className="relative">
                  <KAvatar name={member.full_name} src={member.avatar_url} size={40} />
                  <AnimatePresence>
                    {hasVoted && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ type: 'spring', damping: 15, stiffness: 320 }}
                        className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-k-card"
                      >
                        <Check size={10} className="text-white" strokeWidth={3} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-k-ink truncate">{member.full_name || 'Member'}</p>
                  <p className={`text-[10px] font-semibold mt-0.5 ${hasVoted ? 'text-emerald-600 dark:text-emerald-400' : 'text-k-muted-soft'}`}>
                    {hasVoted ? 'Voted' : 'Waiting…'}
                  </p>
                </div>
                {hasVoted ? (
                  <div className="w-8 h-8 rounded-full bg-k-mint flex items-center justify-center">
                    <Check size={15} className="text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-k-bg border border-k-line-strong flex items-center justify-center">
                    <Clock size={14} className="text-k-muted-soft" strokeWidth={2} />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Share invite */}
      <KCard>
        <p className="text-[11px] font-bold uppercase tracking-widest text-k-muted-soft mb-3">
          <Share2 size={12} className="inline mr-1.5" />
          Invite your crew
        </p>
        <button
          type="button"
          onClick={copy}
          className="w-full flex items-center justify-between px-4 py-3.5 rounded-k-lg bg-k-bg border border-k-line-strong active:scale-[0.98] transition-transform"
        >
          <span className="font-k-mono font-black text-[20px] tracking-[0.32em] text-k-ink">
            {squad.invite_code}
          </span>
          <span className="w-9 h-9 flex items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            {copied ? <Check size={16} strokeWidth={2.5} /> : <Copy size={15} strokeWidth={2} />}
          </span>
        </button>
      </KCard>

      {/* Change vote */}
      <div className="flex justify-center pb-1">
        <button
          type="button"
          onClick={onChangeVote}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-k-muted-soft hover:text-k-ink py-2 px-4 rounded-k-pill border border-k-line-strong bg-k-card"
        >
          <RotateCcw size={13} strokeWidth={2} />
          Change my vote
        </button>
      </div>
    </motion.div>
  );
}

/* ── Consensus & Approval ─────────────────────────────────────────────────── */

interface VoteApprovingProps {
  teamId: string;
  squad: TeamDetails;
  activityTypes: ActivityType[];
  votesData: TeamVotesData;
  approvalsData: TeamApprovalsData;
  onChangeVote: () => void;
}

export function SquadVoteApproving({
  teamId,
  squad,
  activityTypes,
  votesData,
  approvalsData,
  onChangeVote,
}: VoteApprovingProps) {
  const approveLineup = useApproveLineup();
  const memberCount = squad.members.length;
  const majority = majorityThreshold(memberCount);

  const consensusRows = useMemo(() => {
    const slugCounts = new Map<string, number>();
    for (const vote of votesData.votes) {
      for (const slug of vote.activity_slugs) {
        slugCounts.set(slug, (slugCounts.get(slug) ?? 0) + 1);
      }
    }
    return [...slugCounts.entries()]
      .map(([slug, count]) => ({
        slug,
        count,
        act: activityTypes.find((a) => a.slug === slug),
        passing: count >= majority,
      }))
      .filter((r) => r.act)
      .sort((a, b) => b.count - a.count);
  }, [votesData.votes, activityTypes, majority]);

  const lockedSlugs = useMemo(() => {
    const passing = consensusRows.filter((r) => r.passing).map((r) => r.slug);
    if (passing.length) return passing.slice(0, MAX_PICKS);
    return consensusRows.slice(0, 4).map((r) => r.slug);
  }, [consensusRows]);

  const approvedIds = new Set(approvalsData.approvals.map((a) => a.user_id));
  const myApproved = approvalsData.myApproved;
  const approvedCount = approvalsData.approvals.length;

  const handleApprove = async () => {
    await approveLineup.mutateAsync({ teamId });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={SPRING}
      className="space-y-4"
    >
      {/* Header */}
      <div className="text-center pt-1 pb-2">
        <KEyebrow className="mb-1.5">All votes in</KEyebrow>
        <KDisplay size={28}>CONSENSUS</KDisplay>
        <p className="text-[12px] text-k-muted-soft mt-2 leading-snug max-w-[280px] mx-auto">
          Needs {majority} of {memberCount} votes to make the lineup. Approve to lock it in.
        </p>
      </div>

      {/* Vote bars */}
      <div className="space-y-2">
        {consensusRows.map((row) => {
          const Icon = exerciseIcon(row.slug);
          const pct = memberCount > 0 ? row.count / memberCount : 0;
          const isLocked = lockedSlugs.includes(row.slug);
          return (
            <KCard key={row.slug} pad={14}>
              <div className="flex items-center gap-3 mb-2.5">
                <div
                  className={`w-10 h-10 rounded-k-sm flex items-center justify-center shrink-0 ${
                    isLocked
                      ? 'bg-emerald-500 text-white'
                      : 'bg-k-bg text-k-muted-soft'
                  }`}
                >
                  {Icon && <Icon size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-k-ink">{row.act!.name}</p>
                  <p className="text-[10px] text-k-muted-soft font-semibold mt-0.5 uppercase tracking-wide">
                    {row.act!.unit}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-display text-[18px] font-black italic text-k-ink tabular-nums">
                    {row.count}
                    <span className="text-[11px] font-semibold not-italic text-k-muted-soft">
                      /{memberCount}
                    </span>
                  </span>
                  {isLocked && (
                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                      <Check size={13} className="text-white" strokeWidth={3} />
                    </div>
                  )}
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-k-line-strong/40 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${isLocked ? 'bg-emerald-500' : 'bg-k-muted-soft/40'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct * 100}%` }}
                  transition={{ duration: 0.65, ease: [0.2, 0.8, 0.2, 1], delay: 0.1 }}
                />
              </div>
            </KCard>
          );
        })}
      </div>

      {/* The Lineup */}
      {lockedSlugs.length > 0 && (
        <div>
          <KEyebrow className="mb-2">The lineup</KEyebrow>
          <div className="flex flex-wrap gap-1.5">
            {lockedSlugs.map((slug) => {
              const act = activityTypes.find((a) => a.slug === slug);
              if (!act) return null;
              const Icon = exerciseIcon(slug);
              return (
                <span
                  key={slug}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-k-pill bg-k-mint border border-emerald-500/25 text-[11px] font-bold text-emerald-800 dark:text-emerald-300"
                >
                  {Icon && <Icon size={13} />}
                  {act.name}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Member approvals */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <KEyebrow>Approvals</KEyebrow>
          <span className="text-[12px] font-bold text-k-muted-soft tabular-nums">
            {approvedCount}/{memberCount}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {squad.members.map((member) => {
            const approved = approvedIds.has(member.user_id);
            return (
              <div key={member.user_id} className="relative">
                <KAvatar name={member.full_name} src={member.avatar_url} size={40} />
                <AnimatePresence>
                  {approved && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ type: 'spring', damping: 14, stiffness: 340 }}
                      className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-k-card"
                    >
                      <Check size={10} className="text-white" strokeWidth={3} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* Approve button */}
      {myApproved ? (
        <KCard className="!py-4 text-center border border-emerald-500/20 !bg-k-mint-soft">
          <div className="flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-300">
            <ThumbsUp size={18} strokeWidth={2} />
            <span className="text-[13px] font-bold">You approved · waiting for crew</span>
          </div>
          {approvedCount < memberCount && (
            <p className="text-[11px] text-k-muted-soft mt-1.5">
              {memberCount - approvedCount} member{memberCount - approvedCount !== 1 ? 's' : ''} still reviewing
            </p>
          )}
        </KCard>
      ) : (
        <motion.button
          type="button"
          onClick={() => void handleApprove()}
          disabled={approveLineup.isPending}
          whileTap={{ scale: 0.97 }}
          className="w-full flex items-center justify-center gap-2.5 py-4 rounded-k-pill bg-emerald-500 text-white text-[13px] font-black tracking-[0.12em] uppercase disabled:opacity-50 shadow-k-fab"
        >
          {approveLineup.isPending ? (
            'Approving…'
          ) : (
            <>
              <Zap size={16} strokeWidth={2.5} />
              Approve Lineup
              <ChevronRight size={16} strokeWidth={2.5} />
            </>
          )}
        </motion.button>
      )}
      {approveLineup.isError && (
        <p className="text-[12px] text-red-500 text-center">
          {approveLineup.error instanceof Error ? approveLineup.error.message : 'Failed to approve'}
        </p>
      )}

      <div className="flex justify-center pb-1">
        <button
          type="button"
          onClick={onChangeVote}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-k-muted-soft hover:text-k-ink py-2 px-4 rounded-k-pill border border-k-line-strong bg-k-card"
        >
          <RotateCcw size={13} strokeWidth={2} />
          Change my vote
        </button>
      </div>
    </motion.div>
  );
}
