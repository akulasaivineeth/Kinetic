'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/providers/auth-provider';

export function ConnectionGuard() {
  const { isSessionRefreshing, isStale, softReconnect } = useAuth();
  const [retrying, setRetrying] = useState(false);

  const handleReconnect = useCallback(async () => {
    setRetrying(true);
    const ok = await softReconnect();
    setRetrying(false);
    if (!ok) {
      window.location.reload();
    }
  }, [softReconnect]);

  return (
    <>
      {/* Non-blocking: wake-from-background session refresh must not freeze the whole app */}
      {isSessionRefreshing && (
        <div className="fixed top-0 left-0 right-0 z-[90] pointer-events-none flex justify-center pt-[env(safe-area-inset-top,0px)]">
          <div className="mt-2 flex items-center gap-2 rounded-full border border-white/10 bg-dark-bg/85 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-dark-text shadow-lg backdrop-blur-md">
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            Reconnecting…
          </div>
        </div>
      )}

      <AnimatePresence>
        {isStale && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-dark-bg/80 backdrop-blur-sm"
          >
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
              <button
                type="button"
                onClick={handleReconnect}
                disabled={retrying}
                className="px-6 py-3 rounded-2xl bg-emerald-500 text-black text-xs font-black tracking-widest uppercase disabled:opacity-60"
              >
                {retrying ? 'RETRYING…' : 'TAP TO RECONNECT'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

