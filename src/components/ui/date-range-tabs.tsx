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
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
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
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 mt-3 p-3 rounded-2xl bg-dark-elevated/30 border border-white/5 backdrop-blur-md shadow-2xl">
              <div className="flex-1 relative">
                <p className="absolute -top-4 left-1 text-[8px] font-bold text-dark-muted uppercase tracking-widest">FROM</p>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-dark-bg/60 text-xs font-bold text-dark-text border border-white/5 outline-none focus:border-emerald-500/50 transition-colors [color-scheme:dark]"
                />
              </div>
              <span className="text-dark-muted text-xs font-bold mt-2">→</span>
              <div className="flex-1 relative">
                <p className="absolute -top-4 left-1 text-[8px] font-bold text-dark-muted uppercase tracking-widest">TO</p>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-dark-bg/60 text-xs font-bold text-dark-text border border-white/5 outline-none focus:border-emerald-500/50 transition-colors [color-scheme:dark]"
                />
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleApplyCustom}
                className="mt-2 px-4 py-2 rounded-xl bg-emerald-500 text-black text-[10px] font-black tracking-widest uppercase shadow-lg shadow-emerald-500/20"
              >
                GO
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
