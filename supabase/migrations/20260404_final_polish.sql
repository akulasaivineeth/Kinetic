-- Final Kinetic Production Polish Migration
-- Refines sharing handshake (One-Way Accept vs Mutual Share)
-- Adds unit_preference to profiles

-- 1. Ensure unit_preference column exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS unit_preference TEXT NOT NULL DEFAULT 'metric' 
CHECK (unit_preference IN ('metric', 'imperial'));

-- 2. Update the sharing response logic (SQL) if needed
-- (The is_mutual flag is already in the table, we just refine the view function)

-- 3. Refine get_leaderboard to support one-way vs mutual
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
  IF p_metric = 'volume' AND p_mode = 'raw' THEN
    RETURN QUERY
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
    WHERE wl.submitted_at IS NOT NULL
      AND wl.logged_at BETWEEN p_date_from AND p_date_to
      AND (
        wl.user_id = p_user_id
        OR wl.user_id IN (
          -- People I requested AND they accepted (I see them)
          SELECT recipient_id FROM public.sharing_connections
          WHERE requester_id = p_user_id AND status = 'accepted'
          UNION
          -- People who requested me AND I accepted mutual (I see them)
          SELECT requester_id FROM public.sharing_connections
          WHERE recipient_id = p_user_id AND status = 'accepted' AND is_mutual = true
        )
      )
    GROUP BY wl.user_id, p.full_name, p.avatar_url
    ORDER BY total_score DESC;
  ELSIF p_metric = 'peak' AND p_mode = 'raw' THEN
    RETURN QUERY
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
    WHERE wl.submitted_at IS NOT NULL
      AND wl.logged_at BETWEEN p_date_from AND p_date_to
      AND (
        wl.user_id = p_user_id
        OR wl.user_id IN (
          SELECT recipient_id FROM public.sharing_connections
          WHERE requester_id = p_user_id AND status = 'accepted'
          UNION
          SELECT requester_id FROM public.sharing_connections
          WHERE recipient_id = p_user_id AND status = 'accepted' AND is_mutual = true
        )
      )
    GROUP BY wl.user_id, p.full_name, p.avatar_url
    ORDER BY total_score DESC;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Initial admin trigger is already in place as verified.
