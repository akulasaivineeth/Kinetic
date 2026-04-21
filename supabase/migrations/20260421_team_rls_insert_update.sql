-- Add missing INSERT and UPDATE policies for team tables.
-- SELECT policies already existed; INSERT was missing, which blocked
-- client-side squad joining (useJoinTeam) and caused silent failures.

-- team_members: allow authenticated users to add themselves
DROP POLICY IF EXISTS team_members_insert ON public.team_members;
CREATE POLICY team_members_insert ON public.team_members
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- team_members: allow co-members to update (e.g. role changes by owner)
DROP POLICY IF EXISTS team_members_update ON public.team_members;
CREATE POLICY team_members_update ON public.team_members
  FOR UPDATE
  USING (team_id IN (SELECT tm2.team_id FROM team_members tm2 WHERE tm2.user_id = auth.uid()));

-- teams: allow authenticated users to create teams
DROP POLICY IF EXISTS teams_insert ON public.teams;
CREATE POLICY teams_insert ON public.teams
  FOR INSERT
  WITH CHECK (created_by = auth.uid());
