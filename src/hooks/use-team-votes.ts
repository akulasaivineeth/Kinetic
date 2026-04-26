'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';

export interface TeamVote {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  activity_slugs: string[];
  submitted_at: string;
}

export interface TeamVotesData {
  votes: TeamVote[];
  memberCount: number;
  allVoted: boolean;
  myVote: string[] | null;
  lineupLocked: boolean;
  lockedActivitySlugs: string[];
  lineupLockedAt: string | null;
}

export interface TeamApprovalsData {
  approvals: { user_id: string; approved_at: string }[];
  myApproved: boolean;
}

export function useTeamVotes(teamId: string | null) {
  const { user } = useAuth();
  const supabase = createClient();

  return useQuery({
    queryKey: ['team-votes', teamId, user?.id],
    queryFn: async (): Promise<TeamVotesData> => {
      const empty: TeamVotesData = {
        votes: [],
        memberCount: 0,
        allVoted: false,
        myVote: null,
        lineupLocked: false,
        lockedActivitySlugs: [],
        lineupLockedAt: null,
      };
      if (!teamId || !user) return empty;

      const [teamResult, membersResult, votesResult] = await Promise.all([
        supabase
          .from('teams')
          .select('lineup_locked, lineup_locked_at, lineup_activity_slugs')
          .eq('id', teamId)
          .single(),
        supabase.from('team_members').select('user_id').eq('team_id', teamId),
        // No profile join — team_votes.user_id → auth.users, not directly → profiles
        supabase
          .from('team_votes')
          .select('user_id, activity_slugs, submitted_at')
          .eq('team_id', teamId),
      ]);

      if (votesResult.error) throw votesResult.error;
      if (membersResult.error) throw membersResult.error;

      const memberCount = membersResult.data?.length ?? 0;

      const mappedVotes: TeamVote[] = (votesResult.data ?? []).map(
        (v: Record<string, unknown>) => ({
          user_id: v.user_id as string,
          full_name: '',
          avatar_url: null,
          activity_slugs: (v.activity_slugs as string[]) ?? [],
          submitted_at: v.submitted_at as string,
        }),
      );

      const myVote =
        mappedVotes.find((v) => v.user_id === user.id)?.activity_slugs ?? null;

      const td = teamResult.data as Record<string, unknown> | null;

      return {
        votes: mappedVotes,
        memberCount,
        allVoted: memberCount > 0 && mappedVotes.length >= memberCount,
        myVote,
        lineupLocked: (td?.lineup_locked as boolean) ?? false,
        lockedActivitySlugs: (td?.lineup_activity_slugs as string[]) ?? [],
        lineupLockedAt: (td?.lineup_locked_at as string) ?? null,
      };
    },
    enabled: !!teamId && !!user,
    refetchInterval: 8000,
  });
}

export function useTeamApprovals(teamId: string | null) {
  const { user } = useAuth();
  const supabase = createClient();

  return useQuery({
    queryKey: ['team-approvals', teamId, user?.id],
    queryFn: async (): Promise<TeamApprovalsData> => {
      if (!teamId || !user) return { approvals: [], myApproved: false };
      const { data } = await supabase
        .from('team_lineup_approvals')
        .select('user_id, approved_at')
        .eq('team_id', teamId);
      const approvals = (data ?? []) as { user_id: string; approved_at: string }[];
      return {
        approvals,
        myApproved: approvals.some((a) => a.user_id === user.id),
      };
    },
    enabled: !!teamId && !!user,
    refetchInterval: 8000,
  });
}

export function useSubmitVote() {
  const { user } = useAuth();
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
      activitySlugs,
    }: {
      teamId: string;
      activitySlugs: string[];
    }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('team_votes').upsert(
        {
          team_id: teamId,
          user_id: user.id,
          activity_slugs: activitySlugs,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'team_id,user_id' },
      );
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      // Optimistically update — also handles the case where votesData hasn't loaded yet
      queryClient.setQueryData(
        ['team-votes', vars.teamId, user?.id],
        (old: TeamVotesData | undefined) => {
          if (!user) return old;
          const base: TeamVotesData = old ?? {
            votes: [],
            memberCount: 0,
            allVoted: false,
            myVote: null,
            lineupLocked: false,
            lockedActivitySlugs: [],
            lineupLockedAt: null,
          };
          const otherVotes = base.votes.filter((v) => v.user_id !== user.id);
          const myEntry: TeamVote = {
            user_id: user.id,
            full_name: '',
            avatar_url: null,
            activity_slugs: vars.activitySlugs,
            submitted_at: new Date().toISOString(),
          };
          const newVotes = [...otherVotes, myEntry];
          return {
            ...base,
            myVote: vars.activitySlugs,
            votes: newVotes,
            allVoted: base.memberCount > 0 && newVotes.length >= base.memberCount,
          };
        },
      );
      void queryClient.invalidateQueries({ queryKey: ['team-votes', vars.teamId] });
    },
  });
}

export function useApproveLineup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teamId }: { teamId: string }) => {
      const res = await fetch(`/api/teams/${teamId}/approve`, {
        method: 'POST',
        credentials: 'same-origin',
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        locked?: boolean;
      };
      if (!res.ok) throw new Error(data.error ?? 'Could not approve lineup');
      return data;
    },
    onSuccess: (_, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['team-votes', vars.teamId] });
      void queryClient.invalidateQueries({ queryKey: ['team-approvals', vars.teamId] });
      void queryClient.invalidateQueries({ queryKey: ['team-details', vars.teamId] });
      void queryClient.invalidateQueries({ queryKey: ['user-teams'] });
    },
  });
}

export function useTeamVotesRealtime(teamId: string | null, enabled: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !teamId) return;
    const supabase = createClient();

    const invalidateVotes = () => {
      void queryClient.invalidateQueries({ queryKey: ['team-votes', teamId] });
      void queryClient.invalidateQueries({ queryKey: ['team-approvals', teamId] });
    };

    const channel = supabase
      .channel(`squad-votes-${teamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_votes',
          filter: `team_id=eq.${teamId}`,
        },
        invalidateVotes,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_lineup_approvals',
          filter: `team_id=eq.${teamId}`,
        },
        invalidateVotes,
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'teams',
          filter: `id=eq.${teamId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['team-votes', teamId] });
          void queryClient.invalidateQueries({ queryKey: ['team-details', teamId] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [teamId, enabled, queryClient]);
}
