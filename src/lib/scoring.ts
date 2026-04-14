/**
 * Kinetic Continuous Per-Session Scoring System
 *
 * DESIGN PHILOSOPHY: Every single rep, every second, every meter matters.
 * The scoring uses a smooth continuous curve (not step tiers) where:
 *   - Base points reward effort from rep 1
 *   - A velocity bonus scales smoothly — the higher you go, the more each
 *     additional unit is worth (progressive reward, not diminishing returns)
 *   - The formula: score = base_rate × count + acceleration × count²/scale
 *     This means the marginal value of each rep/sec/km INCREASES as you push harder
 *
 * Example (push-ups):
 *   10 reps → 10×1.5 + 0.08×(10²) = 15 + 8 = 23 pts
 *   20 reps → 20×1.5 + 0.08×(20²) = 30 + 32 = 62 pts  (not 2× but 2.7×!)
 *   30 reps → 30×1.5 + 0.08×(30²) = 45 + 72 = 117 pts (extra 10 reps = +55 pts!)
 *
 * This creates the "push for that extra rep" incentive the user wants.
 */

// ─── Configuration ───────────────────────────────────────────────────────────

export interface ScoringConfig {
  /** Points per unit at the base level */
  baseRate: number;
  /** Quadratic acceleration factor — how fast points ramp up */
  acceleration: number;
  /** Activity name for display */
  name: string;
  /** Unit label */
  unit: string;
  /** Emoji for UI display */
  emoji: string;
}

export const PUSHUP_CONFIG: ScoringConfig = {
  baseRate: 1.5,
  acceleration: 0.08,
  name: 'Push-ups',
  unit: 'reps',
  emoji: '💪',
};

export const PLANK_CONFIG: ScoringConfig = {
  baseRate: 0.3,       // per second (not per 10 seconds)
  acceleration: 0.002, // gentle curve — holding longer is rewarded
  name: 'Plank',
  unit: 'sec',
  emoji: '🧘',
};

export const RUN_CONFIG: ScoringConfig = {
  baseRate: 12,       // per km
  acceleration: 2.5,  // strong quadratic — long runs are very rewarding
  name: 'Run',
  unit: 'km',
  emoji: '🏃',
};

// ─── Core Scoring Function ───────────────────────────────────────────────────

/**
 * Continuous scoring curve: score = base × n + accel × n²
 * Every additional unit is worth MORE than the previous one.
 */
function continuousScore(value: number, config: ScoringConfig): number {
  if (value <= 0) return 0;
  const n = value;
  const score = config.baseRate * n + config.acceleration * (n * n);
  return Math.round(score * 10) / 10;
}

/** Push-up score: every rep counts, each one worth more than the last */
export function calculatePushupScore(reps: number): number {
  return continuousScore(reps, PUSHUP_CONFIG);
}

/** Plank score: every second counts */
export function calculatePlankScore(seconds: number): number {
  return continuousScore(seconds, PLANK_CONFIG);
}

/** Run score: every km counts */
export function calculateRunScore(distanceKm: number): number {
  return continuousScore(distanceKm, RUN_CONFIG);
}

// ─── Session Score ───────────────────────────────────────────────────────────

export interface SessionScoreBreakdown {
  pushupPts: number;
  plankPts: number;
  runPts: number;
  totalPts: number;
}

/**
 * Calculate the full session score for a single workout log.
 */
export function calculateSessionScore(
  pushupReps: number,
  plankSeconds: number,
  runDistanceKm: number
): SessionScoreBreakdown {
  const pushupPts = calculatePushupScore(pushupReps);
  const plankPts = calculatePlankScore(plankSeconds);
  const runPts = calculateRunScore(runDistanceKm);

  return {
    pushupPts,
    plankPts,
    runPts,
    totalPts: Math.round((pushupPts + plankPts + runPts) * 10) / 10,
  };
}

/**
 * Show the marginal value of the next unit — used for motivational UI.
 * "Your next rep is worth X pts!"
 */
export function marginalValue(currentCount: number, config: ScoringConfig): number {
  const current = continuousScore(currentCount, config);
  const next = continuousScore(currentCount + 1, config);
  return Math.round((next - current) * 10) / 10;
}

// ─── FAQ Content ─────────────────────────────────────────────────────────────

export interface FaqItem {
  question: string;
  answer: string;
}

// Precompute example scores for FAQ
const examples = {
  push10: calculatePushupScore(10),
  push20: calculatePushupScore(20),
  push25: calculatePushupScore(25),
  push30: calculatePushupScore(30),
  push50: calculatePushupScore(50),
  plank60: calculatePlankScore(60),
  plank90: calculatePlankScore(90),
  plank180: calculatePlankScore(180),
  run3: calculateRunScore(3),
  run5: calculateRunScore(5),
  run7: calculateRunScore(7),
};

export const SCORING_FAQ: FaqItem[] = [
  {
    question: 'How is my session score calculated?',
    answer:
      'Every workout you submit earns points based on that single session. ' +
      'The scoring uses a progressive curve — every additional rep, second, or kilometer is worth MORE than the previous one. ' +
      'This means pushing for "just one more" always pays off. ' +
      'Your Arena score is the sum of all your session scores in the selected time period.',
  },
  {
    question: 'How do push-up points work?',
    answer:
      `Every rep counts and each one is worth more than the last. ` +
      `10 reps = ${examples.push10} pts, 20 reps = ${examples.push20} pts, ` +
      `25 reps = ${examples.push25} pts, 30 reps = ${examples.push30} pts, ` +
      `50 reps = ${examples.push50} pts. ` +
      `Notice how the 20th→30th reps earn way more than the 1st→10th!`,
  },
  {
    question: 'How do plank points work?',
    answer:
      `Every second you hold builds your score. ` +
      `60s = ${examples.plank60} pts, 90s = ${examples.plank90} pts, ` +
      `3 min (180s) = ${examples.plank180} pts. ` +
      `Holding an extra 10 seconds always rewards you — the longer you hold, the more each second is worth.`,
  },
  {
    question: 'How do run points work?',
    answer:
      `Every distance earns points from the first step. ` +
      `3 km = ${examples.run3} pts, 5 km = ${examples.run5} pts, ` +
      `7 km = ${examples.run7} pts. ` +
      `Longer runs get a significant bonus — that extra kilometer is always worth pushing for.`,
  },
  {
    question: 'Why does each additional rep/second/km earn more?',
    answer:
      'It takes more effort to do pushup #50 than pushup #1. ' +
      'The progressive curve (score = base×n + acceleration×n²) rewards that increasing difficulty. ' +
      'This means there\'s always a reason to push harder — your score never plateaus.',
  },
  {
    question: 'Why per-session and not daily totals?',
    answer:
      'Scoring per session rewards quality over quantity. 50 push-ups in one session is harder ' +
      'than 10×5 across the day, and the quadratic scaling rewards that concentrated effort.',
  },
  {
    question: 'What is Fair Mode in the Arena?',
    answer:
      'Fair Mode ranks by percentage improvement compared to your previous period. ' +
      'A beginner who doubles their output outranks a veteran who improves by 10%, making competition fair.',
  },
  {
    question: 'How does the Streak work?',
    answer:
      'Your streak counts consecutive weeks where you logged 4 or more workouts. ' +
      'Miss a week (fewer than 4 submissions) and your streak resets to zero.',
  },
  {
    question: 'What are Milestones?',
    answer:
      'Milestones are lifetime achievement badges. They unlock when your cumulative totals cross ' +
      'certain thresholds (e.g., 1,000 total push-ups, 1 hour total plank time).',
  },
];
