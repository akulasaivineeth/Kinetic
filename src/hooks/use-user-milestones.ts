'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';

export type UserMilestoneUnlockRow = {
  id: string;
  user_id: string;
  milestone_key: string;
  label: string;
  emoji: string;
  earned_at: string;
};

export function useUserMilestoneUnlocks(limit = 40) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const supabase = createClient();

  useEffect(() => {
    if (!user) return;
    const channelId = `user-milestones-${user.id}-${Math.random().toString(36).slice(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_milestone_unlocks',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['user-milestone-unlocks', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, supabase]);

  return useQuery({
    queryKey: ['user-milestone-unlocks', user?.id, limit],
    queryFn: async (): Promise<UserMilestoneUnlockRow[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_milestone_unlocks')
        .select('id, user_id, milestone_key, label, emoji, earned_at')
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as UserMilestoneUnlockRow[];
    },
    enabled: !!user,
  });
}
