/**
 * Crest enums — shared by client UI and server routes.
 * Do not import from `k-primitives` here (that module is `use client`).
 */
export type KCrestShape = 'shield' | 'hex' | 'circle' | 'diamond' | 'chevron';
export type KCrestEmblem =
  | 'bolt'
  | 'flame'
  | 'star'
  | 'peak'
  | 'wave'
  | 'cross'
  | 'arrow'
  | 'skull';

export const CREST_SHAPE_OPTIONS: readonly KCrestShape[] = [
  'shield',
  'hex',
  'circle',
  'diamond',
  'chevron',
];

export const CREST_EMBLEM_OPTIONS: readonly KCrestEmblem[] = [
  'bolt',
  'flame',
  'star',
  'peak',
  'wave',
  'cross',
  'arrow',
  'skull',
];

/** Deterministic crest styling from any string (e.g. team UUID). */
export function crestVariantFromSeed(seed: string): {
  shape: KCrestShape;
  emblem: KCrestEmblem;
  color: string;
} {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  const shape = CREST_SHAPE_OPTIONS[Math.abs(h) % CREST_SHAPE_OPTIONS.length];
  const emblem = CREST_EMBLEM_OPTIONS[(Math.abs(h) >> 4) % CREST_EMBLEM_OPTIONS.length];
  const hue = Math.abs(Math.imul(h, 47)) % 360;
  const color = `hsl(${hue} 58% 42%)`;
  return { shape, emblem, color };
}
