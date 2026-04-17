'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/providers/auth-provider';

export function ConnectionGuard() {
  const { isSessionRefreshing, isStale, softReconnect } = useAuth();
  const [reconnecting, setReconnecting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!isStale) setRetryCount(0);
  }, [isStale]);

  const handleReconnect = async () => {
    setReconnecting(true);
    const success = await softReconnect();
    setReconnecting(false);
    if (!success) setRetryCount((c) => c + 1);
  };

  const showOverlay = isSessionRefreshing || isStale;

  return (
    <AnimatePresence>
      {showOverlay && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-dark-bg/80 backdrop-blur-sm"
        >
          {isSessionRefreshing ? (
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
                The app lost sync while in the background.
              </p>

              {reconnecting ? (
                <div className="flex flex-col items-center gap-3 py-1">
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-dark-muted">Reconnecting…</p>
                </div>
              ) : retryCount >= 2 ? (
                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-3 rounded-2xl bg-emerald-500 text-black text-xs font-black tracking-widest uppercase"
                  >
                    TAP TO RELOAD
                  </button>
                  <p className="text-[10px] text-dark-muted">
                    Could not reconnect. A full reload is needed.
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleReconnect}
                  className="px-6 py-3 rounded-2xl bg-emerald-500 text-black text-xs font-black tracking-widest uppercase"
                >
                  TAP TO RECONNECT
                </button>
              )}
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
