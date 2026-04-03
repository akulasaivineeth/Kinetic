'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { DateRange } from '@/hooks/use-workout-logs';

interface DateRangeTabsProps {
  selected: DateRange;
  onChange: (range: DateRange) => void;
}

const tabs: { value: DateRange; label: string }[] = [
  { value: 'week', label: 'WEEK' },
  { value: 'month', label: 'MONTH' },
  { value: '3mo', label: '3MO' },
  { value: '6mo', label: '6MO' },
  { value: 'year', label: 'YEAR' },
];

export function DateRangeTabs({ selected, onChange }: DateRangeTabsProps) {
  return (
    <div className="flex gap-1 overflow-x-auto no-scrollbar">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'relative px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wider whitespace-nowrap transition-all duration-200',
            selected === tab.value
              ? 'text-emerald-400'
              : 'text-dark-muted hover:text-dark-text'
          )}
        >
          {selected === tab.value && (
            <motion.div
              layoutId="date-tab"
              className="absolute inset-0 rounded-full bg-emerald-500/15 border border-emerald-500/30"
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          )}
          <span className="relative z-10">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
