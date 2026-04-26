-- Real voting system for squad lineup selection

-- Each member's activity vote
CREATE TABLE IF NOT EXISTS public.team_votes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_slugs text[] NOT NULL DEFAULT '{}',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

ALTER TABLE public.team_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_votes_select" ON public.team_votes
  FOR SELECT USING (team_id IN (SELECT public.get_my_team_ids()));

CREATE POLICY "team_votes_insert" ON public.team_votes
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    team_id IN (SELECT public.get_my_team_ids())
  );

CREATE POLICY "team_votes_update" ON public.team_votes
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Each member's approval of the consensus lineup
CREATE TABLE IF NOT EXISTS public.team_lineup_approvals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  approved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

ALTER TABLE public.team_lineup_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approvals_select" ON public.team_lineup_approvals
  FOR SELECT USING (team_id IN (SELECT public.get_my_team_ids()));

CREATE POLICY "approvals_insert" ON public.team_lineup_approvals
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    team_id IN (SELECT public.get_my_team_ids())
  );

-- Lineup lock state on teams
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS lineup_locked boolean NOT NULL DEFAULT false;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS lineup_locked_at timestamptz;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS lineup_activity_slugs text[] DEFAULT '{}';

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_lineup_approvals;
