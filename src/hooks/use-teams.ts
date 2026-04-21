'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { endOfWeek, startOfWeek } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import type { TeamCrestPick } from '@/lib/squad-crest-codec';
import { useAuth } from '@/providers/auth-provider';
import type { UserTeam, TeamDetails, TeamMessage, TeamLeaderboardEntry, TeamMilestone } from '@/types/database';

export type GlobalSquadRow = Pick<
  UserTeam,
  'team_id' | 'team_name' | 'invite_code' | 'avatar_url' | 'member_count' | 'team_score'
>;

function thisWeekBounds() {
  const now = new Date();
  return {
    from: startOfWeek(now, { weekStartsOn: 1 }).toISOString(),
    to: endOfWeek(now, { weekStartsOn: 1 }).toISOString(),
  };
}

/** Sum of members' session_score in the current ISO week (Mon–Sun, local). */
async function fetchTeamsWeeklyAggregates(
  supabase: ReturnType<typeof createClient>,
  teamIds: string[],
): Promise<Map<string, { score: number; memberCount: number }>> {
  const out = new Map<string, { score: number; memberCount: number }>();
  if (!teamIds.length) return out;

  const { data: mems, error: memErr } = await supabase
    .from('team_members')
    .select('team_id, user_id')
    .in('team_id', teamIds);
  if (memErr) throw memErr;

  for (const tid of teamIds) {
    out.set(tid, { score: 0, memberCount: 0 });
  }
  for (const m of mems ?? []) {
    const cur = out.get(m.team_id);
    if (cur) cur.memberCount += 1;
  }

  const userIds = [...new Set((mems ?? []).map((m) => m.user_id))];
  if (!userIds.length) return out;

  const { from, to } = thisWeekBounds();
  const { data: logs, error: logErr } = await supabase
    .from('workout_logs')
    .select('user_id, session_score')
    .in('user_id', userIds)
    .not('submitted_at', 'is', null)
    .gte('logged_at', from)
    .lte('logged_at', to);
  if (logErr) throw logErr;

  const userScore = new Map<string, number>();
  for (const l of logs ?? []) {
    userScore.set(l.user_id, (userScore.get(l.user_id) ?? 0) + (l.session_score || 0));
  }

  const teamUsers = new Map<string, string[]>();
  for (const m of mems ?? []) {
    const arr = teamUsers.get(m.team_id) ?? [];
    arr.push(m.user_id);
    teamUsers.set(m.team_id, arr);
  }

  for (const tid of teamIds) {
    let score = 0;
    for (const uid of teamUsers.get(tid) ?? []) {
      score += userScore.get(uid) ?? 0;
    }
    const cur = out.get(tid);
    if (cur) cur.score = score;
  }
  return out;
}

export function useUserTeams() {
  const { user } = useAuth();
  const supabase = createClient();

  return useQuery({
    queryKey: ['user-teams', user?.id],
    queryFn: async (): Promise<UserTeam[]> => {
      if (!user) return [];

      const { data: memberships, error: memErr } = await supabase
        .from('team_members')
        .select('team_id, role')
        .eq('user_id', user.id);
      if (memErr) {
        console.error('[useUserTeams] team_members query:', memErr.message, memErr.code);
        throw memErr;
      }
      if (!memberships?.length) return [];

      const teamIds = memberships.map((m) => m.team_id);
      const { data: teams, error: teamErr } = await supabase
        .from('teams')
        .select('*')
        .in('id', teamIds);
      if (teamErr) throw teamErr;

      const weekly = await fetchTeamsWeeklyAggregates(supabase, teamIds);

      const results: UserTeam[] = [];
      for (const team of teams ?? []) {
        const mem = memberships.find((m) => m.team_id === team.id);
        const agg = weekly.get(team.id);

        const { data: acts } = await supabase
          .from('team_activities')
          .select('activity_type_id, activity_types:activity_type_id(slug)')
          .eq('team_id', team.id);

        const activity_slugs = (acts ?? [])
          .map((a: Record<string, unknown>) => {
            const at = a.activity_types as Record<string, unknown> | null;
            return typeof at?.slug === 'string' ? at.slug : '';
          })
          .filter(Boolean);

        results.push({
          team_id: team.id,
          team_name: team.name,
          invite_code: team.invite_code,
          avatar_url: team.avatar_url,
          member_count: agg?.memberCount ?? 0,
          user_role: mem?.role ?? 'member',
          activity_slugs,
          team_score: agg?.score ?? 0,
        });
      }
      return results.sort((a, b) => b.team_score - a.team_score);
    },
    enabled: !!user,
    retry: 2,
    retryDelay: 800,
  });
}

