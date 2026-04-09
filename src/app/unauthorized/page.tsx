'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';

export default function UnauthorizedPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-dvh bg-dark-bg flex flex-col items-center justify-center px-8 relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', blur: 30, duration: 0.8 }}
        className="text-center max-w-sm z-10"
      >
        <div className="relative mx-auto mb-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-dark-elevated to-dark-bg border border-white/5 shadow-2xl flex items-center justify-center mx-auto relative z-10"
          >
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#F87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </motion.div>
          <div className="absolute inset-0 bg-red-500/20 rounded-full blur-[40px] animate-pulse" />
        </div>

        <h1 className="text-4xl font-black tracking-tighter text-dark-text mb-6">
          ACCESS <span className="text-red-500">RESTRICTED</span>
        </h1>
        
        <div className="space-y-4 mb-12">
          <p className="text-dark-text font-bold text-sm tracking-wide">
            PRIVATE PERFORMANCE ARENA
          </p>
          <p className="text-dark-muted text-[13px] leading-relaxed">
            Kinetic is currently an invite-only track for elite performance tracking. You need a verified invite link from an active member to initialize your profile.
          </p>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push('/')}
          className="w-full py-4.5 rounded-2xl bg-white text-black font-black text-sm tracking-[0.2em] uppercase transition-all shadow-[0_10px_30px_rgba(255,255,255,0.1)]"
        >
          RETURN TO BASE
        </motion.button>

        {user && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={async () => {
              await signOut();
              router.push('/');
            }}
            className="w-full mt-3 py-3 rounded-2xl border border-dark-border text-dark-muted font-bold text-xs tracking-wider uppercase"
          >
            Sign out and try again
          </motion.button>
        )}

        <div className="flex flex-col items-center mt-12 space-y-2 opacity-30">
          <div className="w-1 h-1 rounded-full bg-red-500" />
          <p className="text-dark-muted text-[9px] tracking-[0.4em] uppercase font-bold">
            SECURITY PROTOCOL K-01
          </p>
        </div>
      </motion.div>
    </div>
  );
}
