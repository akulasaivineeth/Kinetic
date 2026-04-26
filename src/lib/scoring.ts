/**
 * Kinetic Continuous Per-Session Scoring System
 *
 * Progressive curve: score = base × n + accel × n²
 * Each additional unit is worth MORE than the previous one.
 * Calibrated for: 30yr male, 85kg, 5'10"
 */

// ─── Configuration ───────────────────────────────────────────────────────────

export interface ScoringConfig {
  baseRate: number;
  acceleration: number;
  name: string;
  unit: string;
  emoji: string;
}

// Core activities
export const PUSHUP_CONFIG: ScoringConfig = {
  baseRate: 6.7,
  acceleration: 0.022,
  name: 'Push-ups',
  unit: 'reps',
  emoji: '💪',
};

export const PLANK_CONFIG: ScoringConfig = {
  baseRate: 0.94,
  acceleration: 0.0037,
  name: 'Plank',
  unit: 'sec',
  emoji: '🧘',
};

export const RUN_CONFIG: ScoringConfig = {
  baseRate: 67,
  acceleration: 7.4,
  name: 'Run',
  unit: 'km',
  emoji: '🏃',
};

export const SQUAT_CONFIG: ScoringConfig = {
  baseRate: 4.3,
  acceleration: 0.014,
  name: 'Squats',
  unit: 'reps',
  emoji: '🦵',
};

// Flex — reps-based
export const BURPEE_CONFIG: ScoringConfig = {
  baseRate: 12.7,
  acceleration: 0.133,
  name: 'Burpees',
  unit: 'reps',
  emoji: '🔥',
};

export const PULLUP_CONFIG: ScoringConfig = {
  baseRate: 14.0,
  acceleration: 0.30,
  name: 'Pull-ups',
  unit: 'reps',
  emoji: '🏋️',
};

export const LUNGE_CONFIG: ScoringConfig = {
  baseRate: 5.8,
  acceleration: 0.014,
  name: 'Lunges',
  unit: 'reps',
  emoji: '🦵',
};

export const DEADLIFT_CONFIG: ScoringConfig = {
  baseRate: 7.0,
  acceleration: 0.018,
  name: 'Deadlift',
  unit: 'reps',
  emoji: '🏋️',
};

export const BENCH_CONFIG: ScoringConfig = {
  baseRate: 6.2,
  acceleration: 0.018,
  name: 'Bench Press',
  unit: 'reps',
  emoji: '💪',
};

export const KETTLEBELL_CONFIG: ScoringConfig = {
  baseRate: 4.8,
  acceleration: 0.010,
  name: 'Kettlebell Swing',
  unit: 'reps',
  emoji: '🔔',
};

export const STEPUP_CONFIG: ScoringConfig = {
  baseRate: 4.2,
  acceleration: 0.008,
  name: 'Step-up',
  unit: 'reps',
  emoji: '👟',
};

export const CURL_CONFIG: ScoringConfig = {
  baseRate: 3.5,
  acceleration: 0.006,
  name: 'Dumbbell Curl',
  unit: 'reps',
  emoji: '💪',
};

// Flex — duration-based (value = minutes)
export const SWIM_CONFIG: ScoringConfig = {
  baseRate: 12.0,
  acceleration: 0.18,
  name: 'Swimming',
  unit: 'min',
  emoji: '🏊',
};

export const JUMPROPE_CONFIG: ScoringConfig = {
  baseRate: 9.0,
  acceleration: 0.12,
  name: 'Jump Rope',
  unit: 'min',
  emoji: '⚡',
};

export const ELLIPTICAL_CONFIG: ScoringConfig = {
  baseRate: 8.0,
  acceleration: 0.10,
  name: 'Elliptical',
  unit: 'min',
  emoji: '🚴',
};

export const CYCLING_CONFIG: ScoringConfig = {
  baseRate: 7.0,
  acceleration: 0.08,
  name: 'Cycling',
  unit: 'min',
  emoji: '🚴',
};