export function useGlobalSquadsThisWeek(limit = 48) {
  const { user } = useAuth();
  const supabase = createClient();

  return useQuery({
    queryKey: ['global-squads-week', user?.id, limit],
    queryFn: async (): Promise<GlobalSquadRow[]> => {
      if (!user) return [];

      const { data: teams, error } = await supabase
        .from('teams')
        .select('id, name, invite_code, avatar_url')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;

      const ids = (teams ?? []).map((t) => t.id);
      if (!ids.length) return [];

      const weekly = await fetchTeamsWeeklyAggregates(supabase, ids);

      return (teams ?? [])
        .map((t) => {
          const agg = weekly.get(t.id);
          return {
            team_id: t.id,
            team_name: t.name,
            invite_code: t.invite_code,
            avatar_url: t.avatar_url,
            member_count: agg?.memberCount ?? 0,
            team_score: agg?.score ?? 0,
          };
        })
        .sort((a, b) => b.team_score - a.team_score);
    },
    enabled: !!user,
  });
}

export function useTeamDetails(teamId: string | null) {
  const { user } = useAuth();
  const supabase = createClient();

  return useQuery({
    queryKey: ['team-details', teamId, user?.id],
    queryFn: async (): Promise<TeamDetails | null> => {
      if (!teamId || !user) return null;

      const { data: team, error } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();
      if (error) {
        console.error('[useTeamDetails] teams query failed:', error.message, error.code);
        throw error;
      }

      const { data: members } = await supabase
        .from('team_members')
        .select('user_id, role, joined_at, profiles:user_id(full_name, avatar_url)')
        .eq('team_id', teamId);

      const { data: acts } = await supabase
        .from('team_activities')
        .select('activity_type_id, activity_types:activity_type_id(slug, name, unit, emoji)')
        .eq('team_id', teamId);

      return {
        ...team,
        members: (members ?? []).map((m: Record<string, unknown>) => ({
          user_id: m.user_id as string,
          full_name: (m.profiles as Record<string, unknown>)?.full_name as string ?? '',
          avatar_url: (m.profiles as Record<string, unknown>)?.avatar_url as string | null,
          role: m.role as 'owner' | 'admin' | 'member',
          joined_at: m.joined_at as string,
        })),
        activities: (acts ?? []).map((a: Record<string, unknown>) => {
          const at = a.activity_types as Record<string, unknown> | null;
          return {
            id: a.activity_type_id as number,
            slug: (at?.slug ?? '') as string,
            name: (at?.name ?? '') as string,
            unit: (at?.unit ?? '') as string,
            emoji: (at?.emoji ?? '') as string,
          };
        }),
      } as TeamDetails;
    },
    enabled: !!teamId && !!user,
    retry: 2,
    retryDelay: 1000,
  });
}


export function useTeamMessages(teamId: string | null) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['team-messages', teamId],
    queryFn: async (): Promise<TeamMessage[]> => {
      if (!teamId) return [];
      const { data, error } = await supabase
        .from('team_messages')
        .select('*, profiles:user_id(full_name, avatar_url)')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;

      const chronological = [...(data ?? [])].reverse();

      return chronological.map((m: Record<string, unknown>) => ({
        id: m.id as string,
        user_id: m.user_id as string,
        full_name: (m.profiles as Record<string, unknown>)?.full_name as string ?? '',
        avatar_url: (m.profiles as Record<string, unknown>)?.avatar_url as string | null,
        content: m.content as string,
        created_at: m.created_at as string,
        reply_to: m.reply_to as string | null,
        reply_content: null,
        reply_user_name: null,
        reactions: [],
        image_url: m.image_url as string | null,
      })) as TeamMessage[];
    },
    enabled: !!teamId,
    refetchInterval: 25_000,
  });
}

