'use client';

import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { registerServiceWorker } from '@/lib/offline';
import { subscribeToPush } from '@/lib/push';
import { useAuth } from '@/providers/auth-provider';

export function PWAInit() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    registerServiceWorker();
  }, []);

  // Listen for push data updates from Service Worker — the "Instagram fix"
  // When a push arrives while the app is open, SW postMessages us so we refetch immediately
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PUSH_DATA_UPDATE') {
        queryClient.invalidateQueries();
        window.dispatchEvent(new CustomEvent('kinetic-reconnect'));
      }
    };
    navigator.serviceWorker.addEventListener('message', handleSWMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleSWMessage);
  }, [queryClient]);

  // Ensure push subscription is registered (and re-registered after SW updates).
  const ensurePushSubscription = useCallback(async () => {
    if (!user) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    // subscribeToPush is idempotent — checks existing subscription first.
    await subscribeToPush();
  }, [user]);

  // On mount + whenever user changes
  useEffect(() => {
    ensurePushSubscription();
  }, [ensurePushSubscription]);

  // Re-subscribe on visibility change (handles SW updates, token expiry, re-registration).
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        ensurePushSubscription();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [ensurePushSubscription]);

  // Re-subscribe when a new SW takes over (cache bump, deploy, etc.)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handleControllerChange = () => {
      ensurePushSubscription();
    };
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    return () => navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
  }, [ensurePushSubscription]);

  return null;
}
