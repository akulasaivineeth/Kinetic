'use client';

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

export function IcPulse({ size = 22, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M2 12h4l2-6 3 12 3-9 2 3h6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function IcSquads({ size = 22, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5l8-3z" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
    </svg>
  );
}

export function IcLog({ size = 22, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <ellipse cx="12" cy="12" rx="9" ry="5" stroke={color} strokeWidth="2"/>
      <path d="M8 12h8" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export function IcProfile({ size = 22, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="8" r="3.5" stroke={color} strokeWidth="1.8"/>
      <path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

export function IcBell({ size = 18, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M6 16V10a6 6 0 0112 0v6l1.5 2h-15L6 16z" stroke={color} strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M10 20a2 2 0 004 0" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}

export function IcFlame({ size = 16, color = '#E25C5C', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 3c1 4 5 5 5 10a5 5 0 01-10 0c0-2 1-3 2-4-.5 2 .5 3 1.5 3 0-3 1-5 1.5-9z" fill={color}/>
    </svg>
  );
}

export function IcTrophy({ size = 22, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M7 4h10l-.5 6a4.5 4.5 0 01-9 0L7 4z" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="M5 5H3v2a3 3 0 003 3M19 5h2v2a3 3 0 01-3 3M10 15v3h4v-3M9 20h6" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

export function IcSparkle({ size = 14, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" fill={color}/>
    </svg>
  );
}

export function IcSend({ size = 18, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M3 12L21 4l-4 17-5-8-9-1z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  );
}

export function IcBack({ size = 20, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M15 5l-7 7 7 7" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function IcChevron({ size = 14, color = 'currentColor', dir = 'right', className }: IconProps & { dir?: 'right' | 'down' | 'left' | 'up' }) {
  const r = { right: 0, down: 90, left: 180, up: 270 }[dir];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ transform: `rotate(${r}deg)` }}>
      <path d="M9 5l7 7-7 7" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function IcCopy({ size = 14, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="8" y="8" width="12" height="12" rx="2.5" stroke={color} strokeWidth="1.8"/>
      <path d="M16 8V5a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" stroke={color} strokeWidth="1.8"/>
    </svg>
  );
}

// ─── Exercise icons ──────────────────────────────────────────

export function ExPushup({ size = 28, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <path d="M3 22h26" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
      <circle cx="8" cy="13" r="2" stroke={color} strokeWidth="1.6"/>
      <path d="M10 14l6 4M16 18l8-2M16 18l-3 4M24 16v6M10 22v-4" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function ExSquat({ size = 28, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <circle cx="16" cy="6" r="2.2" stroke={color} strokeWidth="1.6"/>
      <path d="M16 9v6l-4 5v5M16 15l4 5v5M12 14h8" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4 27h24" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}

export function ExPlank({ size = 28, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <path d="M3 23h26" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
      <circle cx="7" cy="14" r="2" stroke={color} strokeWidth="1.6"/>
      <path d="M9 15l18 3M9 15v8M27 18v5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function ExRun({ size = 28, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <circle cx="19" cy="5" r="2.2" stroke={color} strokeWidth="1.6"/>
      <path d="M12 14l5-4 4 3 4 1M17 10l-2 5 4 3-2 6M15 15l-5 2M19 24l3 4M4 13l4-2" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function ExPullup({ size = 28, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <path d="M4 6h24" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
      <circle cx="16" cy="12" r="2" stroke={color} strokeWidth="1.6"/>
      <path d="M12 6v2l4 4M20 6v2l-4 4M16 14v7l-2 5M16 21l2 5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function ExSwim({ size = 28, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <circle cx="11" cy="10" r="2" stroke={color} strokeWidth="1.6"/>
      <path d="M13 11l5 2 7-3M4 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0 4 2 6 0M4 21c2-2 4-2 6 0s4 2 6 0 4-2 6 0 4 2 6 0" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function ExYoga({ size = 28, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <circle cx="16" cy="8" r="2.2" stroke={color} strokeWidth="1.6"/>
      <path d="M16 11v6M10 17h12M10 17l-5 4M22 17l5 4M4 23h24" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function ExBike({ size = 28, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <circle cx="7" cy="22" r="4" stroke={color} strokeWidth="1.6"/>
      <circle cx="24" cy="22" r="4" stroke={color} strokeWidth="1.6"/>
      <path d="M7 22l6-10h7l4 10M13 12l3-3h4" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function ExRow({ size = 28, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <path d="M3 23c3-2 7-2 10 0s7 2 10 0 6-1 6-1" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
      <circle cx="10" cy="13" r="2" stroke={color} strokeWidth="1.6"/>
      <path d="M12 14l4 2 6-4 5 1M16 16v4" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function ExJumprope({ size = 28, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <circle cx="16" cy="6" r="2" stroke={color} strokeWidth="1.6"/>
      <path d="M16 8v9M12 17h8M13 17l-2 7M19 17l2 7" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 14c-4-4-5-10-2-11M24 14c4-4 5-10 2-11" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}

export const EXERCISE_ICON_MAP: Record<string, React.ComponentType<IconProps>> = {
  pushup: ExPushup,
  pushups: ExPushup,
  squat: ExSquat,
  squats: ExSquat,
  plank: ExPlank,
  run: ExRun,
  pullup: ExPullup,
  pullups: ExPullup,
  swimming: ExSwim,
  swim: ExSwim,
  yoga: ExYoga,
  bike: ExBike,
  rowing: ExRow,
  row: ExRow,
  jumprope: ExJumprope,
  hiking: ExRun,
  walking: ExRun,
  elliptical: ExBike,
  stairclimber: ExSquat,
};
