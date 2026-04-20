'use client';

import { useMemo } from 'react';
import { tierFor, type TierInfo } from '@/lib/design-tokens';
import { useAllTimeStats } from './use-alltime-stats';

export function useTier(): { tier: TierInfo; totalScore: number; isLoading: boolean } {
  const { data: stats, isLoading } = useAllTimeStats();

  const totalScore = useMemo(() => {
    if (!stats) return 0;
      const s = stats as unknown as Record<string, number>;
      return (s.totalPushups || 0) * 2 +
        (s.totalPlankSeconds || 0) * 0.8 +
        (s.totalRunDistance || 0) * 36 +
        (s.totalSquats || 0) * 2;
  }, [stats]);

  const tier = useMemo(() => tierFor(totalScore), [totalScore]);

  return { tier, totalScore, isLoading };
}
