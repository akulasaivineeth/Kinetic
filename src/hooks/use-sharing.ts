'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';

export function useSharingConnections() {
  const { user } = useAuth();
  const supabase = createClient();

  return useQuery({
    queryKey: ['sharing-connections', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('sharing_connections')
        .select(`
          *,
          requester:profiles!sharing_connections_requester_id_fkey(id, full_name, avatar_url, email),
          recipient:profiles!sharing_connections_recipient_id_fkey(id, full_name, avatar_url, email)
        `)
        .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}

export function useSendSharingRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (recipientEmail: string) => {
      if (!user) throw new Error('Not authenticated');

      // Find recipient by email
      const { data: recipient, error: findError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', recipientEmail)
        .single();
      if (findError || !recipient) throw new Error('User not found');

      const { data, error } = await supabase
        .from('sharing_connections')
        .insert({ requester_id: user.id, recipient_id: recipient.id })
        .select()
        .single();
      if (error) throw error;

      // Create notification for recipient
      await supabase.from('notifications').insert({
        user_id: recipient.id,
        type: 'sharing_request',
        title: 'New Sharing Request',
        body: `${user.user_metadata?.full_name || user.email} wants to share activity data with you.`,
        data: { connection_id: data.id, requester_id: user.id },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharing-connections'] });
    },
  });
}

export function useRespondToSharing() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({
      connectionId,
      action,
    }: {
      connectionId: string;
      action: 'accept' | 'accept_mutual' | 'reject';
    }) => {
      const update: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (action === 'reject') {
        update.status = 'rejected';
      } else {
        update.status = 'accepted';
        update.is_mutual = action === 'accept_mutual';
      }

      const { data, error } = await supabase
        .from('sharing_connections')
        .update(update)
        .eq('id', connectionId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharing-connections'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    },
  });
}

export function useRemoveSharing() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await supabase
        .from('sharing_connections')
        .delete()
        .eq('id', connectionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharing-connections'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    },
  });
}
