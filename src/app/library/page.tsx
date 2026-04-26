'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { KCard, KEyebrow, KDisplay, KPill } from '@/components/ui/k-primitives';
import { exerciseIcon } from '@/components/ui/k-icons';
import { useActivityTypes } from '@/hooks/use-activities';

function exerciseIconForSlug(slug: string) {
  return exerciseIcon(slug);
}

export default function ExerciseLibraryPage() {
  const { data: activityTypes = [] } = useActivityTypes();
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'all' | 'core' | 'more'>('all');

  const list = useMemo(() => {
    let rows = activityTypes;
    if (tab === 'core') rows = rows.filter((a) => a.is_core);
    if (tab === 'more') rows = rows.filter((a) => !a.is_core);
    const s = q.trim().toLowerCase();
    if (s) rows = rows.filter((a) => a.name.toLowerCase().includes(s) || a.slug.toLowerCase().includes(s));
    return rows;
  }, [activityTypes, tab, q]);

  return (
    <AppShell>
      <div className="space-y-4 pb-28" data-testid="uat-library-page">
        <div className="flex items-start justify-between gap-3">
          <div>
            <KEyebrow>Reference</KEyebrow>
            <KDisplay size={26} className="mt-1">
              EXERCISES
            </KDisplay>
            <p className="text-[12px] text-k-muted-soft mt-2 leading-relaxed max-w-md">
              Browse every move Kinetic knows. Add them to a session from the{' '}
              <Link href="/log" className="font-bold text-emerald-600 dark:text-emerald-400">
                Log
              </Link>{' '}
              tab (Exercise library button).
            </p>
          </div>
        </div>

        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          className="w-full rounded-k-md border border-k-line-strong bg-k-card px-3 py-2.5 text-sm text-k-ink placeholder:text-k-muted-soft outline-none focus:border-emerald-500/45"
        />

        <div className="flex flex-wrap gap-2">
          {(['all', 'core', 'more'] as const).map((t) => (
            <KPill key={t} size="sm" active={tab === t} onClick={() => setTab(t)}>
              {t === 'all' ? 'All' : t === 'core' ? 'Core' : 'More'}
            </KPill>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {list.map((act) => {
            const Icon = exerciseIconForSlug(act.slug);
            return (
              <KCard key={act.slug} pad={14} className="!py-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-9 h-9 rounded-k-sm bg-k-mint-soft flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    {Icon && <Icon size={22} />}
                  </div>
                  <span className="text-[12px] font-bold text-k-ink leading-tight line-clamp-2">{act.name}</span>
                </div>
                <p className="text-[10px] font-semibold text-k-muted-soft uppercase tracking-wide">{act.unit}</p>
              </KCard>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
