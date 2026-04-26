-- Message reactions for squad chat (iMessage-style emoji reactions)

CREATE TABLE IF NOT EXISTS public.team_message_reactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES public.team_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL CHECK (char_length(emoji) <= 8),
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE public.team_message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "msg_reaction_select" ON public.team_message_reactions
  FOR SELECT USING (
    message_id IN (
      SELECT id FROM public.team_messages
      WHERE team_id IN (SELECT public.get_my_team_ids())
    )
  );

CREATE POLICY "msg_reaction_insert" ON public.team_message_reactions
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    message_id IN (
      SELECT id FROM public.team_messages
      WHERE team_id IN (SELECT public.get_my_team_ids())
    )
  );

CREATE POLICY "msg_reaction_delete" ON public.team_message_reactions
  FOR DELETE USING (user_id = auth.uid());

-- Add/remove a reaction atomically
CREATE OR REPLACE FUNCTION public.toggle_message_reaction(
  p_message_id uuid,
  p_user_id uuid,
  p_emoji text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.team_message_reactions
    WHERE message_id = p_message_id AND user_id = p_user_id AND emoji = p_emoji
  ) THEN
    DELETE FROM public.team_message_reactions
    WHERE message_id = p_message_id AND user_id = p_user_id AND emoji = p_emoji;
  ELSE
    INSERT INTO public.team_message_reactions (message_id, user_id, emoji)
    VALUES (p_message_id, p_user_id, p_emoji);
  END IF;
END;
$$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.team_message_reactions;
