-- 1. Add category-specific score columns to workout_logs
ALTER TABLE public.workout_logs
  ADD COLUMN IF NOT EXISTS pushup_score NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS squat_score NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plank_score NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS run_score NUMERIC DEFAULT 0;

-- 2. Create the unified scoring formula function for individual categories (Internal Helper)
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
      base_rate := 2.6; acceleration := 0.052;
    WHEN 'squats' THEN 
      base_rate := 2.6; acceleration := 0.052;
    WHEN 'plank' THEN 
      base_rate := 0.8; acceleration := 0.003;
    WHEN 'run' THEN 
      base_rate := 36.0; acceleration := 7.2;
    ELSE RETURN 0;
  END CASE;

  RETURN ROUND(base_rate * p_value + acceleration * (p_value * p_value), 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Trigger function to auto-calculate all scores on save (Ensures 100% accuracy)
CREATE OR REPLACE FUNCTION public.handle_workout_score_calculation()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate individual scores
  NEW.pushup_score := public.calc_exercise_score('pushups', NEW.pushup_reps);
  NEW.squat_score := public.calc_exercise_score('squats', NEW.squat_reps);
  NEW.plank_score := public.calc_exercise_score('plank', NEW.plank_seconds);
  NEW.run_score := public.calc_exercise_score('run', NEW.run_distance);
  
  -- Calculate total session score
  NEW.session_score := NEW.pushup_score + NEW.squat_score + NEW.plank_score + NEW.run_score;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_calculate_workout_score ON public.workout_logs;
CREATE TRIGGER tr_calculate_workout_score
  BEFORE INSERT OR UPDATE OF pushup_reps, squat_reps, plank_seconds, run_distance
  ON public.workout_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_workout_score_calculation();

-- 4. Backfill existing logs so history is consistent
UPDATE public.workout_logs
SET updated_at = NOW()
WHERE submitted_at IS NOT NULL;

-- 5. Update the Peek Card RPC to return the accurate sums
DROP FUNCTION IF EXISTS public.get_user_7day_daily(UUID, UUID);
CREATE OR REPLACE FUNCTION public.get_user_7day_daily(
  p_viewer_id UUID,
  p_target_user_id UUID
) RETURNS TABLE (
  day_date DATE,
  pushup_total BIGINT,
  squat_total BIGINT,
  plank_total BIGINT,
  run_total NUMERIC,
  day_score NUMERIC,
  pushup_pts NUMERIC,
  squat_pts NUMERIC,
  plank_pts NUMERIC,
  run_pts NUMERIC
) AS $$
BEGIN
  IF p_viewer_id = p_target_user_id
     OR EXISTS (
       SELECT 1 FROM public.sharing_connections
       WHERE (requester_id = p_viewer_id AND recipient_id = p_target_user_id AND status = 'accepted')
          OR (recipient_id = p_viewer_id AND requester_id = p_target_user_id AND status = 'accepted' AND is_mutual = true)
     )
  THEN
    RETURN QUERY
    SELECT d::DATE AS day_date,
      COALESCE(SUM(wl.pushup_reps), 0)::BIGINT,
      COALESCE(SUM(wl.squat_reps), 0)::BIGINT,
      COALESCE(SUM(wl.plank_seconds), 0)::BIGINT,
      COALESCE(SUM(wl.run_distance), 0)::NUMERIC,
      COALESCE(SUM(wl.session_score), 0)::NUMERIC,
      COALESCE(SUM(wl.pushup_score), 0)::NUMERIC,
      COALESCE(SUM(wl.squat_score), 0)::NUMERIC,
      COALESCE(SUM(wl.plank_score), 0)::NUMERIC,
      COALESCE(SUM(wl.run_score), 0)::NUMERIC
    FROM generate_series(CURRENT_DATE - 6, CURRENT_DATE, '1 day'::INTERVAL) d
    LEFT JOIN public.workout_logs wl
      ON wl.user_id = p_target_user_id
      AND wl.submitted_at IS NOT NULL
      AND wl.logged_at::DATE = d::DATE
    GROUP BY d::DATE
    ORDER BY d::DATE DESC;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
