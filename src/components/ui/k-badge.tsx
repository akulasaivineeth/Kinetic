'use client';

import { motion } from 'framer-motion';
import { exerciseIcon } from '@/components/ui/k-icons';

type BadgeTheme = { main: string; light: string; deep: string; glow: string };

const BADGE_THEMES: Record<string, BadgeTheme> = {
  pushup: { main: '#E3B341', light: '#ffeecc', deep: '#997722', glow: '#ffd43b44' },
  plank: { main: '#10B981', light: '#d1fae5', deep: '#047857', glow: '#10b98144' },
  run: { main: '#6BB6BF', light: '#e1f5f7', deep: '#2d6a71', glow: '#6bb6bf44' },
  squat: { main: '#FC3D39', light: '#ffeceb', deep: '#b31512', glow: '#fc3d3944' },
  default: { main: '#10B981', light: '#d1fae5', deep: '#047857', glow: '#10b98133' },
};

function metricFromMilestoneKey(milestoneKey: string): string {
  return milestoneKey.split('_')[0]?.replace(/s$/, '') ?? 'default';
}

export type KBadgeProps = {
  milestoneKey: string;
  size?: number;
  isFlipped?: boolean;
  dateLabel?: string;
  achievementLabel?: string;
};

/**
 * 3D flip milestone badge (adapted from kinetic-v2 dashboard).
 */
export function KBadge({
  milestoneKey,
  size = 48,
  isFlipped = false,
  dateLabel = '',
  achievementLabel = '',
}: KBadgeProps) {
  const metric = metricFromMilestoneKey(milestoneKey);
  const Icon = exerciseIcon(metric === 'pushup' ? 'pushups' : metric === 'squat' ? 'squats' : metric);
  const theme = BADGE_THEMES[metric] ?? BADGE_THEMES.default;
  const iconSize = Math.round(size * 0.5);

  return (
    <div
      className="relative flex items-center justify-center shrink-0"
      style={{
        width: size,
        height: size,
        perspective: '1200px',
        transformStyle: 'preserve-3d',
      }}
    >
      <motion.div
        animate={{
          rotateY: isFlipped ? 180 : 0,
          rotateX: isFlipped ? 0 : [0, 2, -2, 0],
          rotateZ: isFlipped ? 0 : [0, 1, -1, 0],
        }}
        transition={{
          rotateY: { type: 'spring', stiffness: 200, damping: 25 },
          rotateX: { repeat: Infinity, duration: 4, ease: 'linear' },
          rotateZ: { repeat: Infinity, duration: 5, ease: 'linear' },
        }}
        style={{ transformStyle: 'preserve-3d' }}
        className="relative w-full h-full"
      >
        <div
          className="absolute inset-0 rounded-full border-[1.5px] shadow-lg flex items-center justify-center overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            background: `linear-gradient(135deg, ${theme.light} 0%, ${theme.main} 50%, ${theme.deep} 100%)`,
            borderColor: theme.deep,
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 4px 10px rgba(0,0,0,0.2)',
            transform: 'translateZ(1px)',
          }}
        >
          <div className="absolute inset-0 rounded-full blur-[10px] opacity-40" style={{ background: theme.glow }} />
          <div className="absolute inset-[15%] rounded-full opacity-60 bg-white/40 backdrop-blur-[3px] border border-white/50 shadow-inner" />

          <motion.div
            animate={{ x: [-size, size * 2] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
            className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent -rotate-45"
          />

          <div
            className="absolute top-0 left-0 right-0 h-1/2 opacity-60"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 100%)',
              clipPath: 'ellipse(100% 100% at 50% 0%)',
            }}
          />
          <div className="relative z-10 drop-shadow-md">
            <Icon size={iconSize} color={theme.deep} />
          </div>
        </div>

        <div
          className="absolute inset-0 rounded-full border-[1.5px] shadow-lg flex flex-col items-center justify-center p-4 text-center overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg) translateZ(1px)',
            background: `linear-gradient(135deg, ${theme.main} 0%, ${theme.deep} 100%)`,
            borderColor: theme.deep,
            boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.3)',
          }}
        >
          <div className="flex flex-col items-center justify-center gap-1 relative z-10">
            <div className="w-10 h-[1.5px] bg-black/30 mb-3 rounded-full opacity-50" />
            <p
              className="font-display font-black italic uppercase leading-none text-black/60 mix-blend-overlay"
              style={{ fontSize: size * 0.1, letterSpacing: '-0.02em' }}
            >
              {achievementLabel}
            </p>
            <p
              className="font-bold uppercase tracking-[0.2em] text-black/50 mt-1"
              style={{ fontSize: size * 0.05 }}
            >
              Earned on
            </p>
            <p
              className="font-black uppercase text-black/60 mix-blend-overlay"
              style={{ fontSize: size * 0.07 }}
            >
              {dateLabel}
            </p>
            <div className="w-10 h-[1.5px] bg-black/30 mt-3 rounded-full opacity-50" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
