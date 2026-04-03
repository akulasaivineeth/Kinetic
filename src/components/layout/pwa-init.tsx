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
    if (user) {
      // Subscribe to push after login
      subscribeToPush();
    }
  }, [user]);

  return null;
}
