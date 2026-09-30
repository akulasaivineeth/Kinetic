'use client';

import { motion } from 'framer-motion';
import type { ComponentType, ReactNode } from 'react';
import type { IconProps } from '@/components/ui/k-icons';
import { cn } from '@/lib/utils';

export type ExerciseStepperCardProps = {
  label: string;
  icon: ComponentType<IconProps>;
  value: number;
  onChange: (next: number) => void;
  step: number;
  min?: number;
  /** Optional helper under the header, e.g. goal remaining. */
  goalLeft?: string;
  /** Optional centered value display (e.g. formatted plank time). */
  valueDisplay?: ReactNode;
  className?: string;
};

function roundStep(val: number, step: number, direction: 1 | -1): number {
  const decimals = step.toString().includes('.') ? step.toString().split('.')[1]?.length ?? 1 : 0;
  const factor = 10 ** decimals;
  const delta = direction * step;
  return Math.round((val + delta) * factor) / factor;
}

export function ExerciseStepperCard({
  label,
  icon: Icon,
  value,
  onChange,
  step,
  min = 0,
  goalLeft,
  valueDisplay,
  className,
}: ExerciseStepperCardProps) {
  const decrement = () => onChange(Math.max(min, roundStep(value, step, -1)));
  const increment = () => onChange(Math.max(min, roundStep(value, step, 1)));

  return (
    <div
      className={cn(
        'rounded-2xl bg-dark-elevated/70 border border-dark-border/80 p-4',
        className,
      )}
    >
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center text-emerald-500">
            <Icon size={22} />
          </span>
          <span className="text-[11px] font-black tracking-wider text-dark-text uppercase truncate">{label}</span>
        </div>
        {goalLeft ? (
          <span className="text-[9px] font-bold tracking-wider text-emerald-500 shrink-0 text-right">{goalLeft}</span>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={decrement}
          aria-label={`Decrease ${label}`}
          className="w-12 h-12 rounded-xl bg-dark-bg border border-dark-border flex items-center justify-center text-dark-muted hover:text-red-500 hover:border-red-400/40 transition-colors flex-shrink-0"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <path d="M5 12h14" />
          </svg>
        </motion.button>

        <div className="flex-1 min-w-0 text-center text-4xl font-display font-black text-dark-text tabular-nums py-1">
          {valueDisplay ?? value}
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={increment}
          aria-label={`Increase ${label}`}
          className="w-12 h-12 rounded-xl bg-dark-bg border border-dark-border flex items-center justify-center text-dark-muted hover:text-emerald-500 hover:border-emerald-500/35 transition-colors flex-shrink-0"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
        </motion.button>
      </div>
    </div>
  );
}
