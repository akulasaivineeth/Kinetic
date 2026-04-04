'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="min-h-dvh bg-dark-bg flex flex-col items-center justify-center px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-sm"
      >
        <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 mx-auto flex items-center justify-center mb-8">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#F87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <h1 className="text-3xl font-black tracking-tight text-dark-text mb-4">
          ACCESS RESTRICTED
        </h1>
        
        <p className="text-dark-muted text-sm leading-relaxed mb-10">
          Kinetic is currently a private arena. You need an invite link from an existing member to join the performance track.
        </p>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push('/')}
          className="w-full py-4 rounded-2xl bg-white text-black font-bold text-sm tracking-widest uppercase transition-all hover:bg-gray-100"
        >
          RETURN TO LANDING
        </motion.button>

        <p className="text-dark-muted/30 text-[10px] mt-12 tracking-[0.3em] uppercase">
          KINETIC SECURITY PROTOCOL
        </p>
      </motion.div>
    </div>
  );
}
