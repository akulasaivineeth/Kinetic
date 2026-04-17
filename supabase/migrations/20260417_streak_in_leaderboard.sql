-- Add streak calculation to leaderboard (server-side, for all visible users)

-- Helper: calculate streak for any user
CREATE OR REPLACE FUNCTION public.calc_user_streak(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  wk_start DATE;
  wk_count INTEGER;
  streak INTEGER := 0;
BEGIN
  wk_start := date_trunc('week', CURRENT_DATE)::DATE;  -- Monday of current week

  LOOP
    SELECT COUNT(*) INTO wk_count
    FROM public.workout_logs
    WHERE user_id = p_user_id
      AND submitted_at IS NOT NULL
      AND logged_at >= wk_start
      AND logged_at < wk_start + 7;

    IF wk_count >= 4 THEN
      streak := streak + 1;
      wk_start := wk_start - 7;
    ELSE
      EXIT;
    END IF;
  END LOOP;

  RETURN streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate get_leaderboard with streak column
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
  total_score NUMERIC,
  streak INTEGER
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
      COALESCE(SUM(wl.session_score), 0)::NUMERIC AS total_score,
      public.calc_user_streak(wl.user_id) AS streak
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
      COALESCE(MAX(wl.session_score), 0)::NUMERIC AS total_score,
      public.calc_user_streak(wl.user_id) AS streak
    FROM public.workout_logs wl
    JOIN public.profiles p ON p.id = wl.user_id
    JOIN visible_users vu ON vu.uid = wl.user_id
    WHERE wl.submitted_at IS NOT NULL
      AND wl.logged_at BETWEEN p_date_from AND p_date_to
    GROUP BY wl.user_id, p.full_name, p.avatar_url
    ORDER BY total_score DESC;

  ELSE
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
      END::NUMERIC AS total_score,
      public.calc_user_streak(c.user_id) AS streak
    FROM current_period c
    JOIN public.profiles p ON p.id = c.user_id
    LEFT JOIN prev_period pr ON pr.user_id = c.user_id
    ORDER BY total_score DESC;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
