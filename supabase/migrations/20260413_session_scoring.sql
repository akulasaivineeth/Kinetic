-- ============================================================
-- KINETIC: Continuous Per-Session Scoring
-- score = base × n + acceleration × n²
-- Every rep/sec/km matters, each worth more than the last
-- ============================================================

-- 1. Add session_score column (idempotent)
ALTER TABLE public.workout_logs
  ADD COLUMN IF NOT EXISTS session_score NUMERIC DEFAULT 0;

-- 2. Create continuous scoring function
-- Push-ups: base=1.5/rep, accel=0.08
-- Plank:    base=0.3/sec, accel=0.002
-- Run:      base=12/km,   accel=2.5
CREATE OR REPLACE FUNCTION public.calc_session_score(
  p_pushup_reps INTEGER,
  p_plank_seconds INTEGER,
  p_run_distance NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
  score NUMERIC := 0;
  n NUMERIC;
BEGIN
  -- Push-up score: 1.5 × reps + 0.08 × reps²
  n := GREATEST(COALESCE(p_pushup_reps, 0), 0);
  IF n > 0 THEN
    score := score + 1.5 * n + 0.08 * (n * n);
  END IF;

  -- Plank score: 0.3 × seconds + 0.002 × seconds²
  n := GREATEST(COALESCE(p_plank_seconds, 0), 0);
  IF n > 0 THEN
    score := score + 0.3 * n + 0.002 * (n * n);
  END IF;

  -- Run score: 12 × km + 2.5 × km²
  n := GREATEST(COALESCE(p_run_distance, 0), 0);
  IF n > 0 THEN
    score := score + 12.0 * n + 2.5 * (n * n);
  END IF;

  RETURN ROUND(score, 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Backfill existing submitted logs
UPDATE public.workout_logs
SET session_score = public.calc_session_score(pushup_reps, plank_seconds, run_distance)
WHERE submitted_at IS NOT NULL AND (session_score = 0 OR session_score IS NULL);

-- 4. Rewrite get_leaderboard RPC to use session_score
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
