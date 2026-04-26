'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, ChevronRight, Swords } from 'lucide-react';
import { KCrest, KDisplay, KEyebrow } from '@/components/ui/k-primitives';
import type { KCrestShape, KCrestEmblem } from '@/lib/crest-constants';

interface SquadCreatedIntroProps {
  squadName: string;
  inviteCode: string;
  crestShape: KCrestShape;
  crestEmblem: KCrestEmblem;
  crestColor: string;
  mode: 'created' | 'joined';
  lineupLocked?: boolean;
  onDismiss: () => void;
}

const SPRING = { type: 'spring', damping: 30, stiffness: 340 } as const;
const SPRING_LOOSE = { type: 'spring', damping: 22, stiffness: 280 } as const;

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
};

export function SquadCreatedIntro({
  squadName,
  inviteCode,
  crestShape,
  crestEmblem,
  crestColor,
  mode,
  lineupLocked = false,
  onDismiss,
}: SquadCreatedIntroProps) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    void navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const ctaLabel = lineupLocked
    ? 'View Squad'
    : mode === 'created'
      ? 'Pick Your Battles'
      : 'Cast Your Vote';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      className="fixed inset-0 z-[60] flex items-end"
      style={{ background: 'rgba(7,11,8,0.80)' }}
    >
      {/* Tap backdrop to dismiss */}
      <div className="absolute inset-0" onClick={onDismiss} aria-hidden />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '110%' }}
        transition={{ ...SPRING, delay: 0.04 }}
        className="relative w-full bg-k-card overflow-hidden"
        style={{
          borderRadius: '28px 28px 0 0',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 28px)',
        }}
      >
        {/* Top accent bar */}
        <div
          className="absolute top-0 left-0 right-0 h-0.5 opacity-60"
          style={{ background: `linear-gradient(90deg, transparent, ${crestColor}, transparent)` }}
        />

        {/* Handle */}
        <div className="flex justify-center pt-3.5 pb-1">
          <div className="w-9 h-1 rounded-full bg-k-line-strong opacity-40" />
        </div>

        <div className="px-6 pt-2 pb-4">
          {/* Crest with floating + glow */}
          <motion.div
            initial={{ scale: 0.45, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ ...SPRING_LOOSE, delay: 0.14 }}
            className="flex justify-center mt-5 mb-7"
          >
            <div className="relative flex items-center justify-center">
              {/* Outer pulse ring */}
              <motion.div
                className="absolute rounded-full"
                style={{ width: 120, height: 120, background: crestColor, opacity: 0.18, filter: 'blur(14px)' }}
                animate={{ scale: [1, 1.3, 1], opacity: [0.18, 0.06, 0.18] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />
              {/* Subtle float */}
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <KCrest shape={crestShape} emblem={crestEmblem} color={crestColor} size={100} glow />
              </motion.div>
            </div>
          </motion.div>

          {/* Text */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            transition={{ delay: 0.26, duration: 0.38, ease: [0.2, 0.8, 0.2, 1] }}
            className="text-center mb-1"
          >
            <KEyebrow className="!tracking-[0.22em] mb-2">
              {mode === 'created' ? 'Squad is live' : 'You\'re in'}
            </KEyebrow>
            <KDisplay size={32} className="text-k-ink">
              {squadName}
            </KDisplay>
          </motion.div>

          {/* Invite code — only for creator */}
          {mode === 'created' && (
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              transition={{ delay: 0.36, duration: 0.38, ease: [0.2, 0.8, 0.2, 1] }}
              className="mt-6 mb-2"
            >
              <p className="text-[11px] font-semibold uppercase tracking-widest text-k-muted-soft text-center mb-3">
                Share with your crew
              </p>
              <button
                type="button"
                onClick={copy}
                className="w-full flex items-center justify-between px-5 py-4 rounded-k-lg bg-k-bg border border-k-line-strong active:scale-[0.98] transition-transform"
              >
                <span className="font-k-mono font-black text-[22px] tracking-[0.36em] text-k-ink">
                  {inviteCode}
                </span>
                <span
                  className="w-10 h-10 flex items-center justify-center rounded-full transition-all"
                  style={{ background: copied ? `${crestColor}20` : 'var(--k-bg)' }}
                >
                  {copied ? (
                    <Check size={18} strokeWidth={2.5} style={{ color: crestColor }} />
                  ) : (
                    <Copy size={17} strokeWidth={2} className="text-k-muted-soft" />
                  )}
                </span>
              </button>
              {copied && (
                <motion.p
                  initial={{ opacity: 0, y: -3 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[11px] font-semibold text-center mt-2"
                  style={{ color: crestColor }}
                >
                  Copied to clipboard
                </motion.p>
              )}
            </motion.div>
          )}

          {/* Joined sub-copy */}
          {mode === 'joined' && (
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              transition={{ delay: 0.36, duration: 0.38, ease: [0.2, 0.8, 0.2, 1] }}
              className="mt-5 mb-2"
            >
              <p className="text-[13px] text-k-muted-soft text-center leading-relaxed max-w-[280px] mx-auto">
                {lineupLocked
                  ? 'The lineup is locked. Head to the arena.'
                  : 'Your squad is picking their lineup. Cast your vote for the moves you want to compete in.'}
              </p>
            </motion.div>
          )}

          {/* CTA */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            transition={{ delay: 0.46, duration: 0.38, ease: [0.2, 0.8, 0.2, 1] }}
            className="mt-6"
          >
            <motion.button
              type="button"
              onClick={onDismiss}
              whileTap={{ scale: 0.97 }}
              className="w-full flex items-center justify-center gap-2.5 py-4 rounded-k-pill text-white text-[13px] font-black tracking-[0.12em] uppercase shadow-k-fab"
              style={{ background: `linear-gradient(135deg, ${crestColor}, #10B981)` }}
            >
              <Swords size={16} strokeWidth={2.2} />
              {ctaLabel}
              <ChevronRight size={16} strokeWidth={2.5} />
            </motion.button>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
