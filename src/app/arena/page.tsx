'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppShell } from '@/components/layout/app-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { useUserTeams, useCreateTeam, useJoinTeam } from '@/hooks/use-teams';
import { useActivityTypes } from '@/hooks/use-activities';
import { useRouter } from 'next/navigation';
import {
  Plus,
  LogIn,
  Users,
  Copy,
  Check,
  X,
  ChevronRight,
  Shield,
} from 'lucide-react';

export default function SquadsPage() {
  const router = useRouter();
  const { data: teams = [], isLoading } = useUserTeams();
  const createTeam = useCreateTeam();
  const joinTeam = useJoinTeam();
  const { data: activityTypes = [] } = useActivityTypes();
  const emojiMap = useMemo(() => new Map(activityTypes.map(a => [a.slug, a.emoji])), [activityTypes]);

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
      setError(e instanceof Error ? e.message : 'Failed to create team');
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setError('');
    try {
      const result = await joinTeam.mutateAsync(joinCode.trim());
      setShowJoin(false);
      setJoinCode('');
      router.push(`/arena/${result.team_id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Invalid invite code');
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AppShell>
      <div className="max-w-md mx-auto px-1 space-y-5 pt-2 pb-32">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-3xl font-black tracking-tight">Squads</h2>
          <p className="text-[10px] font-semibold tracking-[0.2em] text-dark-muted uppercase mt-0.5">
            COMPETE TOGETHER
          </p>
        </motion.div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowCreate(true);
              setShowJoin(false);
              setCreatedCode(null);
              setError('');
            }}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-black tracking-widest uppercase active:scale-[0.97] transition-all"
          >
            <Plus size={14} strokeWidth={2.5} /> CREATE
          </button>
          <button
            onClick={() => {
              setShowJoin(true);
              setShowCreate(false);
              setError('');
            }}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-dark-elevated border border-dark-border text-dark-text text-[10px] font-black tracking-widest uppercase hover:border-emerald-500/25 active:scale-[0.97] transition-all"
          >
            <LogIn size={14} /> JOIN
          </button>
        </div>

        {/* Create Panel */}
        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <GlassCard className="p-5 space-y-4" animate={false}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black tracking-wider uppercase">
                    New Squad
                  </h3>
                  <button
                    onClick={() => {
                      setShowCreate(false);
                      setCreatedCode(null);
                    }}
                  >
                    <X size={16} className="text-dark-muted" />
                  </button>
                </div>

                {createdCode ? (
                  <div className="text-center space-y-4 py-2">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto">
                      <Shield size={24} className="text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-dark-text">
                        Squad Created
                      </p>
                      <p className="text-[10px] text-dark-muted mt-0.5">
                        Share this code with your crew
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-2xl font-black text-emerald-400 tracking-[0.3em] font-mono">
                        {createdCode}
                      </span>
                      <button
                        onClick={() => handleCopy(createdCode)}
                        className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                      >
                        {copied ? (
                          <Check size={14} className="text-emerald-400" />
                        ) : (
                          <Copy size={14} className="text-emerald-400" />
                        )}
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        setShowCreate(false);
                        setCreatedCode(null);
                      }}
                      className="px-8 py-2.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-black tracking-widest uppercase hover:bg-emerald-500/20 transition-colors"
                    >
                      DONE
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="Squad name"
                      className="w-full px-4 py-3 rounded-xl bg-dark-elevated border border-dark-border text-sm text-dark-text placeholder:text-dark-muted focus:outline-none focus:border-emerald-500/40 transition-colors"
                      maxLength={30}
                    />
                    <div>
                      <p className="text-[10px] font-bold text-dark-muted tracking-wider uppercase mb-2">
                        Activities
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {activityTypes.map((act) => {
                          const on = selectedActivities.includes(act.slug);
                          return (
                            <button
                              key={act.slug}
                              onClick={() =>
                                setSelectedActivities((prev) =>
                                  on
                                    ? prev.filter((s) => s !== act.slug)
                                    : [...prev, act.slug]
                                )
                              }
                              className={`px-2.5 py-1.5 rounded-full text-[10px] font-bold transition-all ${
                                on
                                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                                  : 'bg-dark-elevated border border-dark-border text-dark-muted'
                              }`}
                            >
                              {act.emoji} {act.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {error && (
                      <p className="text-[11px] text-red-400 font-semibold">
                        {error}
                      </p>
                    )}
                    <button
                      onClick={handleCreate}
                      disabled={
                        !teamName.trim() ||
                        selectedActivities.length === 0 ||
                        createTeam.isPending
                      }
                      className="w-full py-3 rounded-xl emerald-gradient text-white text-[10px] font-black tracking-widest uppercase shadow-lg shadow-emerald-500/20 disabled:opacity-40 active:scale-[0.97] transition-all"
                    >
                      {createTeam.isPending ? 'CREATING...' : 'CREATE SQUAD'}
                    </button>
                  </>
                )}
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Join Panel */}
        <AnimatePresence>
          {showJoin && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <GlassCard className="p-5 space-y-4" animate={false}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black tracking-wider uppercase">
                    Join Squad
                  </h3>
                  <button onClick={() => setShowJoin(false)}>
                    <X size={16} className="text-dark-muted" />
                  </button>
                </div>
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Enter invite code"
                  className="w-full px-4 py-3 rounded-xl bg-dark-elevated border border-dark-border text-sm text-dark-text placeholder:text-dark-muted focus:outline-none focus:border-emerald-500/40 tracking-[0.25em] text-center font-black uppercase font-mono transition-colors"
                  maxLength={6}
                />
                {error && (
                  <p className="text-[11px] text-red-400 font-semibold">
                    {error}
                  </p>
                )}
                <button
                  onClick={handleJoin}
                  disabled={!joinCode.trim() || joinTeam.isPending}
                  className="w-full py-3 rounded-xl emerald-gradient text-white text-[10px] font-black tracking-widest uppercase shadow-lg shadow-emerald-500/20 disabled:opacity-40 active:scale-[0.97] transition-all"
                >
                  {joinTeam.isPending ? 'JOINING...' : 'JOIN SQUAD'}
                </button>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Squad List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[88px] rounded-2xl bg-dark-elevated/50 animate-pulse"
              />
            ))}
          </div>
        ) : teams.length > 0 ? (
          <div className="space-y-2.5">
            <p className="text-[10px] font-black tracking-wider text-dark-muted uppercase">
              YOUR SQUADS
            </p>
            {teams.map((team, idx) => (
              <motion.div
                key={team.team_id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 * idx }}
                onClick={() => router.push(`/arena/${team.team_id}`)}
                className="cursor-pointer"
              >
                <GlassCard
                  className="p-0 overflow-hidden hover:border-emerald-500/25 transition-all"
                  animate={false}
                >
                  <div className="flex items-center gap-3.5 p-4">
                    <div className="w-12 h-12 rounded-[14px] bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <Shield size={20} className="text-emerald-500" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-black text-[13px] text-dark-text truncate leading-tight">
                        {team.team_name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-dark-muted font-semibold flex items-center gap-1">
                          <Users size={10} /> {team.member_count}
                        </span>
                        <span className="text-[10px] tracking-wide">
                          {team.activity_slugs
                            ?.slice(0, 5)
                            .map((s) => emojiMap.get(s) ?? '')
                            .join(' ')}
                          {(team.activity_slugs?.length ?? 0) > 5 && (
                            <span className="text-dark-muted ml-0.5">
                              +{team.activity_slugs!.length - 5}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-base font-black text-emerald-400 tabular-nums">
                        {Math.round(team.team_score).toLocaleString()}
                      </p>
                      <p className="text-[8px] text-dark-muted font-bold uppercase tracking-wider">
                        THIS WEEK
                      </p>
                    </div>

                    <ChevronRight
                      size={16}
                      className="text-dark-muted/50 flex-shrink-0"
                    />
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        ) : (
          !showCreate &&
          !showJoin && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <GlassCard className="py-14 text-center">
                <div className="w-16 h-16 rounded-2xl bg-dark-elevated border border-dark-border flex items-center justify-center mx-auto mb-4">
                  <Shield size={28} className="text-dark-muted opacity-40" />
                </div>
                <p className="text-sm font-bold text-dark-text mb-1">
                  No squads yet
                </p>
                <p className="text-[11px] text-dark-muted max-w-[240px] mx-auto leading-relaxed">
                  Create a squad and invite friends to compete, or join one with
                  an invite code.
                </p>
              </GlassCard>
            </motion.div>
          )
        )}
      </div>
    </AppShell>
  );
}
