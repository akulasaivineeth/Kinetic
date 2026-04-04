'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TogglePillsProps<T extends string> {
  options: { value: T; label: string }[];
  selected: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
}

export function TogglePills<T extends string>({
  options,
  selected,
  onChange,
  size = 'md',
}: TogglePillsProps<T>) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((option) => (
        <motion.button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'relative rounded-full font-semibold tracking-wide transition-all duration-200',
            size === 'sm' ? 'px-3 py-1 text-[11px]' : 'px-4 py-1.5 text-xs',
            selected === option.value
              ? 'text-emerald-400'
              : 'text-dark-muted hover:text-dark-text'
          )}
          whileTap={{ scale: 0.95 }}
        >
          {selected === option.value && (
            <motion.div
              layoutId="toggle-pill"
              className="absolute inset-0 rounded-full bg-emerald-500/15 border border-emerald-500/30"
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            />
          )}
          <span className="relative z-10">{option.label}</span>
        </motion.button>
      ))}
    </div>
  );
}
