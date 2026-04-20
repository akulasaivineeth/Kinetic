'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';

type TypingPeer = { userId: string; name: string };

/**
 * Live refresh for team_messages + lightweight “who’s typing” via broadcast (same channel name for all members).
 */
export function useSquadChatRealtime(teamId: string | null, enabled: boolean) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const [typingPeers, setTypingPeers] = useState<TypingPeer[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const typingSendDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!teamId || !enabled) return;

    const ch = supabase
      .channel(`squad-chat-${teamId}`, { config: { broadcast: { self: false } } })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'team_messages',
          filter: `team_id=eq.${teamId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['team-messages', teamId] });
        },
      )
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const p = payload as { user_id?: string; name?: string };
        const uid = p.user_id;
        if (!uid || uid === user?.id) return;
        const name = (p.name || 'Teammate').trim() || 'Teammate';
        setTypingPeers((prev) => {
          const rest = prev.filter((t) => t.userId !== uid);
          return [...rest, { userId: uid, name }];
        });
        const old = typingTimers.current.get(uid);
        if (old) clearTimeout(old);
        const t = setTimeout(() => {
          setTypingPeers((prev) => prev.filter((x) => x.userId !== uid));
          typingTimers.current.delete(uid);
        }, 2600);
        typingTimers.current.set(uid, t);
      })
      .subscribe();

    channelRef.current = ch;

    return () => {
      if (typingSendDebounce.current) clearTimeout(typingSendDebounce.current);
      typingSendDebounce.current = null;
      typingTimers.current.forEach(clearTimeout);
      typingTimers.current.clear();
      void supabase.removeChannel(ch);
      channelRef.current = null;
      setTypingPeers([]);
    };
  }, [teamId, enabled, user?.id, supabase, queryClient]);

  const broadcastTyping = useCallback(() => {
    if (!teamId || !user) return;
    if (typingSendDebounce.current) return;
    const ch = channelRef.current;
    if (!ch) return;
    void ch.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        user_id: user.id,
        name: profile?.full_name || 'Member',
      },
    });
    typingSendDebounce.current = setTimeout(() => {
      typingSendDebounce.current = null;
    }, 500);
  }, [teamId, user, profile?.full_name]);

  const typingLabel =
    typingPeers.length === 0
      ? ''
      : typingPeers.length === 1
        ? `${typingPeers[0].name} is typing…`
        : `${typingPeers.map((t) => t.name).join(', ')} are typing…`;

  return { typingLabel, broadcastTyping };
}
