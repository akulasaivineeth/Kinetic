-- ============================================================
-- KINETIC: Add Squats + Update Scoring Base Rates
-- Push-ups: 2.0 + 0.04n², Plank: 0.55 + 0.0025n²
-- Run: 36 + 7.2n², Squats: 2.0 + 0.04n²
-- ============================================================

-- 1. Add squat_reps column to workout_logs
ALTER TABLE public.workout_logs
  ADD COLUMN IF NOT EXISTS squat_reps INTEGER DEFAULT 0;

-- 2. Add squat goals to performance_goals
ALTER TABLE public.performance_goals
  ADD COLUMN IF NOT EXISTS squat_weekly_goal INTEGER DEFAULT 300,
  ADD COLUMN IF NOT EXISTS squat_peak_goal INTEGER DEFAULT 50;

-- 3. Update calc_session_score with new base rates + squats
CREATE OR REPLACE FUNCTION public.calc_session_score(
  p_pushup_reps INTEGER,
  p_plank_seconds INTEGER,
  p_run_distance NUMERIC,
  p_squat_reps INTEGER DEFAULT 0
) RETURNS NUMERIC AS $$
DECLARE
  score NUMERIC := 0;
  n NUMERIC;
BEGIN
  -- Push-up score: 2.0 × reps + 0.04 × reps²
  n := GREATEST(COALESCE(p_pushup_reps, 0), 0);
  IF n > 0 THEN
    score := score + 2.0 * n + 0.04 * (n * n);
  END IF;

  -- Plank score: 0.55 × seconds + 0.0025 × seconds²
  n := GREATEST(COALESCE(p_plank_seconds, 0), 0);
  IF n > 0 THEN
    score := score + 0.55 * n + 0.0025 * (n * n);
  END IF;

  -- Run score: 36 × km + 7.2 × km²
  n := GREATEST(COALESCE(p_run_distance, 0), 0);
  IF n > 0 THEN
    score := score + 36.0 * n + 7.2 * (n * n);
  END IF;

  -- Squat score: 2.0 × reps + 0.04 × reps²
  n := GREATEST(COALESCE(p_squat_reps, 0), 0);
  IF n > 0 THEN
    score := score + 2.0 * n + 0.04 * (n * n);
  END IF;

  RETURN ROUND(score, 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4. Backfill ALL existing submitted logs with new scoring formula
UPDATE public.workout_logs
SET session_score = public.calc_session_score(pushup_reps, plank_seconds, run_distance, squat_reps)
WHERE submitted_at IS NOT NULL;

-- 5. Update get_weekly_volume to include squats (must drop first — return type changed)
DROP FUNCTION IF EXISTS public.get_weekly_volume(UUID, TIMESTAMPTZ);
CREATE OR REPLACE FUNCTION public.get_weekly_volume(
  p_user_id UUID,
  p_week_start TIMESTAMPTZ DEFAULT date_trunc('week', NOW())
)
RETURNS TABLE(
  total_pushups BIGINT,
  total_plank_seconds BIGINT,
  total_run_distance NUMERIC,
  total_squats BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(pushup_reps), 0)::BIGINT,
    COALESCE(SUM(plank_seconds), 0)::BIGINT,
    COALESCE(SUM(run_distance), 0)::NUMERIC,
    COALESCE(SUM(squat_reps), 0)::BIGINT
  FROM public.workout_logs
  WHERE user_id = p_user_id
    AND submitted_at IS NOT NULL
    AND logged_at >= p_week_start
    AND logged_at < p_week_start + INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Update get_leaderboard to include squat_value (must drop first — return type changed)
DROP FUNCTION IF EXISTS public.get_leaderboard(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.get_leaderboard(
  p_user_id UUID,
  p_date_from TIMESTAMP WITH TIME ZONE,
  p_date_to TIMESTAMP WITH TIME ZONE,
  p_metric TEXT DEFAULT 'volume',
  p_mode TEXT DEFAULT 'raw'
)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  pushup_value NUMERIC,
  plank_value NUMERIC,
  run_value NUMERIC,
  squat_value NUMERIC,
  total_score NUMERIC
) AS $$
BEGIN
  IF p_mode = 'raw' AND p_metric = 'volume' THEN
    RETURN QUERY
    WITH visible_users AS (
      SELECT p_user_id AS uid
      UNION
      SELECT recipient_id
      FROM public.sharing_connections
      WHERE requester_id = p_user_id AND status = 'accepted'
      UNION
      SELECT requester_id
      FROM public.sharing_connections
      WHERE recipient_id = p_user_id AND status = 'accepted' AND is_mutual = true
    )
    SELECT
      wl.user_id,
      p.full_name,
      p.avatar_url,
      COALESCE(SUM(wl.pushup_reps), 0)::NUMERIC AS pushup_value,
      COALESCE(SUM(wl.plank_seconds), 0)::NUMERIC AS plank_value,
      COALESCE(SUM(wl.run_distance), 0)::NUMERIC AS run_value,
      COALESCE(SUM(wl.squat_reps), 0)::NUMERIC AS squat_value,
      COALESCE(SUM(wl.session_score), 0)::NUMERIC AS total_score
    FROM public.workout_logs wl
    JOIN public.profiles p ON p.id = wl.user_id
    JOIN visible_users vu ON vu.uid = wl.user_id
    WHERE wl.submitted_at IS NOT NULL
      AND wl.logged_at BETWEEN p_date_from AND p_date_to
    GROUP BY wl.user_id, p.full_name, p.avatar_url
    ORDER BY total_score DESC;

  ELSIF p_mode = 'raw' AND p_metric = 'peak' THEN
    RETURN QUERY
    WITH visible_users AS (
      SELECT p_user_id AS uid
      UNION
      SELECT recipient_id
      FROM public.sharing_connections
      WHERE requester_id = p_user_id AND status = 'accepted'
      UNION
      SELECT requester_id
      FROM public.sharing_connections
      WHERE recipient_id = p_user_id AND status = 'accepted' AND is_mutual = true
    )
    SELECT
      wl.user_id,
      p.full_name,
      p.avatar_url,
      COALESCE(MAX(wl.pushup_reps), 0)::NUMERIC AS pushup_value,
      COALESCE(MAX(wl.plank_seconds), 0)::NUMERIC AS plank_value,
      COALESCE(MAX(wl.run_distance), 0)::NUMERIC AS run_value,
      COALESCE(MAX(wl.squat_reps), 0)::NUMERIC AS squat_value,
      COALESCE(MAX(wl.session_score), 0)::NUMERIC AS total_score
    FROM public.workout_logs wl
    JOIN public.profiles p ON p.id = wl.user_id
    JOIN visible_users vu ON vu.uid = wl.user_id
    WHERE wl.submitted_at IS NOT NULL
      AND wl.logged_at BETWEEN p_date_from AND p_date_to
    GROUP BY wl.user_id, p.full_name, p.avatar_url
    ORDER BY total_score DESC;

  ELSE
    -- Percent mode: compare session score totals between periods
    RETURN QUERY
    WITH visible_users AS (
      SELECT p_user_id AS uid
      UNION
      SELECT recipient_id
      FROM public.sharing_connections
      WHERE requester_id = p_user_id AND status = 'accepted'
      UNION
      SELECT requester_id
      FROM public.sharing_connections
      WHERE recipient_id = p_user_id AND status = 'accepted' AND is_mutual = true
    ),
    current_period AS (
      SELECT
        wl.user_id,
        COALESCE(SUM(wl.session_score), 0)::NUMERIC AS cur_score
      FROM public.workout_logs wl
      JOIN visible_users vu ON vu.uid = wl.user_id
      WHERE wl.submitted_at IS NOT NULL
        AND wl.logged_at BETWEEN p_date_from AND p_date_to
      GROUP BY wl.user_id
    ),
    prev_period AS (
      SELECT
        wl.user_id,
        COALESCE(SUM(wl.session_score), 0)::NUMERIC AS prev_score
      FROM public.workout_logs wl
      JOIN visible_users vu ON vu.uid = wl.user_id
      WHERE wl.submitted_at IS NOT NULL
        AND wl.logged_at >= (p_date_from - (p_date_to - p_date_from))
        AND wl.logged_at < p_date_from
      GROUP BY wl.user_id
    )
    SELECT
      c.user_id,
      p.full_name,
      p.avatar_url,
      0::NUMERIC AS pushup_value,
      0::NUMERIC AS plank_value,
      0::NUMERIC AS run_value,
      0::NUMERIC AS squat_value,
      CASE WHEN COALESCE(pr.prev_score, 0) > 0
        THEN ((c.cur_score - pr.prev_score) / pr.prev_score * 100)
        ELSE CASE WHEN c.cur_score > 0 THEN 100 ELSE 0 END
      END::NUMERIC AS total_score
    FROM current_period c
    JOIN public.profiles p ON p.id = c.user_id
    LEFT JOIN prev_period pr ON pr.user_id = c.user_id
    ORDER BY total_score DESC;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
