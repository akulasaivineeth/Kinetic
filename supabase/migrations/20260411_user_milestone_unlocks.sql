-- Persist milestone unlocks (earned at moment) + optional backfill from lifetime submitted logs.

CREATE TABLE public.user_milestone_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  milestone_key TEXT NOT NULL,
  label TEXT NOT NULL,
  emoji TEXT NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, milestone_key)
);

CREATE INDEX idx_user_milestone_unlocks_user_earned
  ON public.user_milestone_unlocks (user_id, earned_at DESC);

ALTER TABLE public.user_milestone_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own milestone unlocks"
  ON public.user_milestone_unlocks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own milestone unlocks"
  ON public.user_milestone_unlocks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_milestone_unlocks;

-- Backfill already-qualified users (lifetime submitted logs only).
WITH agg AS (
  SELECT
    user_id,
    COALESCE(SUM(pushup_reps), 0)::bigint AS pushups,
    COALESCE(SUM(plank_seconds), 0)::bigint AS plank_sec,
    COALESCE(SUM(run_distance), 0)::double precision AS run_km
  FROM public.workout_logs
  WHERE submitted_at IS NOT NULL
  GROUP BY user_id
)
INSERT INTO public.user_milestone_unlocks (user_id, milestone_key, label, emoji, earned_at)
SELECT a.user_id, t.milestone_key, t.label, t.emoji, NOW()
FROM agg a
CROSS JOIN LATERAL (
  VALUES
    ('pushups_1000', '1K PUSH-UPS', '💪', a.pushups >= 1000),
    ('pushups_5000', '5K PUSH-UPS', '🔥', a.pushups >= 5000),
    ('pushups_10000', '10K PUSH-UPS', '⚡', a.pushups >= 10000),
    ('pushups_25000', '25K PUSH-UPS', '🏆', a.pushups >= 25000),
    ('pushups_50000', '50K PUSH-UPS', '👑', a.pushups >= 50000),
    ('plank_3600', '1 HOUR PLANK', '🧘', a.plank_sec >= 3600),
    ('plank_18000', '5 HOURS PLANK', '🔥', a.plank_sec >= 18000),
    ('plank_36000', '10 HOURS PLANK', '⚡', a.plank_sec >= 36000),
    ('run_50', '50 KM RUN', '🏃', a.run_km >= 50),
    ('run_100', '100 KM RUN', '🔥', a.run_km >= 100),
    ('run_500', '500 KM RUN', '⚡', a.run_km >= 500),
    ('run_1000', '1000 KM RUN', '🏆', a.run_km >= 1000)
) AS t(milestone_key, label, emoji, ok)
WHERE t.ok
ON CONFLICT (user_id, milestone_key) DO NOTHING;
