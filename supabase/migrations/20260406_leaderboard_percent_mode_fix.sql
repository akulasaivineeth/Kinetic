-- Ensure get_leaderboard supports both raw and percent modes
-- while preserving one-way vs mutual sharing visibility rules.
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
      SELECT p_user_id AS user_id
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
      COALESCE(SUM(wl.pushup_reps + (wl.plank_seconds / 6.0) + (wl.run_distance * 10.0)), 0)::NUMERIC AS total_score
    FROM public.workout_logs wl
    JOIN public.profiles p ON p.id = wl.user_id
    JOIN visible_users vu ON vu.user_id = wl.user_id
    WHERE wl.submitted_at IS NOT NULL
      AND wl.logged_at BETWEEN p_date_from AND p_date_to
    GROUP BY wl.user_id, p.full_name, p.avatar_url
    ORDER BY total_score DESC;
  ELSIF p_mode = 'raw' AND p_metric = 'peak' THEN
    RETURN QUERY
    WITH visible_users AS (
      SELECT p_user_id AS user_id
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
      COALESCE(MAX(wl.pushup_reps + (wl.plank_seconds / 6.0) + (wl.run_distance * 10.0)), 0)::NUMERIC AS total_score
    FROM public.workout_logs wl
    JOIN public.profiles p ON p.id = wl.user_id
    JOIN visible_users vu ON vu.user_id = wl.user_id
    WHERE wl.submitted_at IS NOT NULL
      AND wl.logged_at BETWEEN p_date_from AND p_date_to
    GROUP BY wl.user_id, p.full_name, p.avatar_url
    ORDER BY total_score DESC;
  ELSE
    RETURN QUERY
    WITH visible_users AS (
      SELECT p_user_id AS user_id
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
        CASE WHEN p_metric = 'volume' THEN COALESCE(SUM(wl.pushup_reps), 0)::NUMERIC ELSE COALESCE(MAX(wl.pushup_reps), 0)::NUMERIC END AS pushups,
        CASE WHEN p_metric = 'volume' THEN COALESCE(SUM(wl.plank_seconds), 0)::NUMERIC ELSE COALESCE(MAX(wl.plank_seconds), 0)::NUMERIC END AS planks,
        CASE WHEN p_metric = 'volume' THEN COALESCE(SUM(wl.run_distance), 0)::NUMERIC ELSE COALESCE(MAX(wl.run_distance), 0)::NUMERIC END AS runs
      FROM public.workout_logs wl
      JOIN visible_users vu ON vu.user_id = wl.user_id
      WHERE wl.submitted_at IS NOT NULL
        AND wl.logged_at BETWEEN p_date_from AND p_date_to
      GROUP BY wl.user_id
    ),
    prev_period AS (
      SELECT
        wl.user_id,
        CASE WHEN p_metric = 'volume' THEN COALESCE(SUM(wl.pushup_reps), 0)::NUMERIC ELSE COALESCE(MAX(wl.pushup_reps), 0)::NUMERIC END AS pushups,
        CASE WHEN p_metric = 'volume' THEN COALESCE(SUM(wl.plank_seconds), 0)::NUMERIC ELSE COALESCE(MAX(wl.plank_seconds), 0)::NUMERIC END AS planks,
        CASE WHEN p_metric = 'volume' THEN COALESCE(SUM(wl.run_distance), 0)::NUMERIC ELSE COALESCE(MAX(wl.run_distance), 0)::NUMERIC END AS runs
      FROM public.workout_logs wl
      JOIN visible_users vu ON vu.user_id = wl.user_id
      WHERE wl.submitted_at IS NOT NULL
        AND wl.logged_at >= (p_date_from - (p_date_to - p_date_from))
        AND wl.logged_at < p_date_from
      GROUP BY wl.user_id
    )
    SELECT
      c.user_id,
      p.full_name,
      p.avatar_url,
      CASE WHEN COALESCE(pr.pushups, 0) > 0 THEN ((c.pushups - pr.pushups) / pr.pushups) * 100 ELSE 0 END AS pushup_value,
      CASE WHEN COALESCE(pr.planks, 0) > 0 THEN ((c.planks - pr.planks) / pr.planks) * 100 ELSE 0 END AS plank_value,
      CASE WHEN COALESCE(pr.runs, 0) > 0 THEN ((c.runs - pr.runs) / pr.runs) * 100 ELSE 0 END AS run_value,
      (
        (
          CASE WHEN COALESCE(pr.pushups, 0) > 0 THEN ((c.pushups - pr.pushups) / pr.pushups) * 100 ELSE 0 END
          + CASE WHEN COALESCE(pr.planks, 0) > 0 THEN ((c.planks - pr.planks) / pr.planks) * 100 ELSE 0 END
          + CASE WHEN COALESCE(pr.runs, 0) > 0 THEN ((c.runs - pr.runs) / pr.runs) * 100 ELSE 0 END
        ) / 3.0
      )::NUMERIC AS total_score
    FROM current_period c
    JOIN public.profiles p ON p.id = c.user_id
    LEFT JOIN prev_period pr ON pr.user_id = c.user_id
    ORDER BY total_score DESC;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
