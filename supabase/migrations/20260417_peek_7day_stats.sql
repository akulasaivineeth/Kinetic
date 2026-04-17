-- Rolling 7-day per-day stats for peek card (respects sharing permissions)
DROP FUNCTION IF EXISTS public.get_user_7day_stats(UUID, UUID);

CREATE OR REPLACE FUNCTION public.get_user_7day_daily(
  p_viewer_id UUID,
  p_target_user_id UUID
) RETURNS TABLE (
  day_date DATE,
  pushup_total BIGINT,
  squat_total BIGINT,
  plank_total BIGINT,
  run_total NUMERIC,
  day_score NUMERIC
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
      COALESCE(SUM(wl.session_score), 0)::NUMERIC
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
