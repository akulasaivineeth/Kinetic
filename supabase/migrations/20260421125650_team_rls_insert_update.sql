-- ============================================================
-- FIX: Infinite recursion in team_members RLS policies (42P17)
-- ============================================================
-- The old policies did:
--   team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
-- This subquery triggers SELECT on team_members which triggers the same
-- policy again → infinite recursion loop (PostgreSQL error 42P17).
--
-- Solution: SECURITY DEFINER function bypasses RLS for the inner lookup.
-- ============================================================

-- Step 1: SECURITY DEFINER helper (runs with table-owner privileges, bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_my_team_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT team_id FROM team_members WHERE user_id = auth.uid();
$$;

-- Step 2: Drop ALL old team policies
DROP POLICY IF EXISTS teams_select ON public.teams;
DROP POLICY IF EXISTS teams_insert ON public.teams;
DROP POLICY IF EXISTS team_members_select ON public.team_members;
DROP POLICY IF EXISTS team_members_insert ON public.team_members;
DROP POLICY IF EXISTS team_members_update ON public.team_members;
DROP POLICY IF EXISTS team_activities_select ON public.team_activities;
DROP POLICY IF EXISTS team_messages_select ON public.team_messages;
DROP POLICY IF EXISTS team_messages_insert ON public.team_messages;

-- Step 3: Recreate with SECURITY DEFINER function (no recursion)

CREATE POLICY teams_select ON public.teams
  FOR SELECT USING (id IN (SELECT get_my_team_ids()));

CREATE POLICY teams_insert ON public.teams
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY team_members_select ON public.team_members
  FOR SELECT USING (team_id IN (SELECT get_my_team_ids()));

CREATE POLICY team_members_insert ON public.team_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY team_members_update ON public.team_members
  FOR UPDATE USING (team_id IN (SELECT get_my_team_ids()));

CREATE POLICY team_activities_select ON public.team_activities
  FOR SELECT USING (team_id IN (SELECT get_my_team_ids()));

CREATE POLICY team_messages_select ON public.team_messages
  FOR SELECT USING (team_id IN (SELECT get_my_team_ids()));

CREATE POLICY team_messages_insert ON public.team_messages
  FOR INSERT WITH CHECK (team_id IN (SELECT get_my_team_ids()) AND user_id = auth.uid());
