import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatPlankTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
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
