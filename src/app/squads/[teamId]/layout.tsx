import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function SquadTeamLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // If not authenticated, let client-side auth handle redirect
    if (!user) {
      return children;
    }

    const { data, error } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .maybeSingle();

    // Only redirect if the query succeeded and returned no rows
    // (meaning the user is definitively not a member).
    // On query errors (RLS timing, stale session), let the client handle it.
    if (!error && !data) {
      redirect('/squads');
    }
  } catch {
    // On any server-side failure, let the client render and handle errors
  }

  return children;
}
