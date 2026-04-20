import type { ReactNode } from 'react';

/**
 * Squad detail layout — membership enforcement is handled client-side
 * by useTeamDetails() (RLS policies on teams/team_members tables).
 *
 * Server-side checks were removed because they caused race conditions:
 * after creating a squad, the immediate navigation would hit the layout
 * before RLS had propagated the new team_members row, resulting in
 * silent redirects back to /squads.
 */
export default function SquadTeamLayout({
  children,
}: {
  children: ReactNode;
  params: Promise<{ teamId: string }>;
}) {
  return children;
}

