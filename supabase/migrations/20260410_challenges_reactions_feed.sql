-- Challenges table
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  metric TEXT NOT NULL CHECK (metric IN ('pushups', 'plank', 'run', 'all')),
  target_value NUMERIC NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

-- Workout reactions (Kudos)
CREATE TABLE IF NOT EXISTS public.workout_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_log_id UUID REFERENCES public.workout_logs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  reaction TEXT NOT NULL DEFAULT '🔥',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workout_log_id, user_id)
);

-- Activity feed view
CREATE OR REPLACE VIEW public.activity_feed AS
SELECT
  wl.id AS event_id,
  'workout' AS event_type,
  wl.user_id,
  p.full_name,
  p.avatar_url,
  wl.logged_at AS event_at,
  jsonb_build_object(
    'pushup_reps', wl.pushup_reps,
    'plank_seconds', wl.plank_seconds,
    'run_distance', wl.run_distance
  ) AS event_data,
  (SELECT COUNT(*) FROM public.workout_reactions wr WHERE wr.workout_log_id = wl.id) AS reaction_count
FROM public.workout_logs wl
JOIN public.profiles p ON p.id = wl.user_id
WHERE wl.submitted_at IS NOT NULL
ORDER BY wl.logged_at DESC;

-- RLS policies for new tables
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view challenges" ON public.challenges FOR SELECT USING (true);
CREATE POLICY "Admin creates challenges" ON public.challenges FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Users can view challenge participants" ON public.challenge_participants FOR SELECT USING (true);
CREATE POLICY "Users can join challenges" ON public.challenge_participants FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can leave challenges" ON public.challenge_participants FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Users can view reactions" ON public.workout_reactions FOR SELECT USING (true);
CREATE POLICY "Users can react" ON public.workout_reactions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can remove own reaction" ON public.workout_reactions FOR DELETE USING (user_id = auth.uid());

-- Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.workout_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenges;
