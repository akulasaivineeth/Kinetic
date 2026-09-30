export const SCORE_REVEAL_STORAGE_KEY = 'kinetic_score_reveal_v1';

export type ScoreRevealPayload = {
  totalPts: number;
  streak: number;
  prevRank: number | null;
  nextRank: number | null;
  headline: string | null;
  flexExtras?: number;
};

export function readScoreRevealPayload(): ScoreRevealPayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SCORE_REVEAL_STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as ScoreRevealPayload;
    if (typeof p.totalPts !== 'number') return null;
    return p;
  } catch {
    return null;
  }
}

export function clearScoreRevealPayload() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(SCORE_REVEAL_STORAGE_KEY);
}
