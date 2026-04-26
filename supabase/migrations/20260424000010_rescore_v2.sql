-- ============================================================
-- Kinetic Scoring Recalibration v2
-- Calibrated for 30yr male, 85kg, 5'10"
-- Push-ups > Squats. Run rewards 40-min effort. Plank nudged up.
-- Adds activity_types + activity_logs tables for flex exercises.
-- ============================================================

-- 1. Update calc_exercise_score with new params
CREATE OR REPLACE FUNCTION public.calc_exercise_score(
  p_type TEXT,
  p_value NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
  base_rate NUMERIC;
  acceleration NUMERIC;
BEGIN
  IF p_value <= 0 THEN RETURN 0; END IF;

  CASE p_type
    WHEN 'pushups' THEN
      base_rate := 6.7; acceleration := 0.022;
    WHEN 'squats' THEN
      base_rate := 4.3; acceleration := 0.014;
    WHEN 'plank' THEN
      base_rate := 0.94; acceleration := 0.0037;
    WHEN 'run' THEN
      base_rate := 67.0; acceleration := 7.4;
    ELSE RETURN 0;
  END CASE;

  RETURN ROUND(base_rate * p_value + acceleration * (p_value * p_value), 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Update calc_session_score to support run_duration / pace bonus
CREATE OR REPLACE FUNCTION public.calc_session_score(
  p_pushup_reps INTEGER DEFAULT 0,
  p_plank_seconds INTEGER DEFAULT 0,
  p_run_km NUMERIC DEFAULT 0,
  p_squat_reps INTEGER DEFAULT 0,
  p_run_duration INTEGER DEFAULT 0
) RETURNS NUMERIC AS $$
DECLARE
  n NUMERIC;
  pushup_pts NUMERIC := 0;
  plank_pts NUMERIC := 0;
  run_pts NUMERIC := 0;
  squat_pts NUMERIC := 0;
  pace_multiplier NUMERIC := 1.0;
BEGIN
  -- Push-ups
  n := GREATEST(COALESCE(p_pushup_reps, 0), 0);
  IF n > 0 THEN pushup_pts := ROUND(6.7 * n + 0.022 * n * n, 1); END IF;

  -- Plank
  n := GREATEST(COALESCE(p_plank_seconds, 0), 0);
  IF n > 0 THEN plank_pts := ROUND(0.94 * n + 0.0037 * n * n, 1); END IF;

  -- Run with pace bonus
  n := GREATEST(COALESCE(p_run_km, 0), 0);
  IF n > 0 THEN
    run_pts := ROUND(67.0 * n + 7.4 * n * n, 1);
    IF p_run_duration > 0 THEN
      pace_multiplier := LEAST(1.2, GREATEST(1.0, 480.0 / (p_run_duration::NUMERIC / n)));
      run_pts := ROUND(run_pts * pace_multiplier, 1);
    END IF;
  END IF;

  -- Squats
  n := GREATEST(COALESCE(p_squat_reps, 0), 0);
  IF n > 0 THEN squat_pts := ROUND(4.3 * n + 0.014 * n * n, 1); END IF;

  RETURN ROUND(pushup_pts + plank_pts + run_pts + squat_pts, 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. activity_types table
CREATE TABLE IF NOT EXISTS public.activity_types (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '💪',
  base_rate NUMERIC NOT NULL,
  acceleration NUMERIC NOT NULL,
  value_column TEXT,
  is_core BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.activity_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_types_public_read" ON public.activity_types FOR SELECT USING (true);

-- 4. activity_logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type_id INTEGER NOT NULL REFERENCES public.activity_types(id),
  value NUMERIC NOT NULL DEFAULT 0,
  score NUMERIC NOT NULL DEFAULT 0,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_logs_owner" ON public.activity_logs FOR ALL USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON public.activity_logs(user_id, logged_at DESC);

-- 5. Seed activity_types
INSERT INTO public.activity_types (slug, name, unit, emoji, base_rate, acceleration, value_column, is_core)
VALUES
  -- Core (linked to workout_logs columns)
  ('pushups',   'Push-ups',        'reps', '💪', 6.7,   0.022,  'pushup_reps',   TRUE),
  ('squats',    'Squats',          'reps', '🦵', 4.3,   0.014,  'squat_reps',    TRUE),
  ('plank',     'Plank',           'sec',  '🧘', 0.94,  0.0037, 'plank_seconds', TRUE),
  ('run',       'Run',             'km',   '🏃', 67.0,  7.4,    'run_distance',  TRUE),

  -- Flex — reps
  ('burpee',    'Burpees',         'reps', '🔥', 12.7,  0.133,  NULL, FALSE),
  ('pullup',    'Pull-ups',        'reps', '🏋️', 14.0,  0.30,   NULL, FALSE),
  ('lunge',     'Lunges',          'reps', '🦵', 5.8,   0.014,  NULL, FALSE),
  ('deadlift',  'Deadlift',        'reps', '🏋️', 7.0,   0.018,  NULL, FALSE),
  ('bench',     'Bench Press',     'reps', '💪', 6.2,   0.018,  NULL, FALSE),
  ('kettlebell','Kettlebell Swing', 'reps', '🔔', 4.8,  0.010,  NULL, FALSE),
  ('stepup',    'Step-up',         'reps', '👟', 4.2,   0.008,  NULL, FALSE),
  ('curl',      'Dumbbell Curl',   'reps', '💪', 3.5,   0.006,  NULL, FALSE),

  -- Flex — duration (minutes)
  ('swim',       'Swimming',    'min', '🏊', 12.0, 0.18,  NULL, FALSE),
  ('jumprope',   'Jump Rope',   'min', '⚡', 9.0,  0.12,  NULL, FALSE),
  ('elliptical', 'Elliptical',  'min', '🚴', 8.0,  0.10,  NULL, FALSE),
  ('cycling',    'Cycling',     'min', '🚴', 7.0,  0.08,  NULL, FALSE),
  ('yoga',       'Yoga',        'min', '🧘', 5.0,  0.04,  NULL, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  name         = EXCLUDED.name,
  unit         = EXCLUDED.unit,
  emoji        = EXCLUDED.emoji,
  base_rate    = EXCLUDED.base_rate,
  acceleration = EXCLUDED.acceleration,
  value_column = EXCLUDED.value_column,
  is_core      = EXCLUDED.is_core;

-- 6. log_activity RPC
CREATE OR REPLACE FUNCTION public.log_activity(
  p_user_id UUID,
  p_slug TEXT,
  p_value NUMERIC,
  p_logged_at TIMESTAMPTZ DEFAULT NOW()
) RETURNS UUID AS $$
DECLARE
  v_type public.activity_types;
  v_score NUMERIC;
  v_id UUID;
BEGIN
  SELECT * INTO v_type FROM public.activity_types WHERE slug = p_slug;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown activity slug: %', p_slug; END IF;

  v_score := ROUND(v_type.base_rate * p_value + v_type.acceleration * p_value * p_value, 1);

  INSERT INTO public.activity_logs (user_id, activity_type_id, value, score, logged_at, submitted_at)
  VALUES (p_user_id, v_type.id, p_value, v_score, p_logged_at, p_logged_at)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Backfill: touch all submitted logs to retrigger tr_calculate_workout_score
UPDATE public.workout_logs
SET updated_at = NOW()
WHERE submitted_at IS NOT NULL;
