'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { DateRange } from '@/hooks/use-workout-logs';

interface DateRangeTabsProps {
  selected: DateRange;
  onChange: (range: DateRange) => void;
  onCustomDates?: (from: Date, to: Date) => void;
}

const tabs: { value: DateRange; label: string }[] = [
  { value: 'week', label: 'WEEK' },
  { value: 'month', label: 'MONTH' },
  { value: '3mo', label: '3MO' },
  { value: '6mo', label: '6MO' },
  { value: 'year', label: 'YEAR' },
  { value: 'custom', label: 'CUSTOM' },
];

export function DateRangeTabs({ selected, onChange, onCustomDates }: DateRangeTabsProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const handleTabClick = (value: DateRange) => {
    onChange(value);
    if (value === 'custom') {
      setShowPicker(true);
    } else {
      setShowPicker(false);
    }
  };

  const handleApplyCustom = () => {
    if (customFrom && customTo && onCustomDates) {
      onCustomDates(new Date(customFrom), new Date(customTo));
    }
  };

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleTabClick(tab.value)}
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

      {/* Custom date picker */}
      <AnimatePresence>
        {showPicker && selected === 'custom' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 mt-3">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-dark-elevated text-sm text-dark-text border border-dark-border outline-none focus:border-emerald-500/50 transition-colors [color-scheme:dark]"
              />
              <span className="text-dark-muted text-xs font-bold">→</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-dark-elevated text-sm text-dark-text border border-dark-border outline-none focus:border-emerald-500/50 transition-colors [color-scheme:dark]"
              />
              <button
                onClick={handleApplyCustom}
                className="px-3 py-2 rounded-xl bg-emerald-500/15 text-emerald-500 text-xs font-bold tracking-wider"
              >
                GO
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
