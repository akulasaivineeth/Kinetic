'use client';

import { motion } from 'framer-motion';

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  remaining?: string;
}

export function ProgressBar({ value, max, label, remaining }: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-[10px] font-semibold tracking-widest uppercase text-dark-muted mb-0.5">
            WEEKLY VOLUME
          </p>
          <p className="text-sm font-bold text-dark-text">
            {label || `${max} reps goal`}
          </p>
        </div>
        <p className="text-sm font-bold text-emerald-500">
          {remaining || `${Math.max(max - value, 0)} remaining`}
        </p>
      </div>
      <div className="w-full h-2 rounded-full bg-dark-elevated overflow-hidden">
        <motion.div
          className="h-full rounded-full emerald-gradient"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 25,
            delay: 0.2,
          }}
        />
      </div>
    </div>
  );
}
