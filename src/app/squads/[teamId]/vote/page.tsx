'use client';

import { useParams } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { SquadLineupVote } from '@/components/squads/squad-lineup-vote';

export default function SquadVotePage() {
  const params = useParams();
  const teamId = typeof params.teamId === 'string' ? params.teamId : null;

  if (!teamId) {
    return (
      <AppShell>
        <p className="text-sm text-k-muted-soft">Invalid squad.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <SquadLineupVote teamId={teamId} />
    </AppShell>
  );
}
