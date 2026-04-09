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

      const normalized = recipientEmail.trim();
      const { data: recipientId, error: findError } = await supabase.rpc(
        'lookup_profile_id_for_sharing',
        { search_email: normalized }
      );
      if (findError) throw new Error(findError.message || 'Lookup failed');
      if (!recipientId) throw new Error('No Kinetic account found for that email');

      if (recipientId === user.id) throw new Error('You cannot share with yourself');

      const { data, error } = await supabase
        .from('sharing_connections')
        .insert({ requester_id: user.id, recipient_id: recipientId })
        .select()
        .single();
      if (error) throw error;

      const { error: notifyError } = await supabase.from('notifications').insert({
        user_id: recipientId,
        type: 'sharing_request',
        title: 'New Sharing Request',
        body: `${user.user_metadata?.full_name || user.email} wants to share activity data with you.`,
        data: { connection_id: data.id, requester_id: user.id },
      });
      if (notifyError) throw new Error(notifyError.message || 'Could not notify recipient');

      // Invoke Email Edge Function (Premium Requirement: Email with 3 explicit buttons)
      try {
        await supabase.functions.invoke('sharing-notification', {
          body: {
            recipientEmail,
            requesterName: user.user_metadata?.full_name || user.email,
            inviteUrl: `${window.location.origin}/arena`, // deep-link back to arena
          },
        });
      } catch (e) {
        console.error('Email notify failed:', e);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharing-connections'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
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
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
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
