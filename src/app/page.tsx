'use client';

import { motion } from 'framer-motion';
import { useAuth } from '@/providers/auth-provider';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function LandingPage() {
  const { signInWithGoogle, loading } = useAuth();
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get('invite') || undefined;
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle(inviteCode);
    } catch {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-dvh bg-dark-bg flex flex-col items-center justify-center px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="text-center"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
          className="mb-8"
        >
          <div className="w-20 h-20 rounded-2xl emerald-gradient emerald-glow mx-auto flex items-center justify-center mb-6">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <h1 className="text-4xl font-black tracking-tight italic text-dark-text">
            KINETIC
          </h1>
          <p className="text-dark-muted text-sm mt-2 font-medium">
            Performance Arena
          </p>
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-dark-muted text-base mb-10 max-w-xs mx-auto leading-relaxed"
        >
          Track your push-ups, planks, and runs.
          Compete with friends in the Arena.
        </motion.p>

        {inviteCode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35 }}
            className="mb-6 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
          >
            <p className="text-emerald-400 text-xs font-semibold tracking-wide">
              YOU&apos;VE BEEN INVITED
            </p>
          </motion.div>
        )}

        {/* Sign In Button */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleSignIn}
          disabled={loading || isSigningIn}
          className="w-full max-w-xs mx-auto flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-white text-black font-semibold text-sm transition-all duration-200 hover:bg-gray-100 disabled:opacity-50"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {isSigningIn ? 'Signing in...' : 'Continue with Google'}
        </motion.button>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-dark-muted/50 text-[10px] mt-8 tracking-wider"
        >
          KINETIC PWA v4.2.0 • BUILD 2026
        </motion.p>
      </motion.div>
    </div>
  );
}
