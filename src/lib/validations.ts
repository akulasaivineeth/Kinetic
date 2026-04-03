import { z } from 'zod';

export const workoutLogSchema = z.object({
  pushup_reps: z.number().min(0).max(10000).default(0),
  plank_seconds: z.number().min(0).max(36000).default(0),
  run_distance: z.number().min(0).max(1000).default(0),
  run_duration: z.number().min(0).max(360000).default(0),
  notes: z.string().max(500).optional(),
  photo_url: z.string().url().optional().nullable(),
});

export const performanceGoalsSchema = z.object({
  pushup_weekly_goal: z.number().min(1).max(100000).default(500),
  plank_weekly_goal: z.number().min(1).max(100000).default(600),
  run_weekly_goal: z.number().min(0.1).max(10000).default(15),
  pushup_peak_goal: z.number().min(1).max(10000).default(75),
  plank_peak_goal: z.number().min(1).max(36000).default(180),
  run_peak_goal: z.number().min(0.1).max(1000).default(3),
});

export const sharingRequestSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export type WorkoutLogInput = z.infer<typeof workoutLogSchema>;
export type PerformanceGoalsInput = z.infer<typeof performanceGoalsSchema>;
