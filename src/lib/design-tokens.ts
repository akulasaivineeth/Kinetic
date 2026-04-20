export const K = {
  green: '#1FB37A',
  greenDeep: '#158A5D',
  greenInk: '#0F6B48',
  mint: '#D7F0E2',
  mintSoft: '#EAF6EF',

  ink: '#0B0D0C',
  ink2: '#1E1F1E',
  muted: '#6B7280',
  mutedSoft: '#9AA2A9',
  line: 'rgba(15,17,16,0.08)',
  lineStrong: 'rgba(15,17,16,0.14)',

  bg: '#EEF0F0',
  bgWarm: '#F4F5F3',
  card: '#FFFFFF',

  danger: '#E25C5C',
  dangerSoft: '#FBE6E6',
  gold: '#E3B341',
  bronze: '#CD7F32',
  silver: '#B8BCC2',

  r: { pill: 9999, lg: 22, md: 16, sm: 12, xs: 8 },

  shadow: {
    card: '0 1px 2px rgba(15,17,16,0.04), 0 6px 16px rgba(15,17,16,0.04)',
    cardHi: '0 2px 4px rgba(15,17,16,0.05), 0 14px 30px rgba(15,17,16,0.08)',
    fab: '0 6px 20px rgba(31,179,122,0.35), 0 2px 6px rgba(31,179,122,0.2)',
    pop: '0 20px 50px rgba(15,17,16,0.18), 0 6px 18px rgba(15,17,16,0.08)',
  },

  font: {
    display: "'Archivo', -apple-system, system-ui, sans-serif",
    ui: "-apple-system, 'SF Pro Text', 'Inter', system-ui, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, monospace",
  },
} as const;

export const TIERS = [
  { id: 'bronze', name: 'Bronze', min: 0, color: '#CD7F32' },
  { id: 'silver', name: 'Silver', min: 2500, color: '#B8BCC2' },
  { id: 'gold', name: 'Gold', min: 6000, color: '#E3B341' },
  { id: 'platinum', name: 'Platinum', min: 12000, color: '#6BB6BF' },
  { id: 'diamond', name: 'Diamond', min: 25000, color: '#7A9EF0' },
  { id: 'elite', name: 'Elite', min: 50000, color: '#1FB37A' },
] as const;

export type TierInfo = (typeof TIERS)[number] & {
  next: (typeof TIERS)[number] | null;
  pct: number;
};

export function tierFor(score: number): TierInfo {
  let t: (typeof TIERS)[number] = TIERS[0];
  for (const tier of TIERS) if (score >= tier.min) t = tier;
  const idx = TIERS.findIndex((x) => x.id === t.id);
  const next = idx < TIERS.length - 1 ? TIERS[idx + 1] : null;
  const pct = next ? (score - t.min) / (next.min - t.min) : 1;
  return { ...t, next, pct };
}

export const DARK_TOKENS = {
  bg: '#0A0A0A',
  bgWarm: '#111111',
  card: '#1A1A1C',
  ink: '#F5F5F7',
  ink2: '#E0E0E0',
  muted: '#8E8E93',
  mutedSoft: '#636366',
  line: 'rgba(255,255,255,0.06)',
  lineStrong: 'rgba(255,255,255,0.12)',
  mint: 'rgba(31,179,122,0.15)',
  mintSoft: 'rgba(31,179,122,0.08)',
  shadow: {
    card: '0 1px 2px rgba(0,0,0,0.2), 0 6px 16px rgba(0,0,0,0.15)',
    cardHi: '0 2px 4px rgba(0,0,0,0.3), 0 14px 30px rgba(0,0,0,0.2)',
    fab: '0 6px 20px rgba(31,179,122,0.4), 0 2px 6px rgba(31,179,122,0.25)',
    pop: '0 20px 50px rgba(0,0,0,0.4), 0 6px 18px rgba(0,0,0,0.2)',
  },
} as const;
