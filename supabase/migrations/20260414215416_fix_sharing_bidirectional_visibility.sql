-- ============================================================
-- FIX: Enforce Bidirectional Visibility for all 'accepted' sharing connections
-- Removes the `AND is_mutual = true` restriction so sharing is instantly 2-way
-- for both the requester and the recipient without requiring a mutual opt-in loop.
-- ============================================================

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
      WHERE recipient_id = p_user_id AND status = 'accepted'
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
      WHERE recipient_id = p_user_id AND status = 'accepted'
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
      WHERE recipient_id = p_user_id AND status = 'accepted'
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
