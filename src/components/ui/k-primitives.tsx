'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface KCardProps {
  children: React.ReactNode;
  className?: string;
  pad?: number;
  hi?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function KCard({ children, className, pad = 18, hi, onClick, style }: KCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn('bg-k-card rounded-k-lg', hi ? 'shadow-k-card-hi' : 'shadow-k-card', onClick && 'cursor-pointer', className)}
      style={{ padding: pad, ...style }}
    >
      {children}
    </div>
  );
}

export function KEyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('text-[11px] font-semibold tracking-[0.15em] uppercase text-k-muted-soft', className)}>
      {children}
    </div>
  );
}

export function KDisplay({ children, size = 32, className, style }: { children: React.ReactNode; size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={cn('font-display leading-[0.95] tracking-tight text-k-ink', className)}
      style={{ fontSize: size, ...style }}
    >
      {children}
    </div>
  );
}

interface KPillProps {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function KPill({ children, active, onClick, size = 'md', className }: KPillProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-k-pill font-bold uppercase tracking-wide transition-all',
        size === 'sm' ? 'px-3 py-1.5 text-[11px]' : 'px-4 py-2 text-[13px]',
        active
          ? 'bg-k-mint text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 border-none'
          : 'bg-transparent text-k-muted border border-k-line-strong',
        className
      )}
    >
      {children}
    </button>
  );
}

interface KAvatarProps {
  name?: string;
  size?: number;
  color?: string;
  src?: string | null;
  ring?: string;
  className?: string;
}

export function KAvatar({ name = '?', size = 44, color, src, ring, className }: KAvatarProps) {
  const initials = name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();
  const palette = ['#6B7FD8', '#E07A5F', '#7FB069', '#D4A373', '#9D4EDD', '#F4A261', '#2A9D8F', '#E76F51'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % palette.length;
  const bg = color || palette[h];

  return (
    <div
      className={cn('rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white', className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: src ? `url(${src}) center/cover` : bg,
        border: ring ? `3px solid ${ring}` : 'none',
      }}
    >
      {!src && initials}
    </div>
  );
}

interface KCrestProps {
  shape?: 'shield' | 'hex' | 'circle' | 'diamond' | 'chevron';
  emblem?: 'bolt' | 'flame' | 'star' | 'peak' | 'wave' | 'cross' | 'arrow' | 'skull';
  color?: string;
  size?: number;
  glow?: boolean;
}

const SHAPES: Record<string, React.ReactNode> = {
  shield: <path d="M32 4l24 8v18c0 15-10 26-24 34C18 56 8 45 8 30V12l24-8z" />,
  hex: <path d="M32 4l24 14v28L32 60 8 46V18L32 4z" />,
  circle: <circle cx="32" cy="32" r="28" />,
  diamond: <path d="M32 4l28 28-28 28L4 32z" />,
  chevron: <path d="M4 14l28-10 28 10v22L32 60 4 36z" />,
};

const EMBLEMS: Record<string, React.ReactNode> = {
  bolt: <path d="M36 18l-14 18h10l-4 12 14-18H32l4-12z" fill="#fff" />,
  flame: <path d="M32 16c2 6 10 8 10 18a10 10 0 01-20 0c0-4 2-6 4-8-1 4 1 6 3 6 0-6 2-10 3-16z" fill="#fff" />,
  star: <path d="M32 14l4 11h11l-9 7 3 11-9-7-9 7 3-11-9-7h11z" fill="#fff" />,
  peak: <path d="M14 44l10-16 6 8 4-6 12 14H14z" fill="#fff" />,
  wave: <path d="M14 30c3-3 6-3 9 0s6 3 9 0 6-3 9 0 6 3 9 0M14 40c3-3 6-3 9 0s6 3 9 0 6-3 9 0 6 3 9 0" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />,
  cross: <path d="M28 16h8v12h12v8H36v12h-8V36H16v-8h12z" fill="#fff" />,
  arrow: <path d="M32 14v24M22 28l10-14 10 14M22 46h20" stroke="#fff" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />,
  skull: <path d="M32 14c-8 0-14 6-14 14v6l4 4v8h20v-8l4-4v-6c0-8-6-14-14-14zm-5 20a3 3 0 110-6 3 3 0 010 6zm10 0a3 3 0 110-6 3 3 0 010 6z" fill="#fff" />,
};

export function KCrest({ shape = 'shield', emblem = 'bolt', color = '#1FB37A', size = 56, glow = false }: KCrestProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      style={{ filter: glow ? `drop-shadow(0 0 16px ${color}88)` : 'none' }}
    >
      <g fill={color}>{SHAPES[shape]}</g>
      <g opacity="0.95">{EMBLEMS[emblem]}</g>
    </svg>
  );
}

interface KRingProps {
  pct?: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: React.ReactNode;
}

export function KRing({ pct = 0.5, size = 110, stroke = 10, color = '#1FB37A', track, children }: KRingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(1, Math.max(0, pct)));

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={track || 'var(--k-line)'}
          strokeWidth={stroke}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: off }}
          transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
