-- Fix sharing: allow notification inserts that RLS previously blocked.
-- 1) Users can create notifications for themselves (e.g. Whoop import).
-- 2) Requesters can insert sharing_request rows for recipients they invited.

CREATE POLICY "Users can insert own notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Requesters can insert sharing request notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (
    type = 'sharing_request'
    AND EXISTS (
      SELECT 1 FROM public.sharing_connections sc
      WHERE sc.requester_id = auth.uid()
        AND sc.recipient_id = user_id
    )
  );

-- Fix sharing: RLS prevents looking up another user's profile by email from the client.
-- SECURITY DEFINER lookup limited to returning id only.
CREATE OR REPLACE FUNCTION public.lookup_profile_id_for_sharing(search_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.profiles
  WHERE lower(trim(email)) = lower(trim(search_email))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_profile_id_for_sharing(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_profile_id_for_sharing(text) TO authenticated;
