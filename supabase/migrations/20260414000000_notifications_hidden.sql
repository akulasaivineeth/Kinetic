ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;
