'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/offline';
import { subscribeToPush } from '@/lib/push';
import { useAuth } from '@/providers/auth-provider';

export function PWAInit() {
  const { user } = useAuth();

  useEffect(() => {
    registerServiceWorker();
  }, []);

  useEffect(() => {
    // Avoid prompting on mount; browser requires user gesture.
    // If already granted, we can safely sync subscription silently.
    if (user && 'Notification' in window && Notification.permission === 'granted') {
      subscribeToPush();
    }
  }, [user]);

  return null;
}