export const YOGA_CONFIG: ScoringConfig = {
  baseRate: 5.0,
  acceleration: 0.04,
  name: 'Yoga',
  unit: 'min',
  emoji: '🧘',
};

// ─── Core Scoring Function ───────────────────────────────────────────────────

function continuousScore(value: number, config: ScoringConfig): number {
  if (value <= 0) return 0;
  const score = config.baseRate * value + config.acceleration * (value * value);
  return Math.round(score * 10) / 10;
}

export function calculatePushupScore(reps: number): number {
  return continuousScore(reps, PUSHUP_CONFIG);
}

export function calculatePlankScore(seconds: number): number {
  return continuousScore(seconds, PLANK_CONFIG);
}

/**
 * Run score with optional pace bonus from Whoop or manual duration entry.
 * Reference pace 480 sec/km (8 min/km) = 1.0×; faster pace → up to 1.2× bonus.
 */
export function calculateRunScore(distanceKm: number, durationSeconds = 0): number {
  if (distanceKm <= 0) return 0;
  const base = continuousScore(distanceKm, RUN_CONFIG);
  if (durationSeconds > 0) {
    const paceSecPerKm = durationSeconds / distanceKm;
    const multiplier = Math.min(1.2, Math.max(1.0, 480 / paceSecPerKm));
    return Math.round(base * multiplier * 10) / 10;
  }
  return base;
}

export function calculateSquatScore(reps: number): number {
  return continuousScore(reps, SQUAT_CONFIG);
}

export function calculateFlexScore(value: number, config: ScoringConfig): number {
  return continuousScore(value, config);
}

// ─── Session Score ───────────────────────────────────────────────────────────

export interface SessionScoreBreakdown {
  pushupPts: number;
  plankPts: number;
  runPts: number;
  squatPts: number;
  totalPts: number;
  paceBonusApplied: boolean;
}

export function calculateSessionScore(
  pushupReps: number,
  plankSeconds: number,
  runDistanceKm: number,
  squatReps = 0,
  runDurationSeconds = 0
): SessionScoreBreakdown {
  const pushupPts = calculatePushupScore(pushupReps);
  const plankPts = calculatePlankScore(plankSeconds);
  const runPts = calculateRunScore(runDistanceKm, runDurationSeconds);
  const squatPts = calculateSquatScore(squatReps);
  const paceBonusApplied = runDurationSeconds > 0 && runDistanceKm > 0;

  return {
    pushupPts,
    plankPts,
    runPts,
    squatPts,
    totalPts: Math.round((pushupPts + plankPts + runPts + squatPts) * 10) / 10,
    paceBonusApplied,
  };
}

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
  squat20: calculateSquatScore(20),
  squat50: calculateSquatScore(50),
  squat100: calculateSquatScore(100),
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
      `Push-ups score higher than squats — they demand more at 85kg bodyweight.`,
  },
  {
    question: 'How do plank points work?',
    answer:
      `Every second you hold builds your score. ` +
      `60s = ${examples.plank60} pts, 90s = ${examples.plank90} pts, ` +
      `3 min (180s) = ${examples.plank180} pts. ` +
      `The curve steepens heavily past 2 min — where it truly gets taxing.`,
  },
  {
    question: 'How do run points work?',
    answer:
      `Every distance earns points from the first step. ` +
      `3 km = ${examples.run3} pts, 5 km = ${examples.run5} pts, ` +
      `7 km = ${examples.run7} pts. ` +
      `If run duration is recorded (from Whoop or manual entry), a pace bonus of up to 1.2× applies for faster splits.`,
  },
  {
    question: 'How do squat points work?',
    answer:
      `Every rep counts and each one is worth more than the last. ` +
      `20 reps = ${examples.squat20} pts, 50 reps = ${examples.squat50} pts, ` +
      `100 reps = ${examples.squat100} pts. ` +
      `Squats score slightly less than push-ups — lower body is naturally stronger.`,
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
