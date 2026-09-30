'use client';

import type { ComponentType } from 'react';

export interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

export function ExPushup({ size = 28, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <path d="M3 22h26" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="8" cy="13" r="2" stroke={color} strokeWidth="1.6" />
      <path
        d="M10 14l6 4M16 18l8-2M16 18l-3 4M24 16v6M10 22v-4"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ExSquat({ size = 28, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <circle cx="16" cy="6" r="2.2" stroke={color} strokeWidth="1.6" />
      <path
        d="M16 9v6l-4 5v5M16 15l4 5v5M12 14h8"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M4 27h24" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function ExPlank({ size = 28, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <path d="M3 23h26" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="7" cy="14" r="2" stroke={color} strokeWidth="1.6" />
      <path
        d="M9 15l18 3M9 15v8M27 18v5"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ExRun({ size = 28, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <circle cx="19" cy="5" r="2.2" stroke={color} strokeWidth="1.6" />
      <path
        d="M12 14l5-4 4 3 4 1M17 10l-2 5 4 3-2 6M15 15l-5 2M19 24l3 4M4 13l4-2"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const EXERCISE_ICON_MAP: Record<string, ComponentType<IconProps>> = {
  pushups: ExPushup,
  pushup: ExPushup,
  squats: ExSquat,
  squat: ExSquat,
  plank: ExPlank,
  run: ExRun,
};

export function exerciseIcon(slug: string): ComponentType<IconProps> {
  return EXERCISE_ICON_MAP[slug] ?? EXERCISE_ICON_MAP[slug.replace(/s$/, '')] ?? ExPushup;
}
