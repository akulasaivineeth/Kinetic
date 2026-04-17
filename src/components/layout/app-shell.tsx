import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { Header } from './header';
import { BottomNav } from './bottom-nav';
import { PullToRefresh } from '@/components/pull-to-refresh';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeToPush } from '@/lib/push';
import { useAuth } from '@/providers/auth-provider';
import { useQueryClient } from '@tanstack/react-query';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { softReconnect } = useAuth();
  const queryClient = useQueryClient();
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);

  const handleRefresh = useCallback(async () => {
    const success = await softReconnect();
    if (!success) queryClient.invalidateQueries();
  }, [softReconnect, queryClient]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      const timer = setTimeout(() => setShowNotificationPrompt(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const requestPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        await subscribeToPush();
      }
    } catch (error) {
      console.error('Notification permission request failed:', error);
    }
    setShowNotificationPrompt(false);
  };

  return (
    <div className="min-h-dvh bg-dark-bg flex flex-col max-w-lg mx-auto relative overflow-hidden">
      <Header />
      <PullToRefresh onRefresh={handleRefresh} className="flex-1 px-5 pb-24 overflow-y-auto overflow-x-hidden">
        {children}
      </PullToRefresh>
      <BottomNav />

      {/* Notification Prompt */}
      <AnimatePresence>
        {showNotificationPrompt && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 left-5 right-5 z-50"
          >
            <div className="p-4 rounded-2xl bg-dark-elevated border border-emerald-500/30 glass-card-elevated flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-xs font-black text-dark-text">ENABLE NOTIFICATIONS</p>
                <p className="text-[10px] text-dark-muted mt-0.5">Stay updated with live arena scores and Whoop workouts.</p>
              </div>
              <button 
                onClick={requestPermission}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-black text-[10px] font-black tracking-widest uppercase hover:bg-emerald-400 transition-colors"
              >
                ENABLE
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
