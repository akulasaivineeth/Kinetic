import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatPlankTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Parses rolling numeric keypad input as MM:SS (last up to 4 digits).
 * Seconds 60–99 roll into minutes (e.g. 6666 → 67:06, not 66:66 as raw seconds).
 */
export function parsePlankMmSsDigitInput(raw: string, maxSeconds = 36000): number {
  const digits = raw.replace(/\D/g, '').slice(-4);
  if (!digits) return 0;
  const padded = digits.padStart(4, '0');
  let mm = parseInt(padded.slice(0, 2), 10);
  let ss = parseInt(padded.slice(2, 4), 10);
  if (Number.isNaN(mm)) mm = 0;
  if (Number.isNaN(ss)) ss = 0;
  mm += Math.floor(ss / 60);
  ss = ss % 60;
  return Math.min(maxSeconds, mm * 60 + ss);
}

export function formatDistance(km: number, unit?: 'metric' | 'imperial'): number {
  if (unit === 'imperial') {
    return Number((km * 0.621371).toFixed(1));
  }
  return Number(km.toFixed(1));
}

export function formatPercentage(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function calculateStaminaScore(
  whoopRecovery: number,
  goalConsistency: number,
  leanMassStability: number
): number {
  return Math.round(
    0.4 * whoopRecovery + 0.3 * goalConsistency + 0.3 * leanMassStability
  );
}

export function calculatePeakGain(
  pushupImprovement: number,
  plankImprovement: number,
  runImprovement: number
): number {
  return (pushupImprovement + plankImprovement + runImprovement) / 3;
}
