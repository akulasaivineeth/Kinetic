'use client';

import { exerciseIcon } from '@/components/ui/k-icons';

// Per-activity tint palette (bg + icon colour)
const TINTS: Record<string, { bg: string; color: string }> = {
  pushup:     { bg: '#EEF0FF', color: '#4F6AF5' },
  pushups:    { bg: '#EEF0FF', color: '#4F6AF5' },
  squat:      { bg: '#FFF3E8', color: '#EA7E2F' },
  squats:     { bg: '#FFF3E8', color: '#EA7E2F' },
  plank:      { bg: '#E4F9F5', color: '#2DB9A2' },
  run:        { bg: '#E4F7EE', color: '#1FB37A' },
  burpee:     { bg: '#FFE8E8', color: '#E84040' },
  pullup:     { bg: '#EDE8FF', color: '#7B52E8' },
  pullups:    { bg: '#EDE8FF', color: '#7B52E8' },
  swim:       { bg: '#E4F3FF', color: '#2FA8D4' },
  swimming:   { bg: '#E4F3FF', color: '#2FA8D4' },
  yoga:       { bg: '#FFE8F5', color: '#D4509A' },
  cycling:    { bg: '#FFF9E0', color: '#C9A000' },
  bike:       { bg: '#FFF9E0', color: '#C9A000' },
  jumprope:   { bg: '#FFE8E0', color: '#E87240' },
  elliptical: { bg: '#EDEDFF', color: '#6060E0' },
  lunge:      { bg: '#F0FFE4', color: '#6DAC30' },
  deadlift:   { bg: '#F5F0E4', color: '#8C6428' },
  bench:      { bg: '#E4F0FF', color: '#3080C0' },
  kettlebell: { bg: '#F0E8FF', color: '#8060A0' },
  stepup:     { bg: '#FAF0E4', color: '#A06030' },
  curl:       { bg: '#E4EEFF', color: '#3060A0' },
  rowing:     { bg: '#E8F5FF', color: '#2080B0' },
  row:        { bg: '#E8F5FF', color: '#2080B0' },
  hiking:     { bg: '#E8F5E8', color: '#3A8040' },
  walking:    { bg: '#F0F5E8', color: '#5A9040' },
};

const FALLBACK = { bg: '#F0F2F0', color: '#6B7280' };

const DIMS = {
  xs: { box: 24, radius: 7,  icon: 13 },
  sm: { box: 30, radius: 9,  icon: 16 },
  md: { box: 40, radius: 11, icon: 20 },
  lg: { box: 48, radius: 13, icon: 24 },
};

interface ActivityIconProps {
  slug: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  // kept for backwards-compat — ignored, slug drives the icon
  emoji?: string;
}

export function ActivityEmojiIcon({ slug, size = 'md', className = '' }: ActivityIconProps) {
  const Icon = exerciseIcon(slug);
  const { bg, color } = TINTS[slug] ?? FALLBACK;
  const { box, radius, icon } = DIMS[size];

  return (
    <div
      className={`flex-shrink-0 flex items-center justify-center ${className}`}
      style={{
        width: box,
        height: box,
        borderRadius: radius,
        background: bg,
        boxShadow: '0 1px 3px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.75)',
      }}
    >
      <Icon size={icon} color={color} />
    </div>
  );
}

// Named alias so new code can be explicit
export { ActivityEmojiIcon as ActivityIcon };
