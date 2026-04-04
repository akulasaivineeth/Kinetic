'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { DateRange as DateRangeType } from '@/hooks/use-workout-logs';
import { DayPicker, type DateRange } from 'react-day-picker';
import * as Popover from '@radix-ui/react-popover';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, ChevronRight } from 'lucide-react';

// Custom CSS for react-day-picker to match Kinetic theme
const calendarStyles = `
  .rdp {
    --rdp-cell-size: 38px;
    --rdp-accent-color: #10B981;
    --rdp-background-color: rgba(16, 185, 129, 0.1);
    margin: 0;
  }
  .rdp-months { justify-content: center; }
  .rdp-day_selected, .rdp-day_selected:focus-visible, .rdp-day_selected:hover {
    color: black !important;
    font-weight: 900;
    background-color: var(--rdp-accent-color) !important;
  }
  .rdp-button:hover:not([disabled]):not(.rdp-day_selected) {
    background-color: rgba(255, 255, 255, 0.05);
  }
  .rdp-day { font-size: 11px; font-weight: 600; }
  .rdp-head_cell { font-size: 9px; font-weight: 800; color: #8E8E93; text-transform: uppercase; }
`;

interface DateRangeTabsProps {
  selected: DateRangeType;
  onChange: (range: DateRangeType) => void;
  onCustomDates?: (from: Date, to: Date) => void;
}

const tabs: { value: DateRangeType; label: string }[] = [
  { value: 'week', label: 'WEEK' },
  { value: 'month', label: 'MONTH' },
  { value: '3mo', label: '3MO' },
  { value: '6mo', label: '6MO' },
  { value: 'year', label: 'YEAR' },
  { value: 'custom', label: 'CUSTOM' },
];

export function DateRangeTabs({ selected, onChange, onCustomDates }: DateRangeTabsProps) {
  const [range, setRange] = useState<DateRange | undefined>();

  const handleTabClick = (value: DateRangeType) => {
    onChange(value);
  };

  const handleApplyCustom = () => {
    if (range?.from && range?.to && onCustomDates) {
      onCustomDates(range.from, range.to);
    }
  };

  return (
    <div className="relative">
      <style>{calendarStyles}</style>
      <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleTabClick(tab.value)}
            className={cn(
              'relative px-3.5 py-1.5 rounded-full text-[10px] font-black tracking-[0.1em] whitespace-nowrap transition-all duration-200',
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

      <AnimatePresence>
        {selected === 'custom' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-3"
          >
            <Popover.Root>
              <Popover.Trigger asChild>
                <button className="w-full h-12 px-4 rounded-2xl bg-dark-elevated border border-dark-border flex items-center justify-between group hover:border-emerald-500/30 transition-all">
                  <div className="flex items-center gap-3">
                    <CalendarIcon size={16} className="text-dark-muted group-hover:text-emerald-500 transition-colors" />
                    <span className="text-[11px] font-bold text-dark-text tracking-wide">
                      {range?.from 
                        ? `${format(range.from, 'MMM d')} - ${range.to ? format(range.to, 'MMM d') : '...'}`
                        : 'SELECT DATE RANGE'}
                    </span>
                  </div>
                  <ChevronRight size={14} className="text-dark-muted" />
                </button>
              </Popover.Trigger>
              
              <Popover.Portal>
                <Popover.Content 
                  className="z-[100] w-auto p-4 rounded-3xl glass-card-elevated border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                  sideOffset={8}
                  align="start"
                >
                  <DayPicker
                    mode="range"
                    selected={range}
                    onSelect={setRange}
                    numberOfMonths={1}
                  />
                  <div className="flex gap-2 mt-4">
                    <Popover.Close asChild>
                      <button 
                        onClick={handleApplyCustom}
                        disabled={!range?.from || !range?.to}
                        className="flex-1 py-3 rounded-xl emerald-gradient text-white text-[10px] font-black tracking-widest uppercase shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                      >
                        APPLY RANGE
                      </button>
                    </Popover.Close>
                  </div>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
