'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AppShell } from '@/components/layout/app-shell';
import {
  KCard,
  KEyebrow,
  KDisplay,
  KPill,
  KCrest,
  CREST_EMBLEM_OPTIONS,
  CREST_SHAPE_OPTIONS,
  type KCrestEmblem,
  type KCrestShape,
} from '@/components/ui/k-primitives';
import { IcBack } from '@/components/ui/k-icons';
import { useCreateTeam } from '@/hooks/use-teams';
import { useActivityTypes } from '@/hooks/use-activities';
import type { TeamCrestPick } from '@/lib/squad-crest-codec';

const PRESET_COLORS = [
  '#1FB37A',
  '#2563EB',
  '#7C3AED',
  '#DC2626',
  '#EA580C',
  '#CA8A04',
  '#0D9488',
  '#DB2777',
  '#4B5563',
  '#B45309',
] as const;

export default function NewSquadPage() {
  const router = useRouter();
  const createTeam = useCreateTeam();
  const { data: activityTypes = [] } = useActivityTypes();

  const [name, setName] = useState('');
  const [shape, setShape] = useState<KCrestShape>('shield');
  const [emblem, setEmblem] = useState<KCrestEmblem>('bolt');
  const [color, setColor] = useState<string>(PRESET_COLORS[0]);
  const [selectedActivities, setSelectedActivities] = useState<string[]>(['pushups', 'squats', 'plank', 'run']);
  const [error, setError] = useState('');

  const crest: TeamCrestPick = useMemo(() => ({ shape, emblem, color }), [shape, emblem, color]);

  const handleCreate = async () => {
    if (!name.trim() || selectedActivities.length === 0) return;
    setError('');
    try {
      const result = await createTeam.mutateAsync({
        name: name.trim(),
        activitySlugs: selectedActivities,
        crest,
      });
      router.replace(`/squads/${result.team_id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not create squad');
    }
  };

  return (
    <AppShell>
      <div className="space-y-5 pt-1 pb-28">
        <Link
          href="/squads"
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-k-muted-soft hover:text-k-ink no-underline"
        >
          <IcBack size={18} /> Squads hub
        </Link>

        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
          <KEyebrow>New squad</KEyebrow>
          <KDisplay size={28} className="mt-1">
            CREATE
          </KDisplay>
          <p className="text-[13px] text-k-muted-soft mt-2 max-w-[320px] leading-snug">
            Name your crew, pick a crest, and choose which moves show up in squad stats.
          </p>
        </motion.div>

        <KCard hi>
          <p className="text-[11px] font-bold uppercase tracking-wide text-k-muted-soft mb-2">Preview</p>
          <div className="flex justify-center py-4">
            <KCrest {...crest} size={88} glow />
          </div>
        </KCard>

        <KCard>
          <label className="text-[11px] font-bold uppercase tracking-wide text-k-muted-soft">Squad name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Dawn Patrol"
            className="mt-2 w-full px-4 py-3 rounded-k-lg border border-k-line-strong bg-k-bg text-k-ink text-sm placeholder:text-k-muted-soft"
            maxLength={30}
          />
        </KCard>

        <div>
          <KEyebrow className="mb-2">Crest shape</KEyebrow>
          <div className="flex flex-wrap gap-1.5">
            {CREST_SHAPE_OPTIONS.map((s) => (
              <KPill key={s} size="sm" active={shape === s} onClick={() => setShape(s)}>
                {s}
              </KPill>
            ))}
          </div>
        </div>

        <div>
          <KEyebrow className="mb-2">Emblem</KEyebrow>
          <div className="flex flex-wrap gap-1.5">
            {CREST_EMBLEM_OPTIONS.map((e) => (
              <KPill key={e} size="sm" active={emblem === e} onClick={() => setEmblem(e)}>
                {e}
              </KPill>
            ))}
          </div>
        </div>

        <div>
          <KEyebrow className="mb-2">Color</KEyebrow>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="w-9 h-9 rounded-full border-2 shrink-0 transition-transform active:scale-95"
                style={{
                  background: c,
                  borderColor: color === c ? '#0B0D0C' : 'transparent',
                  boxShadow: color === c ? '0 0 0 2px #fff, 0 0 0 4px #0B0D0C' : 'none',
                }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </div>

        <KCard>
          <p className="text-[11px] font-bold uppercase tracking-wide text-k-muted-soft mb-2">Tracked activities</p>
          <div className="flex flex-wrap gap-1.5">
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
        </KCard>

        {error && <p className="text-[12px] text-red-500 px-1">{error}</p>}

        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={!name.trim() || selectedActivities.length === 0 || createTeam.isPending}
          className="w-full py-3.5 rounded-k-lg bg-emerald-500 text-white font-bold text-[13px] disabled:opacity-40 shadow-k-card"
        >
          {createTeam.isPending ? 'Creating…' : 'Create squad'}
        </button>
      </div>
    </AppShell>
  );
}
