-- UAT helper seed:
-- Inserts randomized submitted workout logs from 2026-02-05 until now
-- for two existing profiles (most recently created), while preserving existing data.
-- Safe to re-run: guarded by deterministic note marker per user/day.

DO $$
DECLARE
  seed_start date := DATE '2026-02-05';
  seed_end date := CURRENT_DATE;
BEGIN
  WITH target_users AS (
    SELECT
      id,
      row_number() OVER (ORDER BY created_at DESC) AS user_rank
    FROM public.profiles
    ORDER BY created_at DESC
    LIMIT 2
  ),
  days AS (
    SELECT generate_series(seed_start, seed_end, INTERVAL '1 day')::date AS day
  ),
  rows_to_insert AS (
    SELECT
      gen_random_uuid() AS id,
      u.id AS user_id,
      (d.day + ((6 + floor(random() * 14))::int || ' hours')::interval) AS logged_at,
      CASE
        -- User 1: stronger upper-body, shorter runs
        WHEN u.user_rank = 1 THEN (90 + floor(random() * 180))::int
        -- User 2: moderate upper-body, stronger running
        ELSE (35 + floor(random() * 120))::int
      END AS pushup_reps,
      CASE
        WHEN u.user_rank = 1 THEN (70 + floor(random() * 390))::int
        ELSE (55 + floor(random() * 300))::int
      END AS plank_seconds,
      CASE
        WHEN u.user_rank = 1 THEN ROUND((0.7 + random() * 4.1)::numeric, 2)
        ELSE ROUND((2.2 + random() * 7.0)::numeric, 2)
      END AS run_distance,
      NULL::int AS run_duration,
      NULL::text AS whoop_workout_id,
      NULL::numeric AS whoop_strain,
      NULL::text AS whoop_activity_type,
      NULL::int AS whoop_duration_seconds,
      NULL::text AS photo_url,
      'UAT_SEED_20260408'::text AS notes,
      false AS is_draft,
      (d.day + ((7 + floor(random() * 15))::int || ' hours')::interval) AS submitted_at,
      now() AS created_at,
      now() AS updated_at
    FROM target_users u
    JOIN days d ON true
    -- Keep both users active, but with slightly different training frequency too.
    WHERE random() < CASE WHEN u.user_rank = 1 THEN 0.58 ELSE 0.50 END
  )
  INSERT INTO public.workout_logs (
    id,
    user_id,
    logged_at,
    pushup_reps,
    plank_seconds,
    run_distance,
    run_duration,
    whoop_workout_id,
    whoop_strain,
    whoop_activity_type,
    whoop_duration_seconds,
    photo_url,
    notes,
    is_draft,
    submitted_at,
    created_at,
    updated_at
  )
  SELECT r.*
  FROM rows_to_insert r
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.workout_logs w
    WHERE w.user_id = r.user_id
      AND w.notes = 'UAT_SEED_20260408'
      AND date(w.logged_at) = date(r.logged_at)
  );
END $$;