export function useTeamLeaderboard(teamId: string | null, dateFrom?: string, dateTo?: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['team-leaderboard', teamId, dateFrom, dateTo],
    queryFn: async (): Promise<TeamLeaderboardEntry[]> => {
      if (!teamId) return [];

      const { data: members } = await supabase
        .from('team_members')
        .select('user_id, profiles:user_id(full_name, avatar_url)')
        .eq('team_id', teamId);
      if (!members?.length) return [];

      const userIds = members.map((m) => (m as Record<string, unknown>).user_id as string);
      let query = supabase
        .from('workout_logs')
        .select('user_id, pushup_reps, plank_seconds, run_distance, squat_reps, session_score')
        .in('user_id', userIds)
        .not('submitted_at', 'is', null);
      if (dateFrom) query = query.gte('logged_at', dateFrom);
      if (dateTo) query = query.lte('logged_at', dateTo);

      const { data: logs } = await query;

      type Agg = {
        total_score: number;
        pushups: number;
        plank_seconds: number;
        run_distance: number;
        squats: number;
      };
      const map = new Map<string, Agg>();
      for (const log of logs ?? []) {
        const cur = map.get(log.user_id) ?? {
          total_score: 0,
          pushups: 0,
          plank_seconds: 0,
          run_distance: 0,
          squats: 0,
        };
        cur.total_score += log.session_score || 0;
        cur.pushups += log.pushup_reps || 0;
        cur.plank_seconds += log.plank_seconds || 0;
        cur.run_distance += Number(log.run_distance) || 0;
        cur.squats += log.squat_reps || 0;
        map.set(log.user_id, cur);
      }

      return members.map((m) => {
        const mr = m as Record<string, unknown>;
        const uid = mr.user_id as string;
        const prof = mr.profiles as Record<string, unknown> | null;
        const stats = map.get(uid) ?? {
          total_score: 0,
          pushups: 0,
          plank_seconds: 0,
          run_distance: 0,
          squats: 0,
        };
        return {
          user_id: uid,
          full_name: (prof?.full_name as string) ?? '',
          avatar_url: (prof?.avatar_url as string) ?? '',
          activity_breakdown: {
            pushups: { value: stats.pushups, score: 0 },
            plank: { value: stats.plank_seconds, score: 0 },
            run: { value: stats.run_distance, score: 0 },
            squats: { value: stats.squats, score: 0 },
          },
          total_score: stats.total_score,
          streak: 0,
        } as TeamLeaderboardEntry;
      }).sort((a, b) => b.total_score - a.total_score);
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

      const { data: members } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', teamId);
      if (!members?.length) return [];

      const userIds = members.map((m) => m.user_id);
      const { data, error } = await supabase
        .from('user_milestone_unlocks')
        .select('*, profiles:user_id(full_name, avatar_url)')
        .in('user_id', userIds)
        .order('earned_at', { ascending: false })
        .limit(20);
      if (error) throw error;

      return (data ?? []).map((m: Record<string, unknown>) => ({
        user_id: m.user_id as string,
        full_name: (m.profiles as Record<string, unknown>)?.full_name as string ?? '',
        avatar_url: (m.profiles as Record<string, unknown>)?.avatar_url as string | null,
        milestone_key: m.milestone_key as string,
        label: m.label as string,
        emoji: m.emoji as string,
        earned_at: m.earned_at as string,
      })) as TeamMilestone[];
    },
    enabled: !!teamId,
  });
}

export function useCreateTeam() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      activitySlugs,
      crest,
    }: {
      name: string;
      activitySlugs: string[];
      crest?: TeamCrestPick;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ name, activitySlugs, crest }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        team_id?: string;
        invite_code?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || 'Could not create squad');
      }

      if (!data.team_id || !data.invite_code) {
        throw new Error('Invalid response from server');
      }

      return { team_id: data.team_id, invite_code: data.invite_code };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-teams'] });
      queryClient.invalidateQueries({ queryKey: ['global-squads-week'] });
      queryClient.invalidateQueries({ queryKey: ['team-details', data.team_id] });
    },
  });
}

export function useJoinTeam() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inviteCode: string) => {
      if (!user) throw new Error('Not authenticated');

      // Use server API route — service role bypasses RLS for invite_code lookup
      const res = await fetch('/api/teams/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ invite_code: inviteCode.trim() }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        team_id?: string;
        team_name?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || 'Could not join squad');
      }

      if (!data.team_id) {
        throw new Error('Invalid response from server');
      }

      return { team_id: data.team_id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-teams'] });
      queryClient.invalidateQueries({ queryKey: ['global-squads-week'] });
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
      const { error } = await supabase
        .from('team_messages')
        .insert({
          team_id: teamId,
          user_id: user.id,
          content,
          reply_to: replyTo ?? null,
          image_url: imageUrl ?? null,
        });
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
