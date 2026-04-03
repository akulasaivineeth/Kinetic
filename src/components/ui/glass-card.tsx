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
}

export function GlassCard({
  children,
  className,
  elevated = false,
  animate = true,
  delay = 0,
  onClick,
}: GlassCardProps) {
  const Component = animate ? motion.div : 'div';
  const animateProps = animate
    ? {
        initial: { opacity: 0, y: 10, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        transition: {
          type: 'spring',
          stiffness: 400,
          damping: 25,
          delay,
        },
      }
    : {};

  return (
    <Component
      className={cn(
        elevated ? 'glass-card-elevated' : 'glass-card',
        'p-4',
        onClick && 'cursor-pointer active:scale-[0.98] transition-spring',
        className
      )}
      onClick={onClick}
      {...animateProps}
    >
      {children}
    </Component>
  );
}
