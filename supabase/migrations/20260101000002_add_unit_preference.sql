-- Add unit_preference column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS unit_preference TEXT NOT NULL DEFAULT 'metric' 
CHECK (unit_preference IN ('metric', 'imperial'));

-- Update existing profiles to default to metric
UPDATE public.profiles SET unit_preference = 'metric' WHERE unit_preference IS NULL;
