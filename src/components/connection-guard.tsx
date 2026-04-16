'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/providers/auth-provider';

/**
 * ConnectionGuard — shows a translucent "Reconnecting…" overlay when the
 * session refresh is in progress after waking from background.  If it takes
 * longer than 5 seconds, a "Tap to reload" fallback appears.
 */
export function ConnectionGuard() {
  const { isSessionRefreshing } = useAuth();
  const [showReload, setShowReload] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isSessionRefreshing) {
      setShowReload(false);
      timerRef.current = setTimeout(() => setShowReload(true), 5000);
    } else {
      setShowReload(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isSessionRefreshing]);

  return (
    <AnimatePresence>
      {isSessionRefreshing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-dark-bg/80 backdrop-blur-sm"
        >
          {!showReload ? (
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-bold text-dark-text tracking-wide">
                Reconnecting…
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-4"
            >
              <p className="text-dark-text font-black text-lg tracking-tight">
                Connection lost
              </p>
              <p className="text-dark-muted text-sm text-center max-w-[240px]">
                The app couldn't reconnect after waking up.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 rounded-2xl bg-emerald-500 text-black text-xs font-black tracking-widest uppercase"
              >
                TAP TO RELOAD
              </button>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
