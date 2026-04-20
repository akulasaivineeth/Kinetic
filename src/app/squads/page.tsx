'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, LogIn, Copy, Check, X, ChevronRight, Users } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { KCard, KEyebrow, KDisplay, KPill, KCrest, crestVariantFromSeed } from '@/components/ui/k-primitives';
import {
  useUserTeams,
  useCreateTeam,
  useJoinTeam,
  useGlobalSquadsThisWeek,
  type GlobalSquadRow,
} from '@/hooks/use-teams';
import { useActivityTypes } from '@/hooks/use-activities';
import type { UserTeam } from '@/types/database';

type HubRow = UserTeam | GlobalSquadRow;

function isUserTeam(r: HubRow): r is UserTeam {
  return 'user_role' in r;
}

export default function SquadsHubPage() {
  const router = useRouter();
  const [scope, setScope] = useState<'yours' | 'global'>('yours');
  const { data: yours = [], isLoading: loadYours } = useUserTeams();
  const { data: globalRows = [], isLoading: loadGlobal, error: globalErr } = useGlobalSquadsThisWeek();
  const createTeam = useCreateTeam();
  const joinTeam = useJoinTeam();
  const { data: activityTypes = [] } = useActivityTypes();
  const emojiMap = useMemo(() => new Map(activityTypes.map((a) => [a.slug, a.emoji])), [activityTypes]);

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [selectedActivities, setSelectedActivities] = useState<string[]>([
    'pushups',
    'squats',
    'plank',
    'run',
  ]);
  const [joinCode, setJoinCode] = useState('');
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const rows = useMemo((): HubRow[] => {
    if (scope === 'yours') return yours;
    return globalRows;
  }, [scope, yours, globalRows]);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => b.team_score - a.team_score),
    [rows],
  );
  const podium = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  const loading = scope === 'yours' ? loadYours : loadGlobal;

  const handleCreate = async () => {
    if (!teamName.trim() || selectedActivities.length === 0) return;
    setError('');
    try {
      const result = await createTeam.mutateAsync({
        name: teamName.trim(),
        activitySlugs: selectedActivities,
      });
      setCreatedCode(result.invite_code);
      setTeamName('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create squad');
    }
  };

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

  const handleCopy = (code: string) => {
    void navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AppShell>
      <div className="space-y-5 pt-1 pb-28" data-testid="uat-squads-page">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <KEyebrow>Squads</KEyebrow>
          <KDisplay size={30} className="mt-1">
            HUB
          </KDisplay>
          <p className="text-[13px] text-k-muted-soft mt-2 leading-snug max-w-[320px]">
            Weekly squad totals use the same session scoring as your personal log.
          </p>
        </motion.div>

        <div className="flex gap-2 flex-wrap">
          <KPill active={scope === 'yours'} onClick={() => setScope('yours')} size="sm">
            Yours
          </KPill>
          <KPill active={scope === 'global'} onClick={() => setScope('global')} size="sm">
            Global
          </KPill>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setShowCreate(true);
              setShowJoin(false);
              setCreatedCode(null);
              setError('');
            }}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-k-lg bg-k-mint text-emerald-700 font-bold text-[12px] tracking-wide shadow-k-card"
          >
            <Plus size={16} strokeWidth={2.5} /> New squad
          </button>
          <button
            type="button"
            onClick={() => {
              setShowJoin(true);
              setShowCreate(false);
              setError('');
            }}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-k-lg border border-k-line-strong bg-k-card text-k-ink font-bold text-[12px] tracking-wide shadow-k-card"
          >
            <LogIn size={16} /> Join
          </button>
        </div>

        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <KCard hi>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[13px] font-bold text-k-ink">Create squad</span>
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={() => {
                      setShowCreate(false);
                      setCreatedCode(null);
                    }}
                    className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    <X size={18} className="text-k-muted-soft" />
                  </button>
                </div>

                {createdCode ? (
                  <div className="text-center space-y-4 py-1">
                    <KCrest {...crestVariantFromSeed(createdCode)} size={64} glow />
                    <p className="text-sm font-semibold text-k-ink">Squad ready</p>
                    <p className="text-[12px] text-k-muted-soft">Share this invite code</p>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-2xl font-display tracking-[0.35em] text-emerald-600 dark:text-emerald-400">
                        {createdCode}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(createdCode)}
                        className="p-2.5 rounded-k-lg border border-k-line-strong bg-k-bg"
                      >
                        {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} className="text-k-muted-soft" />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreate(false);
                        setCreatedCode(null);
                      }}
                      className="px-6 py-2.5 rounded-k-pill bg-k-mint text-emerald-800 font-bold text-[12px]"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="Squad name"
                      className="w-full px-4 py-3 rounded-k-lg border border-k-line-strong bg-k-bg text-k-ink text-sm placeholder:text-k-muted-soft mb-3"
                      maxLength={30}
                    />
                    <p className="text-[11px] font-semibold text-k-muted-soft uppercase tracking-wide mb-2">Activities</p>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {activityTypes.map((act) => {
                        const on = selectedActivities.includes(act.slug);
                        return (
                          <button
                            key={act.slug}
                            type="button"
                            onClick={() =>
                              setSelectedActivities((prev) =>
                                on ? prev.filter((s) => s !== act.slug) : [...prev, act.slug],
                              )
                            }
                            className={`px-2.5 py-1.5 rounded-k-pill text-[11px] font-semibold border ${
                              on
                                ? 'bg-k-mint border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                                : 'border-k-line-strong text-k-muted-soft'
                            }`}
                          >
                            {act.emoji} {act.name}
                          </button>
                        );
                      })}
                    </div>
                    {error && <p className="text-[12px] text-red-500 mb-2">{error}</p>}
                    <button
                      type="button"
                      onClick={() => void handleCreate()}
                      disabled={!teamName.trim() || selectedActivities.length === 0 || createTeam.isPending}
                      className="w-full py-3.5 rounded-k-lg bg-emerald-500 text-white font-bold text-[12px] disabled:opacity-40"
                    >
                      {createTeam.isPending ? 'Creating…' : 'Create squad'}
                    </button>
                  </>
                )}
              </KCard>
            </motion.div>
          )}
        </AnimatePresence>

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
                  className="w-full px-4 py-3 rounded-k-lg border border-k-line-strong bg-k-bg text-center font-mono font-bold tracking-[0.3em] text-k-ink mb-3"
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

        {scope === 'global' && globalErr && (
          <p className="text-[12px] text-red-500 px-1">
            Could not load global squads. You may only see squads you belong to.
          </p>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[92px] rounded-k-lg bg-k-card shadow-k-card animate-pulse" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          !showCreate &&
          !showJoin && (
            <KCard className="text-center py-12">
              <div className="mx-auto opacity-50 w-fit">
                <KCrest {...crestVariantFromSeed('empty')} size={56} />
              </div>
              <p className="text-sm font-semibold text-k-ink mt-4">
                {scope === 'yours' ? 'No squads yet' : 'No squads to show'}
              </p>
              <p className="text-[12px] text-k-muted-soft mt-2 max-w-[260px] mx-auto leading-relaxed">
                {scope === 'yours'
                  ? 'Create a squad or join one with an invite code.'
                  : 'Create the first squad on Kinetic or switch to Yours.'}
              </p>
            </KCard>
          )
        ) : (
          <>
            {podium.length > 0 && (
              <div>
                <KEyebrow className="mb-3">This week — top 3</KEyebrow>
                <div className="flex items-end justify-center gap-2 sm:gap-4 px-1">
                  {[podium[1], podium[0], podium[2]].map((row, i) => {
                    const rank = i === 0 ? 2 : i === 1 ? 1 : 3;
                    const h = rank === 1 ? 'pt-2' : 'opacity-95';
                    if (!row) {
                      return (
                        <div key={`empty-${rank}`} className={`flex-1 max-w-[110px] flex flex-col items-center ${h}`}>
                          <div className="w-full rounded-k-lg bg-k-bg border border-dashed border-k-line-strong h-[100px] flex items-center justify-center text-k-muted-soft text-xs">
                            —
                          </div>
                          <span className="text-[11px] font-bold text-k-muted-soft mt-2">#{rank}</span>
                        </div>
                      );
                    }
                    const crest = crestVariantFromSeed(row.team_id);
                    const ring =
                      rank === 1 ? '#E6C200' : rank === 2 ? '#9CA3AF' : '#B87333';
                    return (
                      <Link
                        key={row.team_id}
                        href={`/squads/${row.team_id}`}
                        className={`flex-1 max-w-[118px] flex flex-col items-center ${h}`}
                      >
                        <motion.div whileTap={{ scale: 0.97 }} className="w-full">
                          <KCard pad={14} className="text-center border-t-4" style={{ borderTopColor: ring }}>
                            <div className="flex justify-center mb-2">
                              <KCrest {...crest} size={rank === 1 ? 58 : 48} glow={rank === 1} />
                            </div>
                            <p className="text-[12px] font-bold text-k-ink truncate w-full">{row.team_name}</p>
                            <p className="text-lg font-display text-emerald-600 dark:text-emerald-400 tabular-nums mt-1">
                              {Math.round(row.team_score).toLocaleString()}
                            </p>
                            <p className="text-[9px] font-semibold text-k-muted-soft uppercase tracking-wider">pts</p>
                          </KCard>
                        </motion.div>
                        <span className="text-[11px] font-bold text-k-muted-soft mt-2">#{rank}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {rest.length > 0 && (
              <div className="space-y-2">
                <KEyebrow>Standings</KEyebrow>
                {rest.map((row, idx) => (
                  <SquadStandingRow
                    key={row.team_id}
                    row={row}
                    rank={idx + 4}
                    emojiMap={emojiMap}
                    showYouBadge={scope === 'yours' && isUserTeam(row)}
                  />
                ))}
              </div>
            )}

            {sorted.length > 0 && sorted.length <= 3 && (
              <p className="text-[11px] text-k-muted-soft text-center">
                Invite more crews to fill the podium.
              </p>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

function SquadStandingRow({
  row,
  rank,
  emojiMap,
  showYouBadge,
}: {
  row: HubRow;
  rank: number;
  emojiMap: Map<string, string>;
  showYouBadge?: boolean;
}) {
  const crest = crestVariantFromSeed(row.team_id);
  const slugLine =
    isUserTeam(row) && row.activity_slugs?.length
      ? row.activity_slugs
          .slice(0, 5)
          .map((s) => emojiMap.get(s) ?? '')
          .join(' ')
      : '';

  return (
    <Link href={`/squads/${row.team_id}`}>
      <motion.div whileTap={{ scale: 0.99 }}>
        <KCard className="flex items-center gap-3 !py-3.5">
          <span className="text-[13px] font-display w-7 text-k-muted-soft tabular-nums">{rank}</span>
          <KCrest {...crest} size={44} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-bold text-k-ink truncate">{row.team_name}</p>
              {showYouBadge && (
                <span className="text-[9px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 shrink-0">
                  you
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-k-muted-soft">
              <span className="inline-flex items-center gap-0.5">
                <Users size={11} /> {row.member_count}
              </span>
              {slugLine ? <span>{slugLine}</span> : null}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[15px] font-display text-emerald-600 dark:text-emerald-400 tabular-nums">
              {Math.round(row.team_score).toLocaleString()}
            </p>
            <p className="text-[9px] font-semibold text-k-muted-soft uppercase">week</p>
          </div>
          <ChevronRight size={16} className="text-k-muted-soft shrink-0" />
        </KCard>
      </motion.div>
    </Link>
  );
}
