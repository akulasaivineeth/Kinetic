-- ============================================================
-- KINETIC: Complete Supabase Schema
-- ============================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  theme TEXT DEFAULT 'dark' CHECK (theme IN ('dark', 'light')),
  whoop_access_token TEXT,
  whoop_refresh_token TEXT,
  whoop_user_id TEXT,
  push_subscription JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-set first user as admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  INSERT INTO public.profiles (id, email, full_name, avatar_url, is_admin)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
    user_count = 0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- INVITE LINKS
-- ============================================================
CREATE TABLE public.invite_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  used_by UUID REFERENCES public.profiles(id),
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PERFORMANCE GOALS
-- ============================================================
CREATE TABLE public.performance_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  pushup_weekly_goal INTEGER DEFAULT 500,
  plank_weekly_goal INTEGER DEFAULT 600, -- seconds
  run_weekly_goal NUMERIC(5,2) DEFAULT 15.0, -- miles
  pushup_peak_goal INTEGER DEFAULT 75,
  plank_peak_goal INTEGER DEFAULT 180, -- seconds
  run_peak_goal NUMERIC(5,2) DEFAULT 3.0, -- miles per run
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================================
-- WORKOUT LOGS
-- ============================================================
CREATE TABLE public.workout_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  logged_at TIMESTAMPTZ DEFAULT NOW(),

  -- Push-ups
  pushup_reps INTEGER DEFAULT 0,

  -- Plank
  plank_seconds INTEGER DEFAULT 0,

  -- Run
  run_distance NUMERIC(5,2) DEFAULT 0, -- miles
  run_duration INTEGER DEFAULT 0, -- seconds

  -- Whoop data
  whoop_workout_id TEXT,
  whoop_strain NUMERIC(4,1),
  whoop_activity_type TEXT,
  whoop_duration_seconds INTEGER,

  -- Media
  photo_url TEXT,
  notes TEXT,

  -- Status
  is_draft BOOLEAN DEFAULT TRUE,
  submitted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workout_logs_user_date ON public.workout_logs(user_id, logged_at DESC);
CREATE INDEX idx_workout_logs_submitted ON public.workout_logs(user_id, submitted_at DESC) WHERE submitted_at IS NOT NULL;

-- ============================================================
-- SHARING CONNECTIONS (Apple Fitness style)
-- ============================================================
CREATE TYPE sharing_status AS ENUM ('pending', 'accepted', 'rejected');

CREATE TABLE public.sharing_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status sharing_status DEFAULT 'pending',
  is_mutual BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, recipient_id)
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'sharing_request', 'whoop_workout', 'goal_reached'
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, created_at DESC);

