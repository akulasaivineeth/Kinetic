'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import type { UserTeam, TeamDetails, TeamMessage, TeamLeaderboardEntry, TeamMilestone } from '@/types/database';

export function useUserTeams() {
  const { user } = useAuth();
  const supabase = createClient();

  return useQuery({
    queryKey: ['user-teams', user?.id],
    queryFn: async (): Promise<UserTeam[]> => {
      if (!user) return [];
      const { data, error } = await supabase.rpc('get_user_teams' as string, { p_user_id: user.id } as Record<string, unknown>);
      if (error) throw error;
      return (data ?? []) as UserTeam[];
    },
    enabled: !!user,
  });
}

export function useTeamDetails(teamId: string | null) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['team-details', teamId],
    queryFn: async (): Promise<TeamDetails | null> => {
      if (!teamId) return null;
      const { data, error } = await supabase.rpc('get_team_details' as string, { p_team_id: teamId } as Record<string, unknown>);
      if (error) throw error;
      return (data as TeamDetails[])?.[0] ?? null;
    },
    enabled: !!teamId,
  });
}

export function useTeamMessages(teamId: string | null) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['team-messages', teamId],
    queryFn: async (): Promise<TeamMessage[]> => {
      if (!teamId) return [];
      const { data, error } = await supabase.rpc('get_team_messages' as string, { p_team_id: teamId, p_limit: 50 } as Record<string, unknown>);
      if (error) throw error;
      return (data ?? []) as TeamMessage[];
    },
    enabled: !!teamId,
    refetchInterval: 5000,
  });
}

export function useTeamLeaderboard(teamId: string | null, dateFrom?: string, dateTo?: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['team-leaderboard', teamId, dateFrom, dateTo],
    queryFn: async (): Promise<TeamLeaderboardEntry[]> => {
      if (!teamId) return [];
      const { data, error } = await supabase.rpc('get_team_leaderboard' as string, {
        p_team_id: teamId,
        p_date_from: dateFrom,
        p_date_to: dateTo,
      } as Record<string, unknown>);
      if (error) throw error;
      return (data ?? []) as TeamLeaderboardEntry[];
    },
    enabled: !!teamId,
  });
}

export function useTeamMilestones(teamId: string | null) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['team-milestones', teamId],
    queryFn: async (): Promise<TeamMilestone[]> => {
      if (!teamId) return [];
      const { data, error } = await supabase.rpc('get_team_milestones' as string, { p_team_id: teamId } as Record<string, unknown>);
      if (error) throw error;
      return (data ?? []) as TeamMilestone[];
    },
    enabled: !!teamId,
  });
}

export function useCreateTeam() {
  const { user } = useAuth();
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, activitySlugs }: { name: string; activitySlugs: string[] }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase.rpc('create_team' as string, {
        p_name: name,
        p_user_id: user.id,
        p_activity_slugs: activitySlugs,
      } as Record<string, unknown>);
      if (error) throw error;
      return data as { team_id: string; invite_code: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-teams'] });
    },
  });
}

export function useJoinTeam() {
  const { user } = useAuth();
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inviteCode: string) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase.rpc('join_team_by_code' as string, {
        p_user_id: user.id,
        p_invite_code: inviteCode.trim().toUpperCase(),
      } as Record<string, unknown>);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-teams'] });
    },
  });
}

export function useSendTeamMessage() {
  const { user } = useAuth();
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teamId, content, replyTo, imageUrl }: {
      teamId: string;
      content: string;
      replyTo?: string;
      imageUrl?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.rpc('send_team_message' as string, {
        p_team_id: teamId,
        p_user_id: user.id,
        p_content: content,
        p_reply_to: replyTo ?? null,
        p_image_url: imageUrl ?? null,
      } as Record<string, unknown>);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['team-messages', vars.teamId] });
    },
  });
}

export function useReactToMessage() {
  const { user } = useAuth();
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, teamId, emoji }: { messageId: string; teamId: string; emoji: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.rpc('toggle_message_reaction' as string, {
        p_message_id: messageId,
        p_user_id: user.id,
        p_emoji: emoji,
      } as Record<string, unknown>);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['team-messages', vars.teamId] });
    },
  });
}
