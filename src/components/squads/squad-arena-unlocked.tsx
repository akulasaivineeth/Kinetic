'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ChevronRight } from 'lucide-react';

interface SquadArenaUnlockedProps {
  onDismiss: () => void;
}

type Phase = 'lock' | 'shake' | 'text' | 'cta';

function AnimatedLock({ phase }: { phase: Phase }) {
  const isOpen = phase !== 'lock';

  return (
    <svg width="88" height="88" viewBox="0 0 88 88" fill="none" aria-hidden>
      {/* Body */}
      <motion.rect
        x="16" y="40" width="56" height="38" rx="10"
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.25, type: 'spring', damping: 18, stiffness: 280 }}
        fill="#1FB37A"
      />
      {/* Keyhole circle */}
      <motion.circle
        cx="44" cy="57" r="6"
        fill="rgba(0,0,0,0.25)"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.7, type: 'spring', damping: 15 }}
      />
      {/* Shackle — morphs from closed to open */}
      <motion.path
        stroke="#1FB37A"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{
          pathLength: 1,
          d: isOpen
            ? 'M30 40 V28 C30 16 58 16 58 28'
            : 'M30 40 V28 C30 16 58 16 58 28 V40',
        }}
        transition={{
          pathLength: { delay: 0.1, duration: 0.55, ease: 'easeOut' },
          d: { delay: 0.6, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] },
        }}
      />
    </svg>
  );
}

export function SquadArenaUnlocked({ onDismiss }: SquadArenaUnlockedProps) {
  const [phase, setPhase] = useState<Phase>('lock');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('shake'), 700);
    const t2 = setTimeout(() => setPhase('text'), 1300);
    const t3 = setTimeout(() => setPhase('cta'), 2100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const arenaLetters = 'ARENA'.split('');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28 }}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: '#050A06' }}
    >
      {/* Background radial glow — expands on unlock */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{
          opacity: phase === 'lock' ? 0 : 0.7,
          scale: phase === 'lock' ? 0.6 : 1,
        }}
        transition={{ duration: 1.4, ease: 'easeOut' }}
        style={{
          background:
            'radial-gradient(ellipse 65% 50% at 50% 50%, rgba(31,179,122,0.22) 0%, transparent 70%)',
        }}
      />

      {/* Burst rings on unlock */}
      <AnimatePresence>
        {phase !== 'lock' && (
          <>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={`ring-${i}`}
                className="absolute rounded-full border border-emerald-500/30 pointer-events-none"
                initial={{ width: 80, height: 80, opacity: 0.6 }}
                animate={{ width: 280 + i * 120, height: 280 + i * 120, opacity: 0 }}
                transition={{ delay: i * 0.12, duration: 0.9, ease: 'easeOut' }}
                style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Lock icon */}
      <motion.div
        className="relative mb-12 flex items-center justify-center"
        animate={
          phase === 'shake'
            ? { rotate: [-6, 7, -5, 5, -3, 3, 0], y: [0, -6, 0] }
            : phase !== 'lock'
              ? { y: -6 }
              : {}
        }
        transition={{ duration: 0.55, ease: 'easeOut' }}
      >
        <AnimatedLock phase={phase} />
      </motion.div>

      {/* ARENA letters */}
      <div className="flex items-end gap-0.5 mb-3">
        {arenaLetters.map((letter, i) => (
          <motion.span
            key={i}
            className="font-display text-white"
            style={{ fontSize: 58, lineHeight: 1, letterSpacing: '-0.02em' }}
            initial={{ opacity: 0, y: 28, scale: 0.82 }}
            animate={
              phase === 'text' || phase === 'cta'
                ? { opacity: 1, y: 0, scale: 1 }
                : {}
            }
            transition={{
              delay: 0.06 * i,
              type: 'spring',
              damping: 20,
              stiffness: 320,
            }}
          >
            {letter}
          </motion.span>
        ))}
      </div>

      {/* UNLOCKED label */}
      <motion.p
        initial={{ opacity: 0, y: 10, letterSpacing: '0.1em' }}
        animate={
          phase === 'text' || phase === 'cta'
            ? { opacity: 1, y: 0, letterSpacing: '0.3em' }
            : {}
        }
        transition={{
          delay: 0.38,
          type: 'spring',
          damping: 28,
          stiffness: 260,
        }}
        className="text-[11px] font-black uppercase text-emerald-400"
        style={{ letterSpacing: '0.3em' }}
      >
        UNLOCKED
      </motion.p>

      {/* CTA block */}
      <motion.div
        className="absolute left-6 right-6"
        style={{ bottom: 'max(env(safe-area-inset-bottom, 0px), 40px)' }}
        initial={{ opacity: 0, y: 24 }}
        animate={phase === 'cta' ? { opacity: 1, y: 0 } : {}}
        transition={{ type: 'spring', damping: 26, stiffness: 290 }}
      >
        <p className="text-[13px] text-white/40 text-center mb-5 leading-relaxed">
          Your crew agreed on the lineup. Time to compete.
        </p>
        <motion.button
          type="button"
          onClick={onDismiss}
          whileTap={{ scale: 0.97 }}
          className="w-full flex items-center justify-center gap-2.5 py-4 rounded-k-pill bg-emerald-500 text-white text-[13px] font-black tracking-[0.12em] uppercase"
          style={{ boxShadow: '0 0 32px rgba(31,179,122,0.45)' }}
        >
          <Zap size={16} strokeWidth={2.5} />
          Enter Arena
          <ChevronRight size={16} strokeWidth={2.5} />
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
