'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

/**
 * When any squad member logs a workout, refresh this team’s weekly leaderboard + hub aggregates.
 * Filter is client-side so we don’t rely on Realtime RLS filter syntax for `in (...)`.
 */
export function useTeamScoresRealtime(teamId: string | null, memberUserIds: string[], enabled: boolean) {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const memberSet = useRef(new Set<string>());
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    memberSet.current = new Set(memberUserIds);
  }, [memberUserIds]);

  useEffect(() => {
    if (!teamId || !enabled || memberUserIds.length === 0) return;

    const bump = () => {
      if (debounce.current) clearTimeout(debounce.current);
      debounce.current = setTimeout(() => {
        debounce.current = null;
        void queryClient.invalidateQueries({ queryKey: ['team-leaderboard', teamId] });
        void queryClient.invalidateQueries({ queryKey: ['user-teams'] });
      }, 400);
    };

    const ch = supabase
      .channel(`team-scores-${teamId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'workout_logs' },
        (payload) => {
          const row = payload.new as { user_id?: string } | null;
          const uid = row?.user_id;
          if (uid && memberSet.current.has(uid)) bump();
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'workout_logs' },
        (payload) => {
          const row = (payload.new as { user_id?: string } | null) ?? (payload.old as { user_id?: string } | null);
          const uid = row?.user_id;
          if (uid && memberSet.current.has(uid)) bump();
        },
      )
      .subscribe();

    return () => {
      if (debounce.current) clearTimeout(debounce.current);
      void supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, enabled, memberUserIds, queryClient]);
}
