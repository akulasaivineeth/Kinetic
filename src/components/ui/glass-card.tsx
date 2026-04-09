'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  elevated?: boolean;
  animate?: boolean;
  delay?: number;
  onClick?: () => void;
  'data-testid'?: string;
}

export function GlassCard({
  children,
  className,
  elevated = false,
  animate = true,
  delay = 0,
  onClick,
  'data-testid': dataTestId,
}: GlassCardProps) {
  const motionProps = animate
    ? {
        initial: { opacity: 0, y: 10, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        transition: {
          type: 'spring',
          stiffness: 300,
          damping: 25,
          delay,
        },
      }
    : {};

  return (
    <motion.div
      data-testid={dataTestId}
      className={cn(
        elevated ? 'glass-card-elevated' : 'glass-card',
        'p-4',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      whileHover={onClick ? { y: -4, transition: { type: 'spring', stiffness: 300, damping: 25 } } : undefined}
      whileTap={onClick ? { scale: 0.97 } : undefined}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
}