-- ============================================================
-- WHOOP WEBHOOK EVENTS (audit log)
-- ============================================================
CREATE TABLE public.whoop_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can view shared profiles"
  ON public.profiles FOR SELECT
  USING (
    id IN (
      SELECT requester_id FROM public.sharing_connections
      WHERE recipient_id = auth.uid() AND status = 'accepted'
      UNION
      SELECT recipient_id FROM public.sharing_connections
      WHERE requester_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Invite Links
ALTER TABLE public.invite_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can create invite links"
  ON public.invite_links FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE POLICY "Admins can view invite links"
  ON public.invite_links FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE POLICY "Anyone can read invite by code"
  ON public.invite_links FOR SELECT
  USING (used_by IS NULL AND expires_at > NOW());

-- Performance Goals
ALTER TABLE public.performance_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own goals"
  ON public.performance_goals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Shared users can view goals"
  ON public.performance_goals FOR SELECT
  USING (
    user_id IN (
      SELECT requester_id FROM public.sharing_connections
      WHERE recipient_id = auth.uid() AND status = 'accepted'
      UNION
      SELECT recipient_id FROM public.sharing_connections
      WHERE requester_id = auth.uid() AND status = 'accepted'
    )
  );

-- Workout Logs
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own logs"
  ON public.workout_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Shared users can view submitted logs"
  ON public.workout_logs FOR SELECT
  USING (
    submitted_at IS NOT NULL AND
    user_id IN (
      SELECT requester_id FROM public.sharing_connections
      WHERE recipient_id = auth.uid() AND status = 'accepted'
      UNION
      SELECT recipient_id FROM public.sharing_connections
      WHERE requester_id = auth.uid() AND status = 'accepted'
    )
  );

-- Sharing Connections
ALTER TABLE public.sharing_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own connections"
  ON public.sharing_connections FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can create sharing requests"
  ON public.sharing_connections FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Recipients can update connection status"
  ON public.sharing_connections FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

CREATE POLICY "Users can delete own connections"
  ON public.sharing_connections FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

-- Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Whoop Events
ALTER TABLE public.whoop_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own whoop events"
  ON public.whoop_events FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('workout-photos', 'workout-photos', true);

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload workout photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'workout-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own workout photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'workout-photos');

-- ============================================================
-- REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.workout_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sharing_connections;

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Get weekly volume for a user
CREATE OR REPLACE FUNCTION public.get_weekly_volume(
  p_user_id UUID,
  p_week_start TIMESTAMPTZ DEFAULT date_trunc('week', NOW())
)
RETURNS TABLE(
  total_pushups BIGINT,
  total_plank_seconds BIGINT,
  total_run_distance NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(pushup_reps), 0)::BIGINT,
    COALESCE(SUM(plank_seconds), 0)::BIGINT,
    COALESCE(SUM(run_distance), 0)::NUMERIC
  FROM public.workout_logs
  WHERE user_id = p_user_id
    AND submitted_at IS NOT NULL
    AND logged_at >= p_week_start
    AND logged_at < p_week_start + INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Leaderboard query
CREATE OR REPLACE FUNCTION public.get_leaderboard(
  p_user_id UUID,
  p_date_from TIMESTAMPTZ,
  p_date_to TIMESTAMPTZ,
  p_metric TEXT DEFAULT 'volume', -- 'volume' or 'peak'
  p_mode TEXT DEFAULT 'raw' -- 'raw' or 'percent'
)
RETURNS TABLE(
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
      (COALESCE(SUM(wl.pushup_reps), 0) + COALESCE(SUM(wl.plank_seconds), 0) + COALESCE(SUM(wl.run_distance), 0) * 100)::NUMERIC AS total_score
    FROM public.workout_logs wl
    JOIN public.profiles p ON p.id = wl.user_id
    WHERE wl.submitted_at IS NOT NULL
      AND wl.logged_at BETWEEN p_date_from AND p_date_to
      AND (
        wl.user_id = p_user_id
        OR wl.user_id IN (
          SELECT requester_id FROM public.sharing_connections
          WHERE recipient_id = p_user_id AND status = 'accepted'
          UNION
          SELECT recipient_id FROM public.sharing_connections
          WHERE requester_id = p_user_id AND status = 'accepted'
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
      (COALESCE(MAX(wl.pushup_reps), 0) + COALESCE(MAX(wl.plank_seconds), 0) + COALESCE(MAX(wl.run_distance), 0) * 100)::NUMERIC AS total_score
    FROM public.workout_logs wl
    JOIN public.profiles p ON p.id = wl.user_id
    WHERE wl.submitted_at IS NOT NULL
      AND wl.logged_at BETWEEN p_date_from AND p_date_to
      AND (
        wl.user_id = p_user_id
        OR wl.user_id IN (
          SELECT requester_id FROM public.sharing_connections
          WHERE recipient_id = p_user_id AND status = 'accepted'
          UNION
          SELECT recipient_id FROM public.sharing_connections
          WHERE requester_id = p_user_id AND status = 'accepted'
        )
      )
    GROUP BY wl.user_id, p.full_name, p.avatar_url
    ORDER BY total_score DESC;
  ELSE
    -- For percentage improvement, compare current period vs previous equal period
    RETURN QUERY
    WITH current_period AS (
      SELECT
        wl.user_id,
        CASE WHEN p_metric = 'volume' THEN COALESCE(SUM(wl.pushup_reps), 0) ELSE COALESCE(MAX(wl.pushup_reps), 0) END AS pushups,
        CASE WHEN p_metric = 'volume' THEN COALESCE(SUM(wl.plank_seconds), 0) ELSE COALESCE(MAX(wl.plank_seconds), 0) END AS planks,
        CASE WHEN p_metric = 'volume' THEN COALESCE(SUM(wl.run_distance), 0)::INTEGER ELSE COALESCE(MAX(wl.run_distance), 0)::INTEGER END AS runs
      FROM public.workout_logs wl
      WHERE wl.submitted_at IS NOT NULL
        AND wl.logged_at BETWEEN p_date_from AND p_date_to
      GROUP BY wl.user_id
    ),
    prev_period AS (
      SELECT
        wl.user_id,
        CASE WHEN p_metric = 'volume' THEN COALESCE(SUM(wl.pushup_reps), 0) ELSE COALESCE(MAX(wl.pushup_reps), 0) END AS pushups,
        CASE WHEN p_metric = 'volume' THEN COALESCE(SUM(wl.plank_seconds), 0) ELSE COALESCE(MAX(wl.plank_seconds), 0) END AS planks,
        CASE WHEN p_metric = 'volume' THEN COALESCE(SUM(wl.run_distance), 0)::INTEGER ELSE COALESCE(MAX(wl.run_distance), 0)::INTEGER END AS runs
      FROM public.workout_logs wl
      WHERE wl.submitted_at IS NOT NULL
        AND wl.logged_at BETWEEN (p_date_from - (p_date_to - p_date_from)) AND p_date_from
      GROUP BY wl.user_id
    )
    SELECT
      c.user_id,
      p.full_name,
      p.avatar_url,
      CASE WHEN COALESCE(pr.pushups, 0) > 0 THEN ((c.pushups - pr.pushups)::NUMERIC / pr.pushups * 100) ELSE 0 END,
      CASE WHEN COALESCE(pr.planks, 0) > 0 THEN ((c.planks - pr.planks)::NUMERIC / pr.planks * 100) ELSE 0 END,
      CASE WHEN COALESCE(pr.runs, 0) > 0 THEN ((c.runs - pr.runs)::NUMERIC / pr.runs * 100) ELSE 0 END,
      CASE WHEN COALESCE(pr.pushups, 0) + COALESCE(pr.planks, 0) + COALESCE(pr.runs, 0) > 0
        THEN (
          (CASE WHEN pr.pushups > 0 THEN (c.pushups - pr.pushups)::NUMERIC / pr.pushups * 100 ELSE 0 END +
           CASE WHEN pr.planks > 0 THEN (c.planks - pr.planks)::NUMERIC / pr.planks * 100 ELSE 0 END +
           CASE WHEN pr.runs > 0 THEN (c.runs - pr.runs)::NUMERIC / pr.runs * 100 ELSE 0 END) / 3
        )
        ELSE 0
      END AS total_score
    FROM current_period c
    JOIN public.profiles p ON p.id = c.user_id
    LEFT JOIN prev_period pr ON pr.user_id = c.user_id
    WHERE c.user_id = p_user_id
      OR c.user_id IN (
        SELECT requester_id FROM public.sharing_connections
        WHERE recipient_id = p_user_id AND status = 'accepted'
        UNION
        SELECT recipient_id FROM public.sharing_connections
        WHERE requester_id = p_user_id AND status = 'accepted'
      )
    ORDER BY total_score DESC;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
